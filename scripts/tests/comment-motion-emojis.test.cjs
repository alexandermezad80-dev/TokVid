const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const root=path.resolve(__dirname,'../../artifacts/mobile');
function load(file,names,globals={}) {
  const source=fs.readFileSync(path.join(root,file),'utf8').replace(/^import .*;\n/gm,'').replace(/export (?=(?:async )?function |const )/g,'');
  const exports={}; vm.runInNewContext(stripTypeScriptTypes(source,{mode:'transform'})+`\nObject.assign(exports,{${names.join(',')}});`,{exports,...globals}); return exports;
}
const emoji=load('lib/commentRecentEmojis.ts',['DEFAULT_COMMENT_EMOJIS','normalizeCommentEmojis','rememberCommentEmojis','insertedCommentEmojis']);
const motion=load('lib/commentSheetMotion.ts',['commentSheetMotion']).commentSheetMotion;
test('every animation frame follows IME without changing sheet origin or leaving a bottom gap',()=>{
  for(const scale of [1,720/1.75/360]) for(const viewportTop of [0,24]) for(const ime of [250,330.5,400]) for(let step=0;step<=20;step++) {
    const progress=step/20, keyboardHeight=ime*progress;
    const a=motion({sheetTop:325-viewportTop,closedBottom:760-viewportTop,screenHeight:802,viewportTop,keyboardHeight,progress,scale});
    const expected=Math.min(760-viewportTop,802-viewportTop-keyboardHeight);
    assert.ok(Math.abs(325-viewportTop+a.composerTop+a.composerHeight-expected)<.00001);
    assert.ok(a.bodyHeight>=0&&a.composerHeight>=0); assert.equal(a.bottom,expected);
  }
});
test('reference endpoints keep header56, composer62.5/117.5 and aligned tools without dead space',()=>{
 const args={sheetTop:298,closedBottom:802,screenHeight:802,viewportTop:0};
 const closed=motion({...args,keyboardHeight:0,progress:0}),open=motion({...args,keyboardHeight:330.5,progress:1});
 assert.equal(closed.composerHeight,62.5); assert.equal(closed.composerTop+298,739.5);
 assert.equal(open.composerHeight,117.5); assert.equal(open.composerTop,56); assert.equal(open.bodyHeight,0);
 assert.equal(298+open.composerTop+6+18+10+36+14+24+9.5,471.5);
});
test('emoji detection retains ZWJ, tone, flag, keycap sequences and detects middle insertions',()=>{
 for(const value of ['👩🏽‍💻','👨‍👩‍👧‍👦','🇸🇻','1️⃣','❤️','👍🏽']) {
   assert.deepEqual(Array.from(emoji.insertedCommentEmojis('Antes después','Antes '+value+'después')),[value]);
 }
 assert.deepEqual(Array.from(emoji.insertedCommentEmojis('👍','👍🏽')),['👍🏽']);
 assert.deepEqual(Array.from(emoji.insertedCommentEmojis('👩','👩‍💻')),['👩‍💻']);
 assert.deepEqual(Array.from(emoji.insertedCommentEmojis('Hola 😂','Hola ')),[]);
 assert.deepEqual(Array.from(emoji.insertedCommentEmojis('Hola 😂','Hola 😂')),[]);
});
test('MRU retains up to twenty unique complete emojis and tolerates damaged stored preferences',()=>{
 let recent=emoji.normalizeCommentEmojis(['text',null,{},'💙','❤️','❤','😍😍']);
 assert.equal(recent.length,8); assert.equal(recent[0],'💙'); assert.equal(recent.filter(x=>x.replace(/\uFE0F/g,'')==='❤').length,1);
 recent=emoji.rememberCommentEmojis(recent,['👩🏽‍💻','🔥','🔥']);
 assert.equal(recent.length,9); assert.equal(recent[0],'🔥'); assert.equal(recent[1],'👩🏽‍💻');
 assert.deepEqual(Array.from(emoji.normalizeCommentEmojis('broken')),Array.from(emoji.DEFAULT_COMMENT_EMOJIS));
});
function runtime() {
 const slots=[]; let cursor=0,dirty=true,effects=[],render,output;
 const same=(a,b)=>a&&a.length===b.length&&b.every((x,i)=>Object.is(x,a[i]));
 const hooks={
  useState(initial){const i=cursor++; slots[i]??={value:initial}; return [slots[i].value,next=>{slots[i].value=typeof next==='function'?next(slots[i].value):next;dirty=true;}];},
  useRef(value){return slots[cursor++]??={current:value};},
  useEffect(fn,deps){const i=cursor++,prev=slots[i];if(!same(prev?.deps,deps)){slots[i]={deps,cleanup:prev?.cleanup};effects.push(()=>{slots[i].cleanup?.();slots[i].cleanup=fn();});}}
 };
 return {hooks,get output(){return output;},mount(fn){render=fn;dirty=true;},update(){dirty=true;},async flush(){for(let t=0;t<12;t++){if(dirty){cursor=0;dirty=false;effects=[];output=render();effects.forEach(fn=>fn());}await new Promise(r=>setImmediate(r));}assert.equal(dirty,false);},unmount(){slots.forEach(s=>s?.cleanup?.());}};
}
test('recent emoji hydration preserves taps made while loading and isolates accounts',async()=>{
 const rt=runtime(); let account='a',resolveA; const writes=[];
 const storage={getItem:key=>key.endsWith(':a')?new Promise(r=>resolveA=r):Promise.resolve('["🦋"]'),setItem:async(k,v)=>writes.push([k,JSON.parse(v)])};
 const hook=load('hooks/useRecentCommentEmojis.ts',['useRecentCommentEmojis'],{...rt.hooks,...emoji,AsyncStorage:storage}).useRecentCommentEmojis;
 rt.mount(()=>hook(account)); await rt.flush(); rt.output.remember(['💙']); await rt.flush(); resolveA('["🌻"]'); await rt.flush();
 assert.deepEqual(Array.from(rt.output.recent).slice(0,2),['💙','🌻']); assert.equal(writes.at(-1)[0],'tokvid:comment-emojis:v1:a');
 account='b';rt.update();await rt.flush(); assert.equal(rt.output.recent[0],'🦋'); rt.output.remember(['🐈']);await rt.flush();
 assert.equal(writes.at(-1)[0],'tokvid:comment-emojis:v1:b'); assert.equal(writes.at(-1)[1][0],'🐈');rt.unmount();
});
test('late account hydration and failing local storage cannot replace current reactions',async()=>{
 const rt=runtime();let account='old',resolveOld;
 const storage={getItem:k=>k.endsWith(':old')?new Promise(r=>resolveOld=r):Promise.reject(Error('unavailable')),setItem:async()=>{throw Error('disk');}};
 const hook=load('hooks/useRecentCommentEmojis.ts',['useRecentCommentEmojis'],{...rt.hooks,...emoji,AsyncStorage:storage}).useRecentCommentEmojis;
 rt.mount(()=>hook(account));await rt.flush();account='new';rt.update();await rt.flush(); rt.output.remember(['💙']);await rt.flush();
 resolveOld('["🐻"]');await rt.flush();assert.equal(rt.output.recent[0],'💙');rt.unmount();
});
