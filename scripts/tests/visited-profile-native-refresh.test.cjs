const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../artifacts/mobile');
const source=fs.readFileSync(path.join(root,'components/VisitedProfileRefresh.tsx'),'utf8');
function harness(os='android',externalOffset=0){
 const slots=[];let cursor=0;
 const react={useRef:v=>{const i=cursor++;return slots[i]||(slots[i]={current:v});}};
 const exports={};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{
  if(name==='react')return react;
  if(name==='react-native')return {Platform:{OS:os},ScrollView:'ScrollView'};
  if(name==='./OwnProfileMagneticRefresh')return {__esModule:true,default:'NativePull'};
  if(name==='./ProfilePullRefresh')return {__esModule:true,default:'LegacyPull'};
  if(name.includes('jsx-runtime'))return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
  throw Error(name);
 }});
 const scrollOffsetRef={current:externalOffset};
 const props={scrollOffsetRef,refreshing:false,onRefresh:async()=>{},children:['profile','sticky','grid'],stickyHeaderIndices:[1],
  style:{flex:1},contentContainerStyle:{minHeight:760},overScrollMode:'never',scrollEventThrottle:16,showsVerticalScrollIndicator:false};
 return {props,render(patch={}){cursor=0;return exports.default({...props,...patch});}};
}
test('visited Android profile has one native scroll controller, approved pull and unchanged data callback',async()=>{
 const h=harness();let calls=0;const promise=Promise.resolve('refreshed');const onRefresh=()=>{calls++;return promise;};
 const tree=h.render({onRefresh});assert.equal(tree.type,'NativePull');assert.equal(tree.props.onRefresh,onRefresh);
 assert.equal(tree.props.onRefresh(),promise);assert.equal(calls,1);
 assert.deepEqual(tree.props.children,h.props.children);assert.equal(tree.props.refreshControl,undefined);
 for(const key of ['stickyHeaderIndices','style','contentContainerStyle','overScrollMode','scrollEventThrottle','showsVerticalScrollIndicator'])assert.equal(tree.props[key],h.props[key]);
 assert.equal(tree.props.headerSnapHeight,undefined,'do not introduce new snapping in the visited header');
 assert.equal(tree.props.horizontalMoving,undefined);
});
test('each visited mount starts at zero and native scroll forwards offset and sticky/header events',()=>{
 const h=harness('android',225),events=[],onLayout=()=>{},onScrollBeginDrag=()=>{},onMomentumScrollEnd=()=>{};
 let tree=h.render({onScroll:e=>events.push(e),onLayout,onScrollBeginDrag,onMomentumScrollEnd});
 assert.equal(tree.props.scrollOffsetRef.current,0,'old profile offset must not suppress a new native pull');
 const ownRef=tree.props.scrollOffsetRef;
 for(const y of [180,0,-3]){const e={nativeEvent:{contentOffset:{x:0,y}}};tree.props.onScroll(e);assert.equal(h.props.scrollOffsetRef.current,Math.max(0,y));assert.equal(events.at(-1),e);}
 assert.equal(tree.props.onLayout,onLayout);assert.equal(tree.props.onScrollBeginDrag,onScrollBeginDrag);assert.equal(tree.props.onMomentumScrollEnd,onMomentumScrollEnd);
 ownRef.current=90;tree=h.render({refreshing:true});assert.equal(tree.props.scrollOffsetRef,ownRef);assert.equal(tree.props.scrollOffsetRef.current,90);assert.equal(tree.props.refreshing,true);
 assert.equal(harness('android',90).render().props.scrollOffsetRef.current,0);
});
test('non-Android visited profiles retain their exact legacy wrapper and ScrollView props',()=>{
 for(const os of ['ios','web']){const h=harness(os,30),onScroll=()=>{},tree=h.render({onScroll});
  assert.equal(tree.type,'LegacyPull');assert.equal(tree.props.scrollOffsetRef,h.props.scrollOffsetRef);assert.equal(tree.props.onRefresh,h.props.onRefresh);
  assert.equal(tree.props.children.type,'ScrollView');assert.equal(tree.props.children.props.onScroll,onScroll);
  assert.equal(tree.props.children.props.stickyHeaderIndices,h.props.stickyHeaderIndices);assert.equal(tree.props.children.props.children,h.props.children);
 }
});
test('visited screen keys native pull per user and keeps loading gates, refresh sources and sticky indices',()=>{
 const s=fs.readFileSync(path.join(root,'app/user-profile.tsx'),'utf8');
 assert.ok(s.includes('import ProfilePullRefresh from "../components/VisitedProfileRefresh";'));
 assert.ok(s.includes('onRefresh={onRefresh} key={userId}'));assert.ok(!s.includes('<ScrollView'));
 for(const text of ['loading?<View','!profile?<View','stickyHeaderIndices={[1]}','fetchProfile(false)','publications.refresh()',
  'readProfileVisibility(userId)','readProfileActivity(userId,tab,0)','if(!userId || refreshGuard.current)return;',
  'finally{refreshGuard.current=false;setRefreshing(false);}','<ProfileTabBar/>'])assert.ok(s.includes(text),text);
});
test('approved own-profile engine, math, Inbox and Feed remain byte-identical to APK314',()=>{
 const expected=require('../fixtures/visited-pull-preserved-hashes.json').files;
 for(const [file,hash] of Object.entries(expected)){
  const data=fs.readFileSync(path.join(root,file));assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+data.length+'\0'),data])).digest('hex'),hash,file);
 }
});
