const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'../../artifacts/mobile');
const source=fs.readFileSync(path.join(root,'components/InboxSwipePager.tsx'),'utf8');
const el=(type,props,key)=>({type,props,key});
const flat=s=>Array.isArray(s)?Object.assign({},...s.map(flat)):s||{};
function harness({queued=false,...initial}={}){
 const slots=[],effects=[],pending=[],scrolls=[],commits=[],previews=[],motions=[];let cursor=0,tree;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const memo=(fn,deps)=>{const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps))slots[i]={deps,value:fn()};return slots[i].value;};
 const effect=(fn,deps)=>{const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps)){const old=slots[i];slots[i]={deps,fn};effects.push(()=>{old?.cleanup?.();slots[i].cleanup=fn();});}};
 const react={forwardRef:fn=>fn,useRef:v=>memo(()=>({current:v}),[]),useCallback:(fn,deps)=>memo(()=>fn,deps),useEffect:effect,useLayoutEffect:effect,
  useImperativeHandle:(ref,create,deps)=>{ref.current=memo(create,deps);}};
 const native={View:'View',StyleSheet:{create:s=>s}};
 const reanimated={__esModule:true,default:{ScrollView:'NativePager',View:'AnimatedView'},useSharedValue:v=>memo(()=>({value:v}),[]),
  useAnimatedRef:()=>memo(()=>({current:null}),[]),useAnimatedStyle:fn=>({get transform(){return fn().transform;}}),
  useAnimatedScrollHandler:handlers=>handlers,runOnUI:fn=>fn,
  runOnJS:fn=>(...args)=>queued?pending.push(()=>fn(...args)):fn(...args),
  scrollTo:(ref,x,y,animated)=>scrolls.push({x,y,animated})};
 const exports={};vm.runInNewContext(ts.transpileModule(source+'\nexports.PageContent=PageContent;',{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{
  if(name==='react')return react;if(name==='react-native')return native;if(name==='react-native-reanimated')return reanimated;
  if(name.includes('jsx-runtime'))return {jsx:el,jsxs:el,Fragment:'Fragment'};throw Error(name);
 }});
 const position={value:0},ref={current:null};
 let props={active:'activity',width:360,position,moving:false,enabled:true,
  onSelect:s=>{commits.push(s);props.active=s;},onPreview:s=>previews.push(s),onMoving:m=>{motions.push(m);props.moving=m;},renderPage:s=>s,...initial};
 const render=patch=>{props={...props,...patch};cursor=0;tree=exports.default(props,ref);effects.splice(0).forEach(fn=>fn());return tree;};
 render();
 const event=(kind,x,velocity)=>tree.props.onScroll[kind]({contentOffset:{x,y:0},...(velocity===undefined?{}:{velocity:{x:velocity,y:0}})});
 return {render,event,position,ref,scrolls,commits,previews,motions,get tree(){return tree;},get props(){return props;},
  flush(){pending.splice(0).forEach(fn=>fn());},unmount(){slots.forEach(s=>s?.cleanup?.());},
  indicator(overrides={}){return exports.InboxSwipeIndicator({position,tabWidth:props.width/2,selectedIndex:props.active==='messages'?1:0,moving:props.moving,...overrides});},
  content:exports.PageContent,
  replay(){slots.forEach(s=>s?.cleanup?.());slots.forEach(s=>{if(s?.fn)s.cleanup=s.fn();});}
 };
}

test('Inbox uses native inertia and full-page snap only inside the content viewport',()=>{
 const h=harness();assert.equal(h.tree.type,'NativePager');
 for(const flag of ['horizontal','pagingEnabled','nestedScrollEnabled','directionalLockEnabled'])assert.equal(h.tree.props[flag],true);
 assert.equal(h.tree.props.decelerationRate,'normal');assert.equal(h.tree.props.snapToInterval,360);
 assert.equal(h.tree.props.bounces,false);assert.equal(h.tree.props.overScrollMode,'never');
 assert.equal(h.tree.props.refreshControl,undefined);assert.equal(h.tree.props.scrollEventThrottle,16);
 assert.deepEqual(Array.from(h.tree.props.children,n=>n.key),['activity','messages']);
 assert.equal(flat(h.tree.props.contentContainerStyle).height,'100%');
 h.tree.props.children.forEach(n=>{assert.equal(flat(n.props.style).width,360);assert.equal(n.props.accessibilityElementsHidden,n.key!=='activity');});
});
test('manual taps position content and the resting marker on either tab without waiting for scroll events',()=>{
 const h=harness();
 for(const section of ['messages','activity','messages']){
  h.ref.current.select(section);h.render();const index=section==='messages'?1:0;
  assert.equal(h.position.value,index);assert.equal(h.scrolls.at(-1).x,index*360);assert.equal(h.props.moving,false);
  h.position.value=1-index; // A late native value cannot move the settled marker.
  const line=h.indicator(),s=flat(line.props.style);assert.equal(line.type,'View');assert.equal(s.transform[0].translateX,index*180);
  assert.equal(s.width,97);assert.equal(s.height,2);assert.equal(s.backgroundColor,'#25F4EE');
 }
});
test('drag and native inertia share fractional progress with the marker and permit reversal',()=>{
 const h=harness();h.event('onBeginDrag',0);h.render();
 for(const x of [80,210,150,270]){
  h.event('onScroll',x);assert.equal(h.position.value,x/360);
  const line=h.indicator();assert.equal(line.type,'AnimatedView');assert.equal(flat(line.props.style).transform[0].translateX,x/2);
 }
 assert.deepEqual(h.commits,[]);assert.equal(h.previews.at(-1),'messages');
 h.event('onEndDrag',270,.4);h.event('onScroll',320);assert.equal(h.position.value,320/360);
 h.event('onMomentumEnd',360);h.render();assert.equal(h.props.active,'messages');assert.equal(h.position.value,1);assert.equal(h.props.moving,false);
 assert.equal(h.tree.props.children[1].props.pointerEvents,'auto');assert.equal(h.tree.props.children[0].props.pointerEvents,'none');
});
test('a short swipe returning to origin and a stationary release restore interactions',()=>{
 const h=harness();h.event('onBeginDrag',0);h.event('onScroll',55);h.event('onEndDrag',55,0);h.event('onScroll',20);h.event('onMomentumEnd',0);h.render();
 assert.equal(h.props.active,'activity');assert.equal(h.position.value,0);assert.equal(h.props.moving,false);
 h.event('onBeginDrag',0);h.event('onEndDrag',0,0);assert.equal(h.props.moving,false);
});
test('same-tab tap cancels momentum and rejects old offset/end events and queued JS completions',()=>{
 const h=harness({queued:true});h.event('onBeginDrag',0);h.event('onScroll',280);h.event('onEndDrag',280,.7);h.event('onMomentumEnd',360);
 h.ref.current.select('activity');h.render();h.flush();h.event('onScroll',360);h.event('onMomentumEnd',360);
 assert.equal(h.props.active,'activity');assert.equal(h.position.value,0);assert.equal(h.props.moving,false);
 assert.deepEqual(h.commits,['activity']);assert.equal(flat(h.indicator().props.style).transform[0].translateX,0);
});
test('a second native drag invalidates queued completion of the previous swipe',()=>{
 const h=harness({queued:true});h.event('onBeginDrag',0);h.event('onScroll',320);h.event('onEndDrag',320,.4);h.event('onMomentumEnd',360);
 h.event('onBeginDrag',360);h.event('onScroll',130);h.flush();assert.deepEqual(h.commits,[]);
 h.event('onEndDrag',130,-.5);h.event('onMomentumEnd',0);h.flush();assert.deepEqual(h.commits,['activity']);
});
test('route selection, width changes and refresh interruption preserve a complete selected page',()=>{
 const h=harness();h.render({active:'messages'});assert.equal(h.position.value,1);assert.equal(h.scrolls.at(-1).x,360);
 h.render({width:720});assert.equal(h.scrolls.at(-1).x,720);assert.equal(h.tree.props.snapToInterval,720);
 h.event('onBeginDrag',720);h.event('onScroll',500);h.render({enabled:false});
 assert.equal(h.tree.props.scrollEnabled,false);assert.equal(h.position.value,1);assert.equal(h.scrolls.at(-1).x,720);assert.equal(h.props.moving,false);
 h.event('onMomentumEnd',0);assert.equal(h.props.active,'messages');h.render({enabled:true});assert.equal(h.tree.props.scrollEnabled,true);
});
test('layout before delayed selection callback never sends a landed page back to the old tab',()=>{
 const h=harness({queued:true});h.event('onBeginDrag',0);h.event('onEndDrag',300,.4);h.event('onMomentumEnd',360);
 assert.equal(h.props.active,'activity');h.tree.props.onLayout();assert.equal(h.scrolls.at(-1).x,360);
 h.flush();h.render();assert.equal(h.props.active,'messages');assert.equal(h.position.value,1);
});
test('late end during a new drag is ignored; cancelled fractional landing is aligned exactly',()=>{
 const h=harness();h.event('onBeginDrag',0);h.event('onScroll',250);h.event('onMomentumEnd',0);
 assert.deepEqual(h.commits,[]);assert.equal(h.position.value,250/360);
 h.event('onEndDrag',250,.1);h.event('onMomentumEnd',359);assert.equal(h.position.value,1);assert.equal(h.scrolls.at(-1).x,360);
});
test('unmount invalidates queued UI callbacks and lifecycle replay still permits a new selection',()=>{
 const h=harness({queued:true});h.event('onBeginDrag',0);h.event('onEndDrag',300,.4);h.event('onMomentumEnd',360);h.unmount();h.flush();
 assert.deepEqual(h.commits,[]);
 const r=harness();r.replay();r.ref.current.select('messages');assert.equal(r.props.active,'messages');
});
test('Inbox integration keeps the approved header, labels, native refresh and data callbacks outside the pager',()=>{
 const inbox=fs.readFileSync(path.join(root,'app/(tabs)/inbox.tsx'),'utf8');
 assert.ok(inbox.indexOf('<View style={styles.tabs}>')<inbox.indexOf('<InboxSwipePager key={user.id}'));
 for(const s of ['selectedIndex={tab==="messages"?1:0} moving={inboxMoving}','onPress={() => selectTab(t)}','onMoving={setInboxMoving} renderPage={renderInboxPage}',
  'enabled={!refreshing}','nativeRefreshFallback={Platform.OS==="android"}','holdDistance={64}',
  'markRead(n.id)','openActivity(n)','onPress={goToChat}','usePrivateInbox(user?.id)','useGroupInbox(user?.id,groupRevision)'])assert.ok(inbox.includes(s),s);
 assert.ok(!inbox.includes('useSectionSwipe'));assert.ok(!source.includes('PanResponder'));assert.ok(!source.includes('supabase'));
});
