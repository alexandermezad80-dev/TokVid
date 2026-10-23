const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile"),read=s=>fs.readFileSync(path.join(root,s),"utf8");
const profile=read("app/(tabs)/profile.tsx"),inbox=read("app/(tabs)/inbox.tsx"),empty=read("components/RefreshableInboxEmpty.tsx");
test("B1 captures only horizontal profile swipes before nested native ScrollView",()=>{
 assert.ok(profile.includes("onMoveShouldSetPanResponder:(_event,g)=>isOwnProfileHorizontalMove(g.dx,g.dy)"));
 assert.ok(profile.includes("onMoveShouldSetPanResponderCapture:(_event,g)=>isOwnProfileHorizontalMove(g.dx,g.dy)"));
 assert.ok(profile.includes("stickyHeaderIndices={[1]}"));
});
test("B2 captures horizontal gestures below the approved Inbox tabs",()=>{
 assert.ok(inbox.indexOf("<View style={styles.tabs}>")<inbox.indexOf('<View style={styles.swipeContent} {...inboxSwipeResponder.panHandlers}>'));
 assert.ok(inbox.includes("onMoveShouldSetPanResponderCapture:(_event,gesture)=>"));
 assert.ok(inbox.includes("(gesture.numberActiveTouches??1)===1 && isInboxHorizontalGesture(gesture.dx,gesture.dy)"));
});
test("Both Inbox sections have pull-to-refresh in empty/loading/error cases",()=>{
 assert.equal((inbox.match(/<RefreshableInboxEmpty refreshing=\{refreshing\} onRefresh=\{handleRefresh\}>/g)||[]).length,5);
 assert.ok(empty.includes("flexGrow:1"));
 assert.ok(empty.includes("<RefreshControl refreshing={refreshing} onRefresh={onRefresh}"));
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
