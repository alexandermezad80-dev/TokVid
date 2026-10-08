const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
function load(file, names) {
 const source=fs.readFileSync(path.join(__dirname,'../../artifacts/mobile/lib/features/publishing',file),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,''); const exports={};
 vm.runInNewContext(stripTypeScriptTypes(source,{mode:'transform'})+'\nObject.assign(exports,{'+names.join(',')+'});',{exports,Error,Math,Number}); return exports;
}
const { validateMedia, publishedMediaKind }=load('model.ts',['validateMedia','publishedMediaKind']);
const { publishDraft }=load('service.ts',['publishDraft']);
function fixture() {
 const state={actor:'owner',row:null,inserts:0,uploads:0,failUpload:false,failInsert:false,lostResponse:false,silentInsert:false};
 const client={auth:{getSession:async()=>({data:{session:{user:{id:state.actor}}}})},storage:{from:()=>({getPublicUrl:p=>({data:{publicUrl:'https://storage.test/'+p}})})},from:()=>{
   let inserting=false,payload;const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:state.row}),insert:p=>{inserting=true;payload=p;state.inserts++;return q;},single:async()=>{
    assert.ok(inserting);if(state.failInsert)return{error:new Error('insert failed')};if(state.silentInsert)return{data:null};state.row=payload;return state.lostResponse?{error:new Error('response lost')}:{data:payload};
   }};return q;
 }};
 const draft={id:'post-id',userId:'owner',uri:'file:///video.mp4',kind:'video',contentType:'video/mp4',extension:'mp4',size:5000,thumbnailUri:'file:///cover.jpg'};
 const upload=async(p,u,m,progress)=>{state.uploads++;if(state.failUpload)throw new Error('offline');assert.ok(p.startsWith('owner/post-id'));progress(1);};
 return {state,client,draft,upload};
}
test('video duration, size and real MIME are validated before sending',()=>{
 assert.equal(validateMedia({uri:'file:///asset.MOV',type:'video',duration:180000},100).contentType,'video/quicktime');
 assert.throws(()=>validateMedia({uri:'file:///asset.mp4',type:'video',duration:180001},100),/3 minutos/);
 assert.throws(()=>validateMedia({uri:'file:///asset.mp4',type:'video'},251*1024*1024),/250 MB/);
 assert.throws(()=>validateMedia({uri:'file:///asset.jpg',type:'image'},11*1024*1024),/10 MB/);
 assert.throws(()=>validateMedia({uri:'file:///asset.gif',type:'image',mimeType:'image/gif'},100),/JPG/);
 assert.throws(()=>validateMedia({uri:'file:///asset.mp4',type:'video'},0),/leer/);
});
test('old videos stay videos and photo publications are recognized',()=>{
 assert.equal(publishedMediaKind({video_url:'https://storage.test/movie.mp4'}),'video');
 assert.equal(publishedMediaKind({media_type:'image',video_url:'https://storage.test/no-extension'}),'image');
 assert.equal(publishedMediaKind({video_url:'https://storage.test/photo.jpg?token=a'}),'image');
});
test('publishing confirms ownership, media and cover before succeeding',async()=>{
 const f=fixture(),progress=[];const id=await publishDraft(f.client,f.draft,'  #tokvid  ',f.upload,v=>progress.push(v));
 assert.equal(id,f.draft.id);assert.equal(f.state.row.media_type,'video');assert.equal(f.state.row.caption,'#tokvid');assert.match(f.state.row.thumbnail_url,/-cover.jpg$/);assert.equal(f.state.uploads,2);assert.equal(progress.at(-1),1);
});
test('a photo uses the uploaded photo as its thumbnail',async()=>{
 const f=fixture();Object.assign(f.draft,{kind:'image',extension:'jpg',contentType:'image/jpeg'});await publishDraft(f.client,f.draft,'',f.upload,()=>{});
 assert.equal(f.state.uploads,1);assert.equal(f.state.row.thumbnail_url,f.state.row.video_url);assert.equal(f.state.row.media_type,'image');
});
test('upload failure never inserts a visible post; the retained draft can retry',async()=>{
 const f=fixture();f.state.failUpload=true;await assert.rejects(publishDraft(f.client,f.draft,'text',f.upload,()=>{}),/offline/);assert.equal(f.state.inserts,0);assert.equal(f.draft.uri,'file:///video.mp4');
 f.state.failUpload=false;await publishDraft(f.client,f.draft,'text',f.upload,()=>{});assert.equal(f.state.inserts,1);
});
test('failed insert retry reuses uploads and a lost insert response cannot duplicate the post',async()=>{
 const f=fixture();f.state.failInsert=true;await assert.rejects(publishDraft(f.client,f.draft,'text',f.upload,()=>{}),/insert failed/);assert.equal(f.state.uploads,2);
 f.state.failInsert=false;f.state.lostResponse=true;await publishDraft(f.client,f.draft,'text',f.upload,()=>{});assert.equal(f.state.uploads,2);assert.equal(f.state.inserts,2);
 await publishDraft(f.client,f.draft,'text',f.upload,()=>{});assert.equal(f.state.inserts,2);
});
test('account switching blocks both uploads and publication under the old account',async()=>{
 const f=fixture();f.state.actor='someone-else';await assert.rejects(publishDraft(f.client,f.draft,'text',f.upload,()=>{}),/sesión cambió/);assert.equal(f.state.uploads,0);assert.equal(f.state.inserts,0);
 f.state.actor='owner';const upload=async(...args)=>{await f.upload(...args);f.state.actor='someone-else';};await assert.rejects(publishDraft(f.client,f.draft,'text',upload,()=>{}),/sesión cambió/);assert.equal(f.state.inserts,0);
});
test('missing confirmation is an error, never a successful publication',async()=>{
 const f=fixture();f.state.silentInsert=true;await assert.rejects(publishDraft(f.client,f.draft,'text',f.upload,()=>{}),/confirmar/);
});
