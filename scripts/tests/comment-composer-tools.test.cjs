const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {stripTypeScriptTypes}=require('node:module');
const file=path.join(__dirname,'../../artifacts/mobile/lib/commentComposerText.ts');
const source=stripTypeScriptTypes(fs.readFileSync(file,'utf8'),{mode:'transform'}).replace(/export /g,'');
const out={};vm.runInNewContext(source+';Object.assign(out,{insertCommentText,activeCommentMention})',{out});
test('cursor insertion replaces only selected text and respects the Unicode limit',()=>{
 const r=out.insertCommentText('Hola mundo','@solange ',{start:5,end:10});assert.equal(r.text,'Hola @solange ');assert.equal(r.cursor,14);
 assert.equal(out.insertCommentText('😀'.repeat(300),'💙',{start:600,end:600}),null);
 const replacement=out.insertCommentText('😀'.repeat(300),'💙',{start:0,end:2});assert.equal(Array.from(replacement.text).length,300);assert.equal(replacement.cursor,2);
});
test('mentions activate only at a word boundary, with Unicode usernames and current cursor',()=>{
 assert.equal(out.activeCommentMention('correo@ejemplo.com',18),null);
 const mention=out.activeCommentMention('Hola @Marían_Ram después',16);assert.equal(mention.query,'Marían_Ram');assert.equal(mention.start,5);assert.equal(mention.end,16);
 assert.equal(out.activeCommentMention('Hola @Marían_Ram ',17),null);
});
