const test=require("node:test"),assert=require("node:assert/strict"),ts=require("typescript");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.resolve(__dirname,"../../artifacts/mobile/lib/features/publishing/localDrafts.ts"),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const alice="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",bob="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const id="cccccccc-cccc-4ccc-8ccc-cccccccccccc",another="dddddddd-dddd-4ddd-8ddd-dddddddddddd";
function fixture(){
 const stored=new Map(), files=new Map(),warns=[];
 const root="file:///app/documents/";
 files.set("file:///picked/video.mp4",{size:100});
 files.set("file:///picked/photo.jpg",{size:50});
 files.set("file:///picked/cover.jpg",{size:20});
 let failIndex=false;
 const storage={
   getItem:async k=>stored.get(k)??null,
   setItem:async(k,v)=>{if(failIndex)throw Error("storage error");stored.set(k,v)},
 };
 const native={
   documentDirectory:root,
   getInfoAsync:async uri=>files.has(uri)?{exists:true,isDirectory:false,size:files.get(uri).size}:{exists:false,isDirectory:false},
   makeDirectoryAsync:async()=>{},
   copyAsync:async({from,to})=>{if(!files.has(from))throw Error("missing source");files.set(to,{...files.get(from)})},
   deleteAsync:async uri=>{for(const k of [...files.keys()])if(k===uri||k.startsWith(uri))files.delete(k);},
 };
 const exp={};
 vm.runInNewContext(compiled,{
   exports:exp,console:{warn:(...v)=>warns.push(v)},
   require(name){
    if(name==="@react-native-async-storage/async-storage")return {__esModule:true,default:storage};
    if(name==="expo-file-system/legacy")return native;
    if(name==="react-native")return {Platform:{OS:"android"}};
    throw Error("Unexpected module "+name);
   }
 });
 const draft=(userId=alice,draftId=id,uri="file:///picked/video.mp4")=>({
  id:draftId,userId,uri,kind:"video",extension:"mp4",contentType:"video/mp4",size:100
 });
 return {exp,files,stored,warns,draft,failIndex:()=>failIndex=true,root};
}
test("C1 saves an independent private copy, retains description and survives a new list/read",async()=>{
 const f=fixture();
 const saved=await f.exp.saveLocalPublicationDraft({...f.draft(),thumbnailUri:"file:///picked/cover.jpg"},"Primera toma");
 assert.ok(saved.uri.startsWith(f.root+"tokvid-drafts/v1/"+alice+"/"+id+"/"));
 assert.ok(saved.thumbnailUri.startsWith(f.root+"tokvid-drafts/v1/"+alice+"/"+id+"/"));
 assert.equal(saved.caption,"Primera toma");
 assert.ok(f.files.has(saved.uri));assert.ok(f.files.has(saved.thumbnailUri));
 assert.deepEqual(Array.from(await f.exp.listLocalPublicationDrafts(alice),x=>x.id),[id]);
 assert.equal((await f.exp.openLocalPublicationDraft(alice,id)).uri,saved.uri);
 assert.equal(f.stored.size,1);
});
test("C1 handles multiple projects and keeps different accounts isolated",async()=>{
 const f=fixture();
 await f.exp.saveLocalPublicationDraft(f.draft(alice,id),"A");
 await f.exp.saveLocalPublicationDraft(f.draft(alice,another),"B");
 await f.exp.saveLocalPublicationDraft(f.draft(bob,id),"C");
 assert.equal((await f.exp.listLocalPublicationDrafts(alice)).length,2);
 assert.deepEqual(Array.from(await f.exp.listLocalPublicationDrafts(bob),x=>x.caption),["C"]);
 await assert.rejects(f.exp.openLocalPublicationDraft(bob,another),/No encontramos/);
});
test("C1 lets existing projects update without deleting the previous version before saving",async()=>{
 const f=fixture(),first=await f.exp.saveLocalPublicationDraft(f.draft(),"old");
 const revised=await f.exp.saveLocalPublicationDraft(f.draft(),"new");
 assert.equal(revised.id,first.id);assert.equal(revised.createdAt,first.createdAt);
 assert.equal((await f.exp.listLocalPublicationDrafts(alice)).length,1);
 assert.equal((await f.exp.openLocalPublicationDraft(alice,id)).caption,"new");
 assert.ok(f.files.has(revised.uri));assert.ok(!f.files.has(first.uri));
});
test("C1 rejects missing files, wrong owner, path traversal and impossible media",async()=>{
 const f=fixture();
 await assert.rejects(f.exp.saveLocalPublicationDraft(f.draft(alice,"../other"),""),/inválido/);
 await assert.rejects(f.exp.saveLocalPublicationDraft(f.draft(alice,id,"https://remote/video.mp4"),""),/archivo local/);
 await assert.rejects(f.exp.saveLocalPublicationDraft(f.draft(alice,id,"file:///missing.mp4"),""),/No encontramos/);
 const v={...f.draft(),contentType:"image/jpeg"};
 await assert.rejects(f.exp.saveLocalPublicationDraft(v,""),/Tipo de archivo inválido/);
 await assert.rejects(f.exp.listLocalPublicationDrafts("../bob"),/inválido/);
});
test("C1 does not overwrite saved drafts when metadata persistence fails",async()=>{
 const f=fixture(),previous=await f.exp.saveLocalPublicationDraft(f.draft(),"safe");
 f.failIndex();
 await assert.rejects(f.exp.saveLocalPublicationDraft(f.draft(),"failed"),/storage error/);
 assert.equal((await f.exp.openLocalPublicationDraft(alice,id)).caption,"safe");
 assert.ok(f.files.has(previous.uri));
 assert.equal(f.files.size,4); // original video/photo/cover + retained saved version
});
test("C1 deletes only its owner's project, not another account's same draft id",async()=>{
 const f=fixture();
 const a=await f.exp.saveLocalPublicationDraft(f.draft(alice,id),"A");
 const b=await f.exp.saveLocalPublicationDraft(f.draft(bob,id),"B");
 await f.exp.deleteLocalPublicationDraft(alice,id);
 assert.equal((await f.exp.listLocalPublicationDrafts(alice)).length,0);
 assert.ok(!f.files.has(a.uri));assert.ok(f.files.has(b.uri));
 assert.equal((await f.exp.openLocalPublicationDraft(bob,id)).caption,"B");
 await assert.rejects(f.exp.deleteLocalPublicationDraft(alice,id),/No encontramos/);
});
test("C1 refuses corrupted records and never runs public publishing or remote uploads",async()=>{
 const f=fixture();
 const key="@tokvid:local-publication-drafts:v1:"+alice;
 f.stored.set(key,JSON.stringify([{id,userId:bob,uri:"file:///someoneelse",kind:"video"}]));
 await assert.rejects(f.exp.listLocalPublicationDrafts(alice),/no se ha sobrescrito/);
 await assert.rejects(f.exp.saveLocalPublicationDraft(f.draft(),"safe"),/no se ha sobrescrito/);
 assert.ok(!/supabase|publishDraft|storage\.from|uploadPublicationFile/.test(source));
});
