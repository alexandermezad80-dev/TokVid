const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../artifacts/mobile');
function load(file,modules={},extra=''){
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8')+extra,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>{if(n.includes('jsx-runtime'))return modules['react/jsx-runtime'];if(n in modules)return modules[n];throw Error(n)}});return exports;
}
const drag=load('lib/features/gestures/horizontalDrag.ts'),{createSectionSnap}=load('lib/features/gestures/sectionSnap.ts',{'./horizontalDrag':drag});
function motion({last=5,asyncStop=false}={}){
 let value=0,pending=null,read=null,moving=false,selected=0;const commits=[],all=[];
 const model=createSectionSnap({width:()=>360,last:()=>last,stop(cb){if(pending){const p=pending;pending=null;p.done(false);}if(asyncStop)read=cb;else cb(value);},set:n=>{value=n},animate(target,duration,done){pending={target,duration,done};all.push(pending);},moving:v=>{moving=v},commit:i=>{selected=i;commits.push(i)}});
 return{model,commits,all,get value(){return value},get moving(){return moving},get selected(){return selected},setValue:n=>{value=n},read(){const fn=read;read=null;fn?.(value)},finish(){const p=pending;pending=null;if(p){value=p.target;p.done(true)}},get target(){return pending?.target}};
}
test('short pulls return, deliberate pulls snap, and commit occurs only after landing',()=>{
 for(const last of [1,5])for(const [dx,vx,target]of [[-30,0,0],[-90,0,1],[-18,-2,1]]){
 const m=motion({last});m.model.grant();m.model.move(dx);assert.equal(m.value,-dx/360);m.model.release(dx,vx);assert.equal(m.target,target);assert.deepEqual(m.commits,[]);m.finish();assert.equal(m.selected,target);assert.equal(m.value,target);assert.equal(m.moving,false);
 }
});
test('a second swipe reverses from the actual half-finished native position, without a half-screen jump',()=>{
 for(const last of [1,5]){const m=motion({last});m.model.grant();m.model.move(-120);m.model.release(-120,0);m.setValue(.5);m.model.grant();m.model.move(20);assert.equal(m.value,.5-20/360);m.model.release(20,0);m.finish();assert.equal(m.selected,0);assert.deepEqual(m.commits,[0]);}
});
test('a tab tap during settlement overrides the animation and rejects its late completion',()=>{
 for(const last of [1,5]){const m=motion({last});m.model.grant();m.model.release(-120,0);const stale=m.all[0];m.model.select(0);stale.done(true);assert.equal(m.value,0);assert.deepEqual(m.commits,[]);assert.equal(m.moving,false);}
});
test('native stop callback may arrive after moves and release without dropping the intended gesture',()=>{
 const m=motion({asyncStop:true});m.setValue(.5);m.model.grant();m.model.move(80);m.model.release(100,0);assert.equal(m.target,undefined);m.read();assert.equal(m.target,0);m.finish();assert.equal(m.value,0);
});
test('late native stop cannot revive a cancelled gesture or a disposed screen',()=>{
 for(const dispose of [false,true]){const m=motion({asyncStop:true});m.model.grant();m.model.move(-150);if(dispose)m.model.dispose();else m.model.select(2);m.read();m.model.release(-150,-3);assert.equal(m.target,undefined);assert.deepEqual(m.commits,[]);if(!dispose)assert.equal(m.value,2);}
 const cancelled=motion();cancelled.model.grant();cancelled.model.move(-100);cancelled.model.cancel(0);assert.equal(cancelled.target,0);assert.equal(cancelled.all.at(-1).duration,200);cancelled.finish();assert.deepEqual(cancelled.commits,[]);assert.equal(cancelled.moving,false);
});
test('fast flicks move at most one section and both endpoints stay bounded',()=>{
 for(let start=0;start<6;start++)for(const dx of [-800,-20,20,800])for(const vx of [-20,0,20]){
 const m=motion();m.model.select(start);m.model.grant();m.model.move(dx);assert.ok(Math.abs(m.value-start)<=1);m.model.release(dx,vx);m.finish();assert.ok(m.value>=0&&m.value<=5);assert.ok(Math.abs(m.value-start)<=1);}
 for(const origin of [.001,.999,1.001,2.999,4.999])for(const dx of [-100,100]){const m=motion();m.setValue(origin);m.model.grant();m.model.move(dx);m.model.release(dx,0);m.finish();assert.ok(Number.isInteger(m.value),'fractional native stop must select a real page: '+m.value);}
});
const el=(type,props,key)=>({type,props,key}),flat=s=>Array.isArray(s)?Object.assign({},...s.map(flat)):s||{};
function pager(){
 const slots=[];let cursor=0,effects=[];const react={useMemo:fn=>fn(),useRef(x){const i=cursor++;if(!slots[i])slots[i]={current:x};return slots[i]},useState(x){const i=cursor++;if(!slots[i])slots[i]={value:x};return[slots[i].value,n=>slots[i].value=typeof n==='function'?n(slots[i].value):n]},useLayoutEffect:fn=>effects.push(fn)};
 const native={View:'View',Animated:{View:'AnimatedView',multiply:(a,b)=>a*b},StyleSheet:{create:x=>x}};
 const modules={react,'react-native':native,'react/jsx-runtime':{jsx:el,jsxs:el,Fragment:'Fragment'}};
 const p=load('components/HorizontalSwipePages.tsx',modules,'\nexports.PageContent=PageContent;');
 return{render(props){cursor=0;const tree=p.default(props);effects.splice(0).forEach(fn=>fn());return tree},content(props){cursor=0;const tree=p.PageContent(props);effects.splice(0).forEach(fn=>fn());return tree},modules};
}
const sections=['videos','stories','shared','liked','saved','drafts'];
test('page identities and coordinates never change when the selected page changes mid-motion',()=>{
 const p=pager();for(const active of sections){const tree=p.render({sections,active,center:'liked',position:3.5,width:360,minHeight:460,moving:true,renderPage:s=>s});const track=tree.props.children;
 assert.equal(flat(track.props.style).transform[0].translateX,-1260);assert.equal(tree.props.children.props.children.length,6);
 track.props.children.forEach((node,index)=>{assert.equal(node.key,sections[index]);assert.equal(flat(node.props.style).left,index*360);assert.equal(node.props.children.props.children,sections[index]);assert.equal(node.props.pointerEvents,'none')});}
});
test('both rows of an incoming taller grid fit throughout movement; blank space has a minimum body height',()=>{
 const p=pager(),props={sections,active:'liked',center:'liked',position:3,width:360,minHeight:460,moving:false,renderPage:s=>s};
 let tree=p.render(props);assert.equal(flat(tree.props.style).height,460);
 const nodes=tree.props.children.props.children;nodes[3].props.onLayout({nativeEvent:{layout:{width:360,height:150}}});nodes[4].props.onLayout({nativeEvent:{layout:{width:360,height:720}}});
 tree=p.render({...props,moving:true});assert.equal(flat(tree.props.style).height,720);
 tree=p.render({...props,active:'saved',center:'saved',position:4});assert.equal(flat(tree.props.style).height,720);
 tree=p.render(props);assert.equal(flat(tree.props.style).height,460);
 tree=p.render({...props,width:720,moving:true});assert.equal(flat(tree.props.style).height,460,'old-width measurements are discarded');
});
test('inactive preview retains its last active content while only the settled page accepts taps',()=>{
 const p=pager();assert.equal(p.content({active:true,children:'loaded saved grid'}).props.children,'loaded saved grid');assert.equal(p.content({active:false,children:'reset empty'}).props.children,'loaded saved grid');assert.equal(p.content({active:true,children:'fresh result'}).props.children,'fresh result');
 const q=pager(),tree=q.render({sections,active:'saved',center:'saved',position:4,width:360,minHeight:460,renderPage:s=>s});
 tree.props.children.props.children.forEach(n=>{assert.equal(n.props.pointerEvents,n.key==='saved'?'auto':'none');assert.equal(n.props.accessibilityElementsHidden,n.key!=='saved')});
});
test('profile indicator is 22dp, matches lower-bar grey, and stays centered at every position; Inbox keeps its styling',()=>{
 const p=pager(),v=load('constants/referenceVisual.ts');const Indicator=load('components/SwipePositionUnderline.tsx',{...p.modules,'../constants/referenceVisual':v}).default;
 for(const width of [320,360,393,720])for(const position of [0,.4,2.8,5]){
 const s=flat(Indicator({position,tabWidth:width/6}).props.style);assert.equal(s.width,22);assert.equal(s.height,2);assert.equal(s.backgroundColor,v.referenceVisual.label);assert.ok(Math.abs(s.left+s.transform[0].translateX+11-(position+.5)*width/6)<1e-6);}
 const inbox=flat(Indicator({position:.5,tabWidth:180,markerWidth:97,color:'#25F4EE'}).props.style);assert.equal(inbox.width,97);assert.equal(inbox.backgroundColor,'#25F4EE');assert.equal(inbox.height,2);
});
test('approved pull files and data hooks are unchanged; pager is below the strip and includes blank footer',()=>{
 for(const [f,sha] of [['components/OwnProfileMagneticRefresh.tsx','58d5b80d8153223cd904fc8c637a8b90c5663b2e'],['lib/features/profile/ownProfilePull.ts','e1320754a3ffcb9c0694c3a7e1f78d271cab8f24']]){const b=fs.readFileSync(path.join(root,f));assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex'),sha)}
 const profile=fs.readFileSync(path.join(root,'app/(tabs)/profile.tsx'),'utf8');const start=profile.indexOf('<View {...tabSwipeResponder.panHandlers}>'),end=profile.indexOf('</ProfilePullRefresh>',start);const region=profile.slice(start,end);
 assert.ok(region.includes('scrollViewportHeight-39-'));assert.ok(region.indexOf('insets.bottom + 80')<region.lastIndexOf('</View>'));assert.ok(profile.indexOf('styles.tabBar')<start);assert.ok(profile.includes('key={user.id} sections={OWN_PROFILE_TABS}'));
});
function hookRuntime(){
 const slots=[],effects=[],listeners=new Map();let cursor=0,active='videos',animation=null,result;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
 const react={useRef(x){const i=cursor++;if(!slots[i])slots[i]={current:x};return slots[i]},useState(x){const i=cursor++;if(!slots[i])slots[i]={value:x};return[slots[i].value,n=>slots[i].value=typeof n==='function'?n(slots[i].value):n]}};
 const effect=(fn,deps)=>{const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps)){const old=slots[i];slots[i]={deps,fn};effects.push(()=>{old?.cleanup?.();slots[i].cleanup=fn()})}};react.useEffect=effect;react.useLayoutEffect=effect;
 class Value{constructor(n){this.value=n}setValue(n){this.value=n;for(const cb of listeners.values())cb({value:n})}stopAnimation(cb){const old=animation;animation=null;old?.done?.({finished:false});cb?.(this.value)}addListener(cb){const key=String(listeners.size+1);listeners.set(key,cb);return key}removeListener(key){listeners.delete(key)}}
 const rn={Animated:{Value,timing(v,o){return{start(done){animation={v,o,done}}}}},Easing:{out:x=>x,cubic:'cubic'},PanResponder:{create:pan=>({panHandlers:pan})}};
 const {useSectionSwipe}=load('hooks/useSectionSwipe.ts',{react,'react-native':rn,'../lib/features/gestures/sectionSnap':{createSectionSnap}});
 const render=()=>{cursor=0;result=useSectionSwipe(sections,active,360,s=>active=s,(dx,dy)=>Math.abs(dx)>=16&&Math.abs(dx)>1.6*Math.abs(dy));effects.splice(0).forEach(fn=>fn());return result};render();
 return{render,get result(){return result},get active(){return active},finish(){const a=animation;animation=null;if(a){a.v.setValue(a.o.toValue);a.done({finished:true})}},replay(){for(const s of slots)s?.cleanup?.();for(const s of slots)if(s?.fn)s.cleanup=s.fn()},unmount(){for(const s of slots)s?.cleanup?.()}};
}
test('real hook wiring: tapping the current tab cancels an in-flight snap even without a tab state change',()=>{
 const r=hookRuntime(),pan=r.result.responder.panHandlers;
 pan.onPanResponderGrant();pan.onPanResponderMove({}, {dx:-120,dy:0});pan.onPanResponderRelease({}, {dx:-120,vx:0});
 r.result.select('videos');r.finish();r.render();assert.equal(r.active,'videos');assert.equal(r.result.position.value,0);assert.equal(r.result.moving,false);
});
test('hook survives effect replay, excludes vertical/multitouch, and cannot commit after unmount',()=>{
 const r=hookRuntime();r.replay();const pan=r.result.responder.panHandlers;
 assert.equal(pan.onMoveShouldSetPanResponderCapture({}, {dx:25,dy:60,numberActiveTouches:1}),false);assert.equal(pan.onMoveShouldSetPanResponderCapture({}, {dx:60,dy:2,numberActiveTouches:2}),false);assert.equal(pan.onMoveShouldSetPanResponderCapture({}, {dx:60,dy:2,numberActiveTouches:1}),true);
 pan.onPanResponderGrant();pan.onPanResponderRelease({}, {dx:-120,vx:0});r.finish();r.render();assert.equal(r.active,'stories');
 pan.onPanResponderGrant();pan.onPanResponderRelease({}, {dx:-120,vx:0});r.unmount();r.finish();assert.equal(r.active,'stories');
});
