const test=require("node:test"), assert=require("node:assert/strict");
const fs=require("node:fs"), path=require("node:path"), vm=require("node:vm"), ts=require("typescript");
const file=path.join(__dirname,"../../artifacts/mobile/components/ProfilePullRefresh.tsx");
const source=ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const elem=(type,props)=>({type,props});
function renderWithGesture(){
  let pan;
  const transitions=[];
  const animated={value:0,stopAnimation(){},setValue(v){this.value=v;},interpolate(){return "opacity";}};
  const React={useRef:value=>({current:value})};
  const lib={
    ActivityIndicator:"Spinner",View:"View",
    Animated:{View:"AnimatedView",Value:class{constructor(){return animated}},
      timing:(val,opts)=>({start(){transitions.push(opts);val.value=opts.toValue;}})},
    PanResponder:{create:function(handlers){pan=handlers;return{panHandlers:{gestureResponder:true}}}},
    StyleSheet:{create:v=>v},
  };
  const module={exports:{}};
  vm.runInNewContext(source,{exports:module.exports,require(name){
    if(name==="react")return{...React,default:React};
    if(name==="react-native")return lib;
    if(name.includes("jsx-runtime"))return{jsx:elem,jsxs:elem};
    throw Error("Unhandled "+name);
  }});
  const offset={current:0};let updates=0;
  const output=module.exports.default({children:"profile-scroll",scrollOffsetRef:offset,refreshing:false,onRefresh:()=>updates++});
  return{output,get pan(){return pan},offset,animated,transitions,get updates(){return updates}};
}
test("pull only captures a downward motion at the top of a profile",()=>{
  const r=renderWithGesture();
  assert.equal(r.output.type,"View");
  assert.equal(r.output.props.gestureResponder,true);
  assert.equal(r.pan.onMoveShouldSetPanResponderCapture(null,{dy:50,dx:3}),true);
  assert.equal(r.pan.onMoveShouldSetPanResponderCapture(null,{dy:50,dx:60}),false);
  assert.equal(r.pan.onMoveShouldSetPanResponderCapture(null,{dy:-50,dx:1}),false);
  r.offset.current=22;
  assert.equal(r.pan.onMoveShouldSetPanResponderCapture(null,{dy:50,dx:1}),false);
});
test("the whole scroll moves, indicator appears, release retracts beneath header",()=>{
  const r=renderWithGesture();
  assert.equal(r.output.props.children[1].props.children,"profile-scroll");
  assert.equal(r.output.props.children[0].props.children.type,"Spinner");
  r.pan.onPanResponderGrant();
  r.pan.onPanResponderMove(null,{dy:110});
  assert.ok(r.animated.value>0);
  r.pan.onPanResponderRelease(null,{dy:110});
  assert.equal(r.updates,1);
  assert.equal(r.animated.value,0);
  assert.ok(r.transitions.some(x=>x.useNativeDriver===true&&x.toValue===0));
});
test("a short pull never triggers data refresh",()=>{
  const r=renderWithGesture();
  r.pan.onPanResponderRelease(null,{dy:60});
  assert.equal(r.updates,0);
});
