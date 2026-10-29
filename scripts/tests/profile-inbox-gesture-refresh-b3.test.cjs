const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile"),read=s=>fs.readFileSync(path.join(root,s),"utf8");
const swipe=read("hooks/useSectionSwipe.ts");
const profile=read("app/(tabs)/profile.tsx"),inbox=read("app/(tabs)/inbox.tsx"),empty=read("components/RefreshableInboxEmpty.tsx");
test("B1 captures only horizontal profile swipes before nested native ScrollView",()=>{
 assert.ok(profile.includes("useSectionSwipe(OWN_PROFILE_TABS,tab,width,selectWithHint,isOwnProfileHorizontalMove)"));
 assert.ok(swipe.includes("onMoveShouldSetPanResponderCapture:"));
 assert.ok(profile.includes("stickyHeaderIndices={[1]}"));
});
test("B2 captures horizontal gestures below the approved Inbox tabs",()=>{
 assert.ok(inbox.indexOf("<View style={styles.tabs}>")<inbox.indexOf('<View style={styles.swipeContent}>'));
 assert.ok(inbox.includes("InboxSwipePager key={user.id} ref={inboxPager}"));
 assert.ok(swipe.includes("onPanResponderMove:"));
 assert.ok(swipe.includes("(g.numberActiveTouches ?? 1) === 1 && current.current.accepts(g.dx, g.dy)"));
});
test("Both Inbox sections have pull-to-refresh in empty/loading/error cases",()=>{
 assert.equal((inbox.match(/<RefreshableInboxEmpty refreshing=\{refreshing\} onRefresh=\{handleRefresh\}>/g)||[]).length,5);
 assert.ok(empty.includes("fill:{flex:1}"));
 assert.ok(inbox.includes('<PullRefreshUnderHeader scrollOffsetRef={refreshScrollOffset} onRefresh={handleRefresh} refreshing={refreshing} enabled={section===tab} color="#FE2C55" holdWhileRefreshing holdDistance={64} nativeRefreshFallback={Platform.OS==="android"}>'));
 assert.equal((inbox.match(/<RefreshControl refreshing=\{refreshing\} onRefresh=\{handleRefresh\}/g)||[]).length,2);
 assert.ok(inbox.includes("refreshGuard.current=false;"));
 assert.ok(inbox.includes("setRefreshing(false);"));
});
test("New gesture/refresh files transpile",()=>{
 for(const s of [profile,inbox,empty]){
  const r=ts.transpileModule(s,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.deepEqual(r.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).map(x=>String(x.messageText)),[]);
 }
});
