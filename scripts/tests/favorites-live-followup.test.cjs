const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'../../artifacts/mobile');
function load(file,modules={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Error,require:name=>{if(name in modules)return modules[name];throw Error(name);}});return exports;}
function runtime() {
  const slots = []; let cursor = 0, dirty = true, effects = [], render, output;
  const same = (a, b) => a && a.length === b.length && b.every((value, i) => Object.is(value, a[i]));
  const hooks = {
    useState(initial) { const i = cursor++; if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, next => { const value = typeof next === 'function' ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; } }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(callback, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { value: callback, deps }; return slots[i].value; },
    useEffect(effect, deps) { const i = cursor++; const previous = slots[i]; if (!same(previous?.deps, deps)) { slots[i] = { deps, cleanup: previous?.cleanup }; effects.push(() => { slots[i].cleanup?.(); slots[i].cleanup = effect(); }); } },
  };
  return { hooks, mount(fn) { render = fn; dirty = true; }, update() { dirty = true; }, get output() { return output; }, async flush() { for (let turn = 0; turn < 20; turn++) { if (dirty) { cursor = 0; dirty = false; effects = []; output = render(); effects.forEach(fn => fn()); } await new Promise(resolve => setImmediate(resolve)); } assert.equal(dirty, false); }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function setup(){
 const bus=load('lib/features/favorites/changes.ts'),saved=new Set(),writes=[],queries=[];
 const server={failed:false,hold:null,exists:true,authCalls:0};
 const supabase={auth:{getUser:async()=>{server.authCalls++;return {data:{user:{id:'me'}},error:null};},onAuthStateChange:()=>({data:{sub:undefined,subscription:{unsubscribe(){}}}})},from(table){
  let operation='read',id=null,payload=null,ids=null;
  const q={select(){return q;},eq(key,value){if(key==='video_id')id=value;return q;},in(key,value){ids=value;return q;},insert(value){operation='insert';payload=value;id=value.video_id;return q;},delete(){operation='delete';return q;},
   async then(resolve,reject){try{queries.push({table,operation,ids});if(operation==='read')return resolve({data:table==='saved_videos'?[...saved].map(video_id=>({video_id})):server.exists?(ids??[]).map(id=>({id})):[],error:null});
    writes.push({table,operation,id});if(server.hold)await server.hold.promise;
    if(server.failed)return resolve({data:null,error:Error('offline')});
    operation==='insert'?saved.add(id):saved.delete(id);return resolve({data:null,error:null});
   }catch(e){return reject(e);}}};return q;
 }};
 const make=()=>{const r=runtime();const mod=load('hooks/useSavedVideos.ts',{
  react:r.hooks,'expo-router':{},'../context/RegistrationContext':{useRegistration:()=>({completed:null})},'../lib/features/auth/services/registrationBridge':{requestRegistration(){}},'../lib/supabase':{supabase},'../lib/features/favorites/changes':bus,
  './useVideoFeed':{BASE_VIDEOS:[],mapRowsToVideoItems:async rows=>rows.map(row=>({id:row.id}))}
 });r.mount(()=>mod.useSavedVideos());return r;};
 return {server,bus,saved,writes,queries,make};
}
test('favorite removal updates all mounted lists immediately and a failed write restores them',async()=>{
 const s=setup();s.saved.add('video');const a=s.make(),b=s.make();await a.flush();await b.flush();
 s.server.hold=defer();s.server.failed=true;
 const pending=a.output.toggleSave('video');await a.flush();await b.flush();
 assert.equal(a.output.savedIds.has('video'),false);assert.equal(a.output.savedVideos.length,0);assert.equal(b.output.savedIds.has('video'),false);assert.equal(b.output.savedVideos.length,0);
 s.server.hold.resolve();await pending;await a.flush();await b.flush();
 assert.equal(a.output.savedIds.has('video'),true);assert.equal(b.output.savedIds.has('video'),true);assert.match(a.output.error,/No se pudo/);
 a.unmount();b.unmount();
});
test('favorite insert reads only the selected item, blocks duplicate taps and reconciles the other screen',async()=>{
 const s=setup(),a=s.make(),b=s.make();await a.flush();await b.flush();const auth=s.server.authCalls;
 s.server.hold=defer();const pending=a.output.toggleSave('video');await a.output.toggleSave('video');await a.flush();await b.flush();
 assert.equal(a.output.savedIds.has('video'),true);assert.equal(b.output.savedIds.has('video'),true);assert.equal(s.writes.length,1);assert.equal(s.server.authCalls,auth);
 assert.deepEqual(s.queries.filter(q=>q.table==='videos').map(q=>Array.from(q.ids)),[['video']]);
 s.server.hold.resolve();await pending;await a.flush();await b.flush();assert.equal(b.output.savedVideos[0].id,'video');a.unmount();b.unmount();
});
test('unavailable content rolls back and never creates a saved relation',async()=>{
 const s=setup(),r=s.make();await r.flush();s.server.exists=false;
 await r.output.toggleSave('gone');await r.flush();assert.equal(s.writes.length,0);assert.equal(r.output.savedIds.has('gone'),false);assert.equal(r.output.error,'Este video ya no está disponible.');r.unmount();
});
test('favorite event channel isolates accounts and releases its lock exactly once',()=>{
 const b=load('lib/features/favorites/changes.ts'),events=[],off=b.subscribeFavoriteChanges(e=>events.push(e));
 const change={userId:'a',videoId:'v',saved:true};assert.equal(b.beginFavoriteChange(change),true);assert.equal(b.beginFavoriteChange(change),false);
 assert.equal(b.beginFavoriteChange({...change,userId:'b'}),true);b.finishFavoriteChange(change,false);b.finishFavoriteChange(change,true);
 assert.deepEqual(events.map(e=>e.phase),['pending','pending','failed']);off();b.finishFavoriteChange({...change,userId:'b'},true);assert.equal(events.length,3);
});
