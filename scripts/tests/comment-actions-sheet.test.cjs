const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const el=(type,props,...children)=>({type,props:{...props,...(children.length?{children}: {})}});
const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
function component(){
 const exp={};const modules={react:{useRef:v=>({current:v}),useEffect(){},createElement:el},'@expo/vector-icons':{Feather:'Icon'},'react-native':{AccessibilityInfo:{},findNodeHandle(){},Pressable:'Button',ScrollView:'Scroll',Text:'Text',View:'View',StyleSheet:{create:s=>s,absoluteFillObject:{position:'absolute',top:0,left:0,right:0,bottom:0}}},'react-native-reanimated':{__esModule:true,default:{View:'AnimatedView'},SlideInDown:{duration:n=>({slideFromBottom:n})}}};
 const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../../artifacts/mobile/components/CommentActionsPopover.tsx'),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(source,{exports:exp,require:n=>n.includes('jsx-runtime')?{jsx:(t,p)=>el(t,p),jsxs:(t,p)=>el(t,p)}:modules[n],setTimeout,clearTimeout});return exp.default;
}
test('action sheet anchors at the bottom, scrolls, respects safe edges and dismisses only by backdrop',()=>{
 let close=0,copy=0;const Sheet=component();const view=Sheet({actions:[{key:'copy',title:'Copiar',icon:'copy',onPress:()=>copy++}],onClose:()=>close++,safeBottom:34,safeLeft:7,safeRight:8,maxHeight:600});
 const all=nodes(view),panel=all.find(n=>n.type==='AnimatedView'),style=Object.assign({},...panel.props.style);
 assert.equal(style.bottom,0);assert.equal(style.paddingBottom,34);assert.equal(style.paddingLeft,19);assert.equal(style.paddingRight,20);assert.equal(style.maxHeight,600);
 assert.equal(panel.props.entering.slideFromBottom,200);assert.ok(all.some(n=>n.type==='Scroll'));
 const buttons=all.filter(n=>n.type==='Button');assert.equal(buttons.length,2);
 buttons[1].props.onPress();assert.equal(copy,1);assert.equal(close,0);
 buttons[0].props.onPress();assert.equal(close,1);
});
