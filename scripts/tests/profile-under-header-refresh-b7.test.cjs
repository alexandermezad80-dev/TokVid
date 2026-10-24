const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile"),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const profile=read("app/(tabs)/profile.tsx"),shared=read("components/PullRefreshUnderHeader.tsx");
test("B7: the own profile routes refresh through the shared under-header responder, without changing protected geometry or callbacks",()=>{
 assert.match(profile,/import ProfilePullRefresh from "\.\.\/\.\.\/components\/PullRefreshUnderHeader"/);
 assert.match(profile,/<ReferenceHeader variant="profile">/);
 assert.match(profile,/<ProfilePullRefresh scrollOffsetRef=\{scrollOffsetRef\} refreshing=\{refreshing\} onRefresh=\{onRefresh\} holdWhileRefreshing maxPull=\{156\} holdDistance=\{72\} nativeRefreshFallback=\{Platform\.OS==="android"\}>/);
 assert.match(profile,/stickyHeaderIndices=\{\[1\]\}/);
 assert.match(profile,/scrollOffsetRef\.current=Math\.max\(0,event\.nativeEvent\.contentOffset\.y\)/);
 for(const k of ["width:width/6,flex:0","stickySlot:{width:\"100%\",height:39","onPress={()=>setTab(item.key)}","onMoveShouldSetPanResponderCapture:(_event,g)=>isOwnProfileHorizontalMove(g.dx,g.dy)","styles.grid","<BrandAvatar","<TokvidProfileIcon","<ReferenceHeader"])assert.ok(profile.includes(k),k);
 assert.ok(profile.includes('colors={["transparent"]} progressBackgroundColor="transparent"'),"Android native trigger must not paint over the avatar");
 assert.ok(profile.includes('refreshControl={Platform.OS==="android"?<RefreshControl'),"Android native gesture fallback");
});
function makeGesture(offset=0){
 let handler,updateCount=0;
 const animated={value:0,stopAnimation(){},setValue(v){this.value=v;},interpolate(){return "opacity";}};
 const hooks={useRef:v=>({current:v}),useEffect:()=>{},default:null};hooks.default=hooks;
 const lib={
  ActivityIndicator:"Spinner",View:"View",
  Animated:{View:"AnimatedView",Value:class{constructor(){return animated}},timing:(v,opts)=>({start(){v.value=opts.toValue;}})},
  PanResponder:{create:pan=>{handler=pan;return{panHandlers:{gestureResponder:true}}}},
  StyleSheet:{create:x=>x}
 };
 const runtime={exports:{}};
 const compiled=ts.transpileModule(shared,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const jsx=(type,props)=>({type,props});
 vm.runInNewContext(compiled,{exports:runtime.exports,require:id=>id==="react"?hooks:id==="react-native"?lib:id.includes("jsx-runtime")?{jsx,jsxs:jsx}:null});
 const scroll={current:offset};
 const tree=runtime.exports.default({children:"approved-own-profile-scroll",scrollOffsetRef:scroll,onRefresh:()=>{updateCount++;},refreshing:false,color:"#4B7194"});
 return {handler,animated,tree,scroll,get updates(){return updateCount}};
}
test("B7: only deliberate one-finger downward motion at scroll top captures the profile pull",()=>{
 const r=makeGesture();
 assert.equal(r.handler.onMoveShouldSetPanResponderCapture(null,{dx:2,dy:65,numberActiveTouches:1}),true);
 assert.equal(r.handler.onMoveShouldSetPanResponderCapture(null,{dx:80,dy:60,numberActiveTouches:1}),false);
 assert.equal(r.handler.onMoveShouldSetPanResponderCapture(null,{dx:0,dy:-70,numberActiveTouches:1}),false);
 assert.equal(r.handler.onMoveShouldSetPanResponderCapture(null,{dx:0,dy:65,numberActiveTouches:2}),false);
 r.scroll.current=34;assert.equal(r.handler.onMoveShouldSetPanResponderCapture(null,{dx:1,dy:70,numberActiveTouches:1}),false);
});
test("B7: animated content reveals blue spinner under the fixed profile header and retracts on release",()=>{
 const r=makeGesture();
 assert.equal(r.tree.props.gestureResponder,true);
 assert.equal(r.tree.props.children[0].props.children.props.color,"#4B7194");
 assert.equal(r.tree.props.children[1].props.children,"approved-own-profile-scroll");
 r.handler.onPanResponderGrant();
 r.handler.onPanResponderMove(null,{dx:0,dy:110});
 assert.ok(r.animated.value>0&&r.animated.value<=104);
 r.handler.onPanResponderRelease(null,{dy:110});
 assert.equal(r.updates,1);
 assert.equal(r.animated.value,0);
});
test("B7: no refresh on insufficient pull; the wrapper and own profile TSX transpile",()=>{
 const r=makeGesture();
 r.handler.onPanResponderRelease(null,{dy:50});
 assert.equal(r.updates,0);
 for(const s of [shared,profile]){const o=ts.transpileModule(s,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});assert.deepEqual(o.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).map(x=>String(x.messageText)),[]);}
});
