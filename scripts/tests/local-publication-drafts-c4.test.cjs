const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript"),vm=require("node:vm");
const filename=path.resolve(__dirname,"../../artifacts/mobile/lib/features/publishing/localDrafts.ts");
const code=fs.readFileSync(filename,"utf8");
const compiled=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const alice="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",bob="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const one="cccccccc-cccc-4ccc-8ccc-cccccccccccc",two="dddddddd-dddd-4ddd-8ddd-dddddddddddd";
function context(){
 const metadata=new Map(),files=new Map(),folders=new Set(),logs=[];
 files.set("file:///gallery/video.mp4",120);
 files.set("file:///gallery/photo.jpg",50);
 files.set("file:///gallery/cover.jpg",15);
 let failCopy=false,failIndex=false;
 function newAppInstance(){
  const local={
   documentDirectory:"file:///android/app/documents/",
   getInfoAsync:async uri=>files.has(uri)?{exists:true,isDirectory:false,size:files.get(uri)}:{exists:folders.has(uri),isDirectory:folders.has(uri)},
   makeDirectoryAsync:async uri=>{folders.add(uri);},
   copyAsync:async({from,to})=>{if(failCopy)throw Error("disk full");if(!files.has(from))throw Error("missing file");files.set(to,files.get(from));},
   deleteAsync:async uri=>{for(const f of [...files.keys()])if(f===uri||f.startsWith(uri))files.delete(f);folders.delete(uri)}
  };
  const storage={
   getItem:async key=>metadata.get(key)??null,
   setItem:async(key,value)=>{if(failIndex)throw Error("metadata not committed");metadata.set(key,value)}
  };
  const exported={};
  vm.runInNewContext(compiled,{exports:exported,console:{warn:(...args)=>logs.push(args)},require(name){
   if(name==="@react-native-async-storage/async-storage")return {__esModule:true,default:storage};
   if(name==="expo-file-system/legacy")return local;
   if(name==="react-native")return {Platform:{OS:"android"}};
   throw Error("Unexpected dependency "+name);
  }});
  return exported;
 }
 function draft({id=one,userId=alice,uri="file:///gallery/video.mp4",kind="video",extension="mp4",contentType="video/mp4",thumbnailUri,replyCommentId}={}){
  return {id,userId,uri,kind,extension,contentType,size:uri.endsWith(".jpg")?50:120,...(thumbnailUri?{thumbnailUri}:{}),...(replyCommentId?{replyCommentId}:{})};
 }
 return {newAppInstance,metadata,files,logs,draft,setCopyFail:n=>failCopy=n,setIndexFail:n=>failIndex=n};
}
test("C4: restart of local draft module preserves two projects, private files and owner isolation",async()=>{
 const f=context(),app=f.newAppInstance();
 const a=await app.saveLocalPublicationDraft(f.draft({thumbnailUri:"file:///gallery/cover.jpg"}),"Video sin publicar");
 const b=await app.saveLocalPublicationDraft(f.draft({id:two,uri:"file:///gallery/photo.jpg",kind:"image",extension:"jpg",contentType:"image/jpeg"}),"Fotografía sin publicar");
 const anotherApp=f.newAppInstance();
 assert.deepEqual(Array.from(await anotherApp.listLocalPublicationDrafts(alice),d=>d.id),[b.id,a.id]);
 assert.equal((await anotherApp.openLocalPublicationDraft(alice,a.id)).caption,"Video sin publicar");
 assert.ok(f.files.has(a.uri));assert.ok(f.files.has(a.thumbnailUri));
 assert.equal((await anotherApp.listLocalPublicationDrafts(bob)).length,0);
 await assert.rejects(anotherApp.openLocalPublicationDraft(bob,a.id),/No encontramos/);
});
test("C4: unpublished video reply retains its original comment after app restart, never uploads",async()=>{
 const f=context(),app=f.newAppInstance(),d=f.draft({replyCommentId:"original-comment"});
 await app.saveLocalPublicationDraft(d,"Respuesta pendiente");
 const fresh=f.newAppInstance();
 const resumed=await fresh.openLocalPublicationDraft(alice,one);
 assert.equal(resumed.replyCommentId,"original-comment");
 assert.equal(resumed.caption,"Respuesta pendiente");
 assert.ok(!/supabase|publishDraft|storage\.from|uploadPublicationFile/.test(code));
});
test("C4: missing private video after restart never silently opens or invents content",async()=>{
 const f=context(),app=f.newAppInstance();
 const saved=await app.saveLocalPublicationDraft(f.draft(),"Original");
 f.files.delete(saved.uri);
 const newApp=f.newAppInstance();
 await assert.rejects(newApp.openLocalPublicationDraft(alice,one),/No encontramos el archivo/);
 assert.equal((await newApp.listLocalPublicationDrafts(alice)).length,1);
});
test("C4: insufficient disk space preserves all existing projects and index",async()=>{
 const f=context(),app=f.newAppInstance();
 const stored=await app.saveLocalPublicationDraft(f.draft(),"Antes");
 f.setCopyFail(true);
 await assert.rejects(app.saveLocalPublicationDraft(f.draft(),"Después"),/disk full/);
 f.setCopyFail(false);
 const fresh=f.newAppInstance(),resumed=await fresh.openLocalPublicationDraft(alice,one);
 assert.equal(resumed.caption,"Antes");
 assert.equal(resumed.uri,stored.uri);
 assert.ok(f.files.has(stored.uri));
});
test("C4: metadata failure cannot overwrite saved project or destroy its file",async()=>{
 const f=context(),app=f.newAppInstance();
 const stored=await app.saveLocalPublicationDraft(f.draft(),"Antes");
 f.setIndexFail(true);
 await assert.rejects(app.saveLocalPublicationDraft(f.draft(),"Intento"),/metadata not committed/);
 f.setIndexFail(false);
 const fresh=f.newAppInstance();
 assert.equal((await fresh.openLocalPublicationDraft(alice,one)).caption,"Antes");
 assert.ok(f.files.has(stored.uri));
});
test("C4: deletion persists after restart and cannot affect another account with same project ID",async()=>{
 const f=context(),app=f.newAppInstance();
 const owner=await app.saveLocalPublicationDraft(f.draft(),"Uno");
 const other=await app.saveLocalPublicationDraft(f.draft({userId:bob}),"Dos");
 await app.deleteLocalPublicationDraft(alice,one);
 const fresh=f.newAppInstance();
 assert.equal((await fresh.listLocalPublicationDrafts(alice)).length,0);
 assert.equal((await fresh.openLocalPublicationDraft(bob,one)).caption,"Dos");
 assert.equal(f.files.has(owner.uri),false);
 assert.equal(f.files.has(other.uri),true);
});
test("C4: rejects mismatched media type and maliciously corrupted persisted metadata",async()=>{
 const f=context(),app=f.newAppInstance();
 await assert.rejects(app.saveLocalPublicationDraft(f.draft({kind:"video",contentType:"image/jpeg",extension:"jpg"}),"Error"),/Tipo de archivo/);
 await assert.rejects(app.saveLocalPublicationDraft(f.draft({kind:"image",contentType:"video/mp4",extension:"mp4"}),"Error"),/Tipo de archivo/);
 const saved=await app.saveLocalPublicationDraft(f.draft(),"Correcto");
 const key="@tokvid:local-publication-drafts:v1:"+alice;
 const rows=JSON.parse(f.metadata.get(key));
 rows[0].kind="image";
 f.metadata.set(key,JSON.stringify(rows));
 await assert.rejects(f.newAppInstance().openLocalPublicationDraft(alice,one),/no se ha sobrescrito/);
 assert.ok(f.files.has(saved.uri));
});
