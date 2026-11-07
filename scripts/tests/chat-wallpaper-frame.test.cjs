const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const strip=require('node:module').stripTypeScriptTypes;
const source=fs.readFileSync(path.resolve(__dirname,'../../artifacts/mobile/lib/features/messages/wallpaperFrame.ts'),'utf8');
const root=path.resolve(__dirname,'../../artifacts/mobile');
const exportsObject={};
if(strip){
 vm.runInNewContext(strip(source).replace('export function','function')+'\nexports.nextWallpaperFrame=nextWallpaperFrame;',{exports:exportsObject});
}else{
 const ts=require('typescript');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exportsObject});
}
const next=exportsObject.nextWallpaperFrame;
test('private-chat canvas stays stable through keyboard opening, resizing and closing',()=>{
 let frame=next({width:0,height:0},{width:360,height:650},true);
 for(const height of [620,500,350,300,400,650]){
  frame=next(frame,{width:360,height},true);
  assert.equal(frame.width,360);assert.equal(frame.height,650);
 }
});
test('rotation resets canvas; returning portrait and growing window are measured again',()=>{
 let frame=next({width:360,height:650},{width:740,height:300},true);
 assert.equal(frame.height,300);
 frame=next(frame,{width:360,height:650},true);
 assert.equal(frame.height,650);
 frame=next(frame,{width:360,height:720},true);
 assert.equal(frame.height,720);
});
test('thumbnail and preview canvases follow their actual size without retaining chat height',()=>{
 const frame=next({width:90,height:160},{width:90,height:62},false);
 assert.equal(frame.height,62);
});
test('invalid or unchanged measurements do not produce zero frames or update loops',()=>{
 const frame={width:360,height:650};
 for(const measured of [{width:0,height:0},{width:NaN,height:20},{width:360,height:-1},{width:360,height:Infinity},frame])assert.equal(next(frame,measured,true),frame);
});
test('chat opts into stable decoration while existing keyboard/list/composer logic is preserved',()=>{
 const source=fs.readFileSync(path.join(root,'app/chat.tsx'),'utf8');
 assert.match(source,/<ChatWallpaper id=\{wallpaper\} stableFrame\/>/);
 assert.match(source,/<KeyboardAvoidingView behavior="padding" enabled=\{focused\}/);
 assert.match(source,/onRefresh=\{pullRefresh\}/);
 assert.match(source,/paddingBottom:keyboard\?6:Math.max\(insets.bottom,10\)/);
});
