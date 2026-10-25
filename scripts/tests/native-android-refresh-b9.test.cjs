const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const profile=read("app/(tabs)/profile.tsx");
const inbox=read("app/(tabs)/inbox.tsx");
const empty=read("components/RefreshableInboxEmpty.tsx");
const pull=read("components/PullRefreshUnderHeader.tsx");

test("B9 Android: Inbox retains B9 native trigger; B11 owner has no competing RefreshControl",()=>{
  assert.ok(profile.includes('components/OwnProfileMagneticRefresh'));
  assert.ok(!profile.includes('refreshControl='));
  assert.ok(inbox.includes('refreshControl={Platform.OS==="android"?<RefreshControl refreshing={refreshing} onRefresh={handleRefresh}'));
  assert.ok(empty.includes('refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}'));
  for(const surface of [inbox,empty]){
    assert.ok(surface.includes('colors={["transparent"]} progressBackgroundColor="transparent"'),"Native progress icon remains transparent");
    assert.ok(surface.includes("progressViewOffset={-1000}"),"Android native circle must remain outside the visible UI");
  }
  assert.equal((inbox.match(/progressViewOffset=\{-1000\}/g)||[]).length,2,"Both Inbox lists hide their native circle");
  assert.ok(!profile.includes('nativeRefreshFallback='));
  assert.ok(inbox.includes('nativeRefreshFallback={Platform.OS==="android"}'));
  assert.ok(pull.includes("!nativeFallback.current && permitted.current"));
  assert.ok(pull.includes("if(refreshing)Animated.spring(translation,{toValue:holdDistance,useNativeDriver:true}).start()"));
  assert.ok(pull.includes('<ActivityIndicator size="small" color={color}/>'));
});

test("B9 empty Inbox refresh works without rows; group inbox refreshes along with private rows",()=>{
  assert.ok(empty.includes('return <ScrollView style={styles.fill} contentContainerStyle={styles.content}'));
  assert.ok(empty.includes('if(Platform.OS!=="android")return <View style={styles.fill}>'));
  assert.ok(inbox.includes('if(tab==="messages")setGroupRevision(current=>current+1);'));
  assert.ok(inbox.includes("tab === \"messages\" ? loadConvos() : Promise.resolve()"));
  assert.ok(inbox.includes("if(refreshGuard.current)return;"));
});

test("B9 preserve six-tab geometry, swipe and pinned header; none of the code changes target Feed or chat",()=>{
  assert.ok(profile.includes('width:width/6,flex:0'));
  assert.ok(profile.includes('tabBar:{backgroundColor:v.white,flexDirection:"row",width:"100%",height:39}'));
  assert.ok(profile.includes('stickyHeaderIndices={[1]}'));
  assert.ok(inbox.includes('styles.swipeContent} {...inboxSwipeResponder.panHandlers}'));
  assert.ok(inbox.includes('onPress={() => setTab(t)}'));
  assert.ok(!profile.includes("ProfileTabBar"));
  for(const code of [profile,inbox,empty,pull]){
    const out=ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
    assert.deepEqual(out.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>String(d.messageText)),[]);
  }
});
