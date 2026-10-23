const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const base=path.resolve(__dirname,"../../artifacts/mobile");
const group=fs.readFileSync(path.join(base,"app/chat-group.tsx"),"utf8");
test("B5 group chat refresh under fixed HeaderSurface with scroll at beginning",()=>{
 const header=group.indexOf("<HeaderSurface safeTop"),pull=group.indexOf("<PullRefreshUnderHeader scrollOffsetRef={pullOffset}");
 assert.ok(header>=0&&pull>header);
 assert.ok(group.includes("pullOffset.current=Math.max(0,n.contentOffset.y)"));
 assert.ok(group.includes("refreshAction.current=refresh;void refresh();"));
 assert.ok(group.includes("if(refreshAction.current===refresh)refreshAction.current=null;"));
 assert.ok(group.includes("try{await refreshAction.current();}"));
});
test("B5 preserves message delivery, list updates, composer, header and group membership",()=>{
 for(const str of ["create_chat_group","visible_chat_group_messages","last_read_at","setInterval(()=>void refresh(),15000)","keyboardShouldPersistTaps=\"handled\"","onContentSizeChange={()=>{if(atBottom.current)list.current?.scrollToEnd({animated:false});}}","onPress={send}","onPress={()=>router.back()}","return <KeyboardAvoidingView behavior=\"padding\" style={styles.screen}"])assert.ok(group.includes(str),str);
 assert.ok(!group.includes("RefreshControl"));
 assert.equal((group.match(/<PullRefreshUnderHeader /g)||[]).length,1);
});
test("B5 group screen transpiles as TSX",()=>{
 const v=ts.transpileModule(group,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert.deepEqual(v.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).map(x=>String(x.messageText)),[]);
});
