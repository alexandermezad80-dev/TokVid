const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'../../artifacts/mobile');
function load(file,mocks={}) {
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText,
 {exports,require:n=>{if(n.endsWith('/jsx-runtime'))return mocks['react/jsx-runtime'];if(n in mocks)return mocks[n];if(n.startsWith('.'))return load(path.join(path.dirname(file),n)+(n.endsWith('.ts')?'':'.ts'),mocks);throw Error(n);}});return exports;
}
const data=load('lib/commentEmojiCatalog.ts').COMMENT_EMOJI_CATALOG,order=load('lib/commentEmojiOrder.ts'),recent=load('lib/commentRecentEmojis.ts');
test('complete Unicode16 catalog has unique RGI entries and MRU is deduplicated ahead of CLDR order',()=>{
 assert.equal(data.length,3781);assert.equal(new Set(data).size,3781);
 const rows=order.commentEmojiOrder(['💙','👩🏽‍💻']);assert.deepEqual(Array.from(rows).slice(0,2),['💙','👩🏽‍💻']);
 assert.equal(rows.length,3781);assert.equal(rows.filter(x=>x==='💙').length,1);
 for(const emoji of data)assert.equal(recent.normalizeCommentEmojis([emoji])[0],emoji,'Complete sequence: '+emoji);
 const mru=recent.rememberCommentEmojis([],data.slice(0,25));assert.equal(mru.length,20);assert.equal(mru[0],data[24]);assert.equal(mru.at(-1),data[5]);
});
test('seven glyphs occupy x44..344 and the last page snaps without a partial leading glyph',()=>{
 for(const scale of [1,8/7,1.5]){
 const g=order.commentEmojiStripGeometry(scale,3781);
 assert.ok(Math.abs(6*g.pitch+g.glyph-g.width)<.00001);
 assert.ok(Math.abs((g.length-g.width)/g.pitch-(3781-7))<.00001);
 }
});
function harness(){
 const slots=[];let cursor=0,effects=[],dirty=false,output,props={recent:recent.DEFAULT_COMMENT_EMOJIS,scale:1,disabled:false,onSelect:e=>selected.push(e)};const selected=[];
 const same=(a,b)=>a&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
 const hooks={useState:v=>{const i=cursor++;slots[i]??={value:v};return[slots[i].value,n=>{if(slots[i].value!==n){slots[i].value=n;dirty=true;}}];},useRef:v=>slots[cursor++]??={current:v},useMemo:(fn,deps)=>{const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={value:fn(),deps};return slots[i].value;},useEffect:(fn,deps)=>{const i=cursor++;if(!same(slots[i]?.deps,deps)){slots[i]={deps};effects.push(fn);}}};
 const el=(type,props)=>({type,props});const mocks={react:{...hooks,default:{createElement:el}},'react/jsx-runtime':{jsx:el,jsxs:el},'react-native':{Pressable:'Pressable',Text:'Text'},'react-native-reanimated':{__esModule:true,default:{FlatList:'AnimatedFlatList',View:'AnimatedView'},FadeIn:{duration:()=>({})},LinearTransition:{duration:()=>({})}}};
 const Strip=load('components/CommentEmojiStrip.tsx',mocks).default;
 const render=()=>{for(let i=0;i<8;i++){dirty=false;cursor=0;effects=[];output=Strip(props);effects.forEach(fn=>fn());if(!dirty)return output;}throw Error('render did not settle');};
 return{props,selected,render,get list(){return output;}};
}
const event=x=>({nativeEvent:{contentOffset:{x}}});
test('browsing the row freezes visible order until returning to start, while taps still insert',()=>{
 const h=harness();h.render();assert.equal(h.list.props.horizontal,true);assert.equal(h.list.props.initialNumToRender,14);
 const before=h.list.props.data;h.list.props.onScrollBeginDrag();h.list.props.onScroll(event(470));h.list.props.onScrollEndDrag(event(470));
 const item=before[10],cell=h.list.props.renderItem({item,index:10});cell.props.children.props.onPress();assert.deepEqual(h.selected,[item]);
 h.props.recent=['💙',...recent.DEFAULT_COMMENT_EMOJIS];h.render();assert.equal(h.list.props.data,before,'no reordered data while browsing');
 h.list.props.onMomentumScrollEnd(event(0));h.render();assert.equal(h.list.props.data[0],'💙');assert.equal(h.list.props.snapToInterval,46);
 assert.equal(h.list.props.keyboardShouldPersistTaps,'always');
});
test('at the start a recent change is reflected immediately and final cell excludes trailing gap',()=>{
 const h=harness();h.render();h.props.recent=['👩🏽‍💻'];h.render();assert.equal(h.list.props.data[0],'👩🏽‍💻');
 assert.equal(h.list.props.getItemLayout(null,0).length,46);
 assert.equal(h.list.props.getItemLayout(null,h.list.props.data.length-1).length,24);
});

test('Android emoji paint gets breathing room without enlarging the icon or applying text font scaling',()=>{
 const h=harness();h.render();const item=h.list.props.data[0];const cell=h.list.props.renderItem({item,index:0}),button=cell.props.children,text=button.props.children;
 assert.equal(text.props.allowFontScaling,false);assert.equal(text.props.style.fontSize,18);assert.equal(button.props.style.width,24);assert.equal(h.list.props.style.height,24);
 assert.ok(text.props.style.lineHeight>text.props.style.fontSize);
});
