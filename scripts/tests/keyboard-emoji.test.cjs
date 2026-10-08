const assert=require('node:assert/strict');const {test}=require('node:test');const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');const {stripTypeScriptTypes}=require('node:module');
const root=path.join(__dirname,'../../artifacts/mobile');
function load(file,names,globals={}) {const exports={};const source=fs.readFileSync(path.join(root,file),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');vm.runInNewContext(stripTypeScriptTypes(source,{mode:'transform'})+'\nObject.assign(exports,{'+names.join(',')+'});',{exports,...globals});return exports;}
const {keyboardSheetGeometry}=load('lib/keyboardSheetGeometry.ts',['keyboardSheetGeometry']);
test('emoji height changes keep the composer above IME without hiding and reopening the keyboard',()=>{
 let slots=[],cursor=0,effects=[],handlers,visible=true;const nativeListeners={};
 const hooks={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useRef(initial){return slots[cursor++]??={current:initial};},useCallback(fn){return fn;},useEffect(fn){effects.push(fn);}};
 const {useKeyboardSheetViewport}=load('hooks/useKeyboardSheetViewport.ts',['useKeyboardSheetViewport'],{...hooks,keyboardSheetGeometry,Dimensions:{get:()=>({height:800})},Platform:{OS:'android'},useWindowDimensions:()=>({height:800}),useSafeAreaInsets:()=>({top:24,bottom:24}),Keyboard:{metrics:()=>({screenY:460}),isVisible:()=>true,addListener:(key,fn)=>{nativeListeners[key]=fn;return{remove(){}};}},useGenericKeyboardHandler:fn=>{handlers=fn;},runOnJS:fn=>fn});
 const render=()=>{cursor=0;effects=[];return useKeyboardSheetViewport(visible);};
 let state=render();effects.forEach(fn=>fn());state=render();assert.equal(state.availableHeight,460);
 handlers.onMove({height:500});state=render();assert.equal(state.availableHeight,300);assert.equal(state.keyboardVisible,true);assert.equal(state.keyboardInset,500);
 handlers.onEnd({height:340});state=render();assert.equal(state.availableHeight,460);
 handlers.onEnd({height:0});state=render();assert.equal(state.keyboardVisible,false);assert.equal(state.availableHeight,800);
 visible=false;render();handlers.onMove({height:500});state=render();assert.equal(state.keyboardVisible,false);
});
