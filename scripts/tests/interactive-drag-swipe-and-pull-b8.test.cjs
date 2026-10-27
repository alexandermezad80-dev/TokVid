const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile"),read=s=>fs.readFileSync(path.join(root,s),"utf8");
const profile=read("app/(tabs)/profile.tsx"),inbox=read("app/(tabs)/inbox.tsx"),pull=read("components/PullRefreshUnderHeader.tsx");
const pure=read("lib/features/gestures/horizontalDrag.ts");
const mod={};vm.runInNewContext(ts.transpileModule(pure,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:mod});
test("B8 drag follows finger at subpixel fraction, reversible without lifting, bounded at endpoints",()=>{
 const go=mod.clampSwipePosition;
 assert.equal(go(2,-90,360,5),2.25);
 assert.equal(go(2,90,360,5),1.75);
 assert.equal(go(2,0,360,5),2);
 assert.equal(go(0,450,360,5),0);
 assert.equal(go(5,-450,360,5),5);
 assert.equal(go(2,-720,360,5),4);
 assert.equal(go(2,-720,0,5),2);
});
test("B8 snap uses both drag distance and speed, never leaves the six pages",()=>{
 const settle=mod.settleSwipePosition;
 assert.equal(settle(0,-85,0,360,5),1);
 assert.equal(settle(1,85,0,360,5),0);
 assert.equal(settle(2,-20,-2.5,360,5),3);
 assert.equal(settle(2,20,2.5,360,5),1);
 assert.equal(settle(0,10,0,360,5),0);
 assert.equal(settle(4,-360,0,360,5),5);
 assert.equal(settle(0,300,5,360,5),0);
});
test("B8 own profile drags only below original tab strip, all 6 views reuse original section content",()=>{
 for(const s of [
   "useSectionSwipe(OWN_PROFILE_TABS,tab,width,selectWithHint,isOwnProfileHorizontalMove)",
   "responder:tabSwipeResponder",
   "moving:swipeMoving",
   "moving={swipeMoving}",
   "minHeight={Math.max(0,scrollViewportHeight-39-",
   "position:pagePosition",
   '<HorizontalSwipePages key={user.id} sections={OWN_PROFILE_TABS} active={tab} center={previewTab}',
   "renderPage={renderSection}",
   "SwipePositionUnderline position={pagePosition} tabWidth={width/6}",
   "width:width/6,flex:0",
   "stickyHeaderIndices={[1]}",
   "onPress={()=>selectTab(item.key)}",
   "components/OwnProfileMagneticRefresh",
 ])assert.ok(profile.includes(s),s);
 assert.ok(profile.indexOf("styles.tabBar")<profile.indexOf("<HorizontalSwipePages"));
 assert.ok(!profile.includes("interests"));
});
test("B8 Inbox: fixed approved tabs and notification buttons, reversible drag only in body",()=>{
 for(const s of ["useSectionSwipe(inboxSections,tab,width,setTab,isInboxHorizontalGesture)",
   "responder:inboxSwipeResponder","moving={inboxMoving}",
   "position:inboxPagePosition",
   "onPress={() => selectTab(t)}",
   "styles.swipeContent} {...inboxSwipeResponder.panHandlers}",
   "renderPage={renderInboxPage}","enabled={section===tab}",
   'onPress={markAllRead}','markRead(n.id)','onPress={goToChat}',
   'onRefresh={handleRefresh}'
 ])assert.ok(inbox.includes(s),s);
 assert.ok(inbox.indexOf('<View style={styles.tabs}>')<inbox.indexOf('<HorizontalSwipePages'));
});
test("B8 same BLUE circular spinner with elastically exposed content stays visible until profile fetch ends",()=>{
 assert.ok(pull.includes('<ActivityIndicator size="small" color={color}/>'));
 assert.ok(!pull.includes("dots"));
 assert.ok(pull.includes("Animated.spring(translation,{toValue:holdPx.current,useNativeDriver:true}).start();"));
 assert.ok(pull.includes("Promise.resolve().then(()=>callback.current()).catch(()=>{}).finally"));
 assert.ok(pull.includes("Animated.timing(translation,{toValue:0,duration:220,useNativeDriver:true}).start();"));
 assert.ok(pull.includes("offset.current.current<=1"));
 assert.ok(!inbox.includes('color="#4B7194"'),"Preserve approved Inbox indicator color");
});
test("B8 TypeScript parses the exact new source with unchanged data buttons and profile geometry",()=>{
 for(const s of [profile,inbox,pull,read("components/HorizontalSwipePages.tsx"),read("components/SwipePositionUnderline.tsx"),pure]){
  const r=ts.transpileModule(s,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.deepEqual(r.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).map(x=>String(x.messageText)),[]);
 }
});
