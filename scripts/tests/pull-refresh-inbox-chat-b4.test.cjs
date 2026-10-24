const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile"),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const component=read("components/PullRefreshUnderHeader.tsx");
const inbox=read("app/(tabs)/inbox.tsx"),chat=read("app/chat.tsx"),empty=read("components/RefreshableInboxEmpty.tsx");
test("B4: pull indicator stays in a distinct gap below fixed Inbox header, not above a row",()=>{
 const header=inbox.indexOf('<ReferenceHeader variant="inbox"'),tabs=inbox.indexOf('<View style={styles.tabs}>');
 const gestures=inbox.indexOf('<View style={styles.swipeContent} {...inboxSwipeResponder.panHandlers}>');
 const pull=inbox.indexOf('<PullRefreshUnderHeader scrollOffsetRef={refreshScrollOffset}');
 const pager=inbox.indexOf('<HorizontalSwipePages sections={inboxSections}');
 // renderInboxPage is a callback defined before the screen JSX; its PullRefresh is mounted by that pager.
 assert.ok(header>=0&&tabs>header&&gestures>tabs&&pager>gestures&&pull>=0);
 assert.ok(inbox.includes('renderPage={renderInboxPage}'));
 assert.ok(inbox.includes('enabled={section===tab}'));
 assert.match(component,/onMoveShouldSetPanResponderCapture/);
 assert.match(component,/g\.dy>12 && g\.dy>Math\.abs\(g\.dx\)\*1\.45/);
 assert.match(component,/offset\.current\.current<=1/);
 assert.match(component,/transform:\[\{translateY:translation\}\]/);
 assert.match(component,/position:"absolute"/);
 assert.match(component,/Animated\.timing\(translation,\{toValue:0,duration:220,useNativeDriver:true\}\)/);
 assert.ok(component.includes("pointerEvents=\"none\""));
 assert.ok(inbox.includes('colors={["transparent"]} progressBackgroundColor="transparent"'),"Android refresh circle must not overlay a row");
 assert.ok(empty.includes('colors={["transparent"]} progressBackgroundColor="transparent"'),"Empty inbox uses native trigger without overlapping spinner");
});
test("B4: populated and empty Inbox both share one vertical gesture without changing swipe",()=>{
 assert.equal((inbox.match(/<RefreshableInboxEmpty refreshing=\{refreshing\} onRefresh=\{handleRefresh\}>/g)||[]).length,5);
 assert.equal((inbox.match(/onScroll=\{e=>\{refreshScrollOffset\.current=Math\.max\(0,e\.nativeEvent\.contentOffset\.y\);\}\}/g)||[]).length,2);
 assert.ok(inbox.includes("onMoveShouldSetPanResponderCapture:(_event,gesture)=>"));
 assert.ok(inbox.includes("if(next!==currentTabRef.current)setTab(next);"));
 assert.ok(inbox.includes("useEffect(()=>{refreshScrollOffset.current=0;},[tab]);"));
 assert.ok(inbox.includes("refreshGuard.current=false;"));
});
test("B4: chat-only refresh calls existing chat.refresh, preserves keyboard, bubble and scroll",()=>{
 assert.ok(chat.includes("await chat.refresh();await refreshTools();"));
 assert.ok(chat.includes("<PullRefreshUnderHeader scrollOffsetRef={pullScrollOffset} onRefresh={pullRefresh} refreshing={isPullRefreshing}"));
 assert.ok(chat.includes("enabled={!keyboard&&!busy&&!recording.isRecording}"));
 assert.ok(chat.includes("pullScrollOffset.current=Math.max(0,contentOffset.y)"));
 for(const keep of ["maintainVisibleContentPosition={{minIndexForVisible:0}}","keyboardShouldPersistTaps=\"handled\"","onScrollBeginDrag={close}","setReply(null)","onPress={text.trim()||media?send:record}","onPress={()=>void pick(true)}","onPress={()=>void pick(false)}","<Bubble text={item.text}"])assert.ok(chat.includes(keep),keep);
});
test("B4: modified TSX transpiles",()=>{
 for(const c of [component,inbox,chat,empty]){const out=ts.transpileModule(c,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});assert.deepEqual(out.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).map(x=>String(x.messageText)),[]);}
});
