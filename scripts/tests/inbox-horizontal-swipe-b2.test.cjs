const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile");
const logic=fs.readFileSync(path.join(root,"lib/features/messages/inboxSwipe.ts"),"utf8");
const inbox=fs.readFileSync(path.join(root,"app/(tabs)/inbox.tsx"),"utf8");
const moduleExports={};
vm.runInNewContext(ts.transpileModule(logic,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:moduleExports});
test("B2 captures only dominant single-finger horizontal movement",()=>{
 const fn=moduleExports.isInboxHorizontalGesture;
 for(const [x,y] of [[0,0],[9,0],[15,1],[80,80],[35,25],[10,70],[-90,100],[NaN,0],[Infinity,0]])assert.equal(fn(x,y),false);
 for(const [x,y] of [[16,0],[-16,0],[60,3],[-85,-4],[120,20]])assert.equal(fn(x,y),true);
});
test("B2 left swipe selects messages and right swipe activity, at most one section",()=>{
 const next=moduleExports.nextInboxTab;
 for(const t of ["activity","messages"]){
   assert.equal(next(t,-90,2),"messages");
   assert.equal(next(t,90,2),"activity");
   assert.equal(next(t,-45,1),t);
   assert.equal(next(t,0,0),t);
   assert.equal(next(t,100,115),t);
 }
});
test("B2 swipe responder lives below original tab bar and excludes floating dialogs",()=>{
 const tabs=inbox.indexOf('<View style={styles.tabs}>');
 const body=inbox.indexOf('<View style={styles.swipeContent}>');
 const menu=inbox.indexOf('{menu&&<ConversationMenu');
 assert.ok(tabs>0&&body>tabs&&menu>body);
 assert.ok(inbox.includes("InboxSwipePager key={user.id} ref={inboxPager}"));
 const swipe=fs.readFileSync(path.join(root,"hooks/useSectionSwipe.ts"),"utf8");
 assert.ok(swipe.includes("onMoveShouldSetPanResponderCapture:"));
 assert.ok(swipe.includes("(g.numberActiveTouches ?? 1) === 1 && current.current.accepts(g.dx, g.dy)"));
 assert.ok(swipe.includes("current.current.onSelect(current.current.sections[index])"));
 assert.match(inbox,/swipeContent: \{ flex: 1 \}/);
 assert.equal((inbox.match(/<View style=\{styles\.swipeContent\}/g)||[]).length,1);
});
test("B2 preserves approved notification, chat, refresh, layouts and tab touch actions",()=>{
 const tokens=[
   'const [tab, setTab] = useState<"activity" | "messages">("activity")',
   'if(params.tab==="messages"||params.tab==="activity")setTab(params.tab)',
   'onPress={() => selectTab(t)}',
   't === "activity" ? "Actividad" : "Mensajes"',
   'onPress={markAllRead}','markRead(n.id)','openActivity(n)',
   'onRefresh={handleRefresh}','tab === "messages" ? loadConvos() : Promise.resolve()',
   'usePrivateInbox(user?.id)','useGroupInbox(user?.id,groupRevision)',
   'onLongPress={options}','hideConversation(menu.convo.id)',
   'inbox_clear_boundary','clear_own_inbox',
   'pathname:"/chat-group",params:{groupId:g.id}',
   'onPress={goToChat}','minHeight:90',
   'height: 2, width: 97, backgroundColor: "#25F4EE"',
 ];
 for(const str of tokens)assert.ok(inbox.includes(str),"Protected Inbox behavior changed: "+str);
 // B9: use a native Android gesture trigger, with an INVISIBLE native circle.
 // The original TOKVID spinner remains separately under the fixed header.
 assert.equal((inbox.match(/<PullRefreshUnderHeader scrollOffsetRef=\{refreshScrollOffset\}/g)||[]).length,1);
 assert.equal((inbox.match(/<RefreshControl refreshing=\{refreshing\} onRefresh=\{handleRefresh\}/g)||[]).length,2);
});
test("B2 Inbox TSX transpiles cleanly",()=>{
 const out=ts.transpileModule(inbox,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert.deepEqual(out.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>String(d.messageText)),[]);
});
