const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile"),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const feed=read("app/(tabs)/index.tsx"),wrapper=read("components/PullRefreshUnderHeader.tsx"),card=read("components/VideoCard.tsx");
test("B6 feed can only pull at first video, and never captures vertical page movement later",()=>{
 assert.ok(feed.includes('enabled={!commentVideo&&videos.length>0&&activeIndex===0}'));
 assert.ok(feed.includes('onScroll={e=>{feedPullOffset.current=Math.max(0,e.nativeEvent.contentOffset.y);}}'));
 assert.ok(wrapper.includes("offset.current.current<=1"));
 assert.ok(wrapper.includes("g.dy>12 && g.dy>Math.abs(g.dx)*1.45"));
 assert.ok(wrapper.includes("g.dy>=trigger.current"));
 assert.ok(wrapper.includes("maxDistance.current"));
 assert.ok(feed.includes("triggerDistance={148}"));
});
test("B6 spinner only appears following deliberate gesture, not focus or auto loading",()=>{
 assert.ok(!feed.includes("<RefreshControl"));
 assert.ok(wrapper.includes('opacity:translation.interpolate('));
 assert.ok(wrapper.includes("inputRange:[0,14,44],outputRange:[0,0.4,1]"));
 assert.ok(feed.includes("refreshOnFocus.current()"));
 assert.ok(feed.includes("onRefresh={refreshFeed}"));
 assert.ok(feed.includes("indicatorTop={insets.top+58}"));
 assert.ok(!card.includes("PullRefreshUnderHeader"));
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
