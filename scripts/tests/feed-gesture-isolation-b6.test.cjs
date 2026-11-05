const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile"),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const feed=read("app/(tabs)/index.tsx"),wrapper=read("components/PullRefreshUnderHeader.tsx"),card=read("components/VideoCard.tsx");
test("Feed refresh is automatic; vertical paging has no manual refresh interceptor",()=>{
 assert.ok(!feed.includes('PullRefreshUnderHeader'));
 assert.ok(!feed.includes('<RefreshControl'));
 assert.ok(!feed.includes('onRefresh={refreshFeed}'));
 assert.ok(feed.includes('refreshOnFocus.current()'));
 assert.ok(feed.includes('onPress={refreshFeed}'),'keep explicit retry after a network failure');
 assert.ok(!card.includes('PullRefreshUnderHeader'));
});
test("B6 protects Feed video geometry and native paging plus overlay stack",()=>{
 for(const token of [
   "pagingEnabled","snapToInterval={SCREEN_HEIGHT}","snapToAlignment=\"start\"",
   "decelerationRate=\"fast\"","onViewableItemsChanged={onViewableItemsChanged}",
   "getItemLayout={(_, index) => ({","scrollEnabled={videos.length > 0 && !commentVideo}",
   "removeClippedSubviews","maxToRenderPerBatch={3}","windowSize={3}",
   "<VideoShareSheet","<CommentsSheet","<Toast",
   "feedMode === \"following\"","selectFeed(\"forYou\")","selectFeed(\"following\")",
   "registerFor","onEndReachedThreshold={0.75}"
 ])assert.ok(feed.includes(token),token);
 assert.ok(wrapper.includes("flex:1,minHeight:0"));
});
test("B6 protected TSX compiles syntactically",()=>{
 for(const s of [feed,wrapper]){
   const t=ts.transpileModule(s,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
   assert.deepEqual(t.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>String(d.messageText)),[]);
 }
});
