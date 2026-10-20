const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
test('comments temporarily own the Android strip and closing restores the current screen',()=>{
 const calls=[],cleanups=[];
 const source=fs.readFileSync(path.resolve(__dirname,'../../artifacts/mobile/hooks/useSystemNavigation.ts'),'utf8')
  .replace(/^import .*;\n/gm,'').replace(/export function/g,'function');
 const api={};
 vm.runInNewContext(stripTypeScriptTypes(source,{mode:'transform'})+'\nObject.assign(api,{useSystemNavigation,refreshSystemNavigation});',{
  api,Platform:{OS:'android'},NativeModules:{TokVidChatTools:{setNavigationAppearance:(...args)=>calls.push(args)}},
  useEffect:fn=>cleanups.push(fn()),
 });
 api.useSystemNavigation('#000000',false);
 assert.deepEqual(calls.at(-1),['#000000',false]);
 api.useSystemNavigation('#FFFFFF',true,true);
 api.refreshSystemNavigation(); // RN modal onShow must also synchronize its own window.
 assert.deepEqual(calls.at(-1),['#FFFFFF',true]);
 cleanups.pop()();assert.deepEqual(calls.at(-1),['#000000',false]);
 const previous=calls.length;api.useSystemNavigation('#FFFFFF',true,false);assert.equal(calls.length,previous);
 cleanups.pop();cleanups.pop()();
 api.useSystemNavigation('#FFFFFF',true);assert.deepEqual(calls.at(-1),['#FFFFFF',true]);
 cleanups.pop()();
});
