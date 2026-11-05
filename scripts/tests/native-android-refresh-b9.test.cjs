const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const profile=read("app/(tabs)/profile.tsx");
const inbox=read("app/(tabs)/inbox.tsx");
const empty=read("components/RefreshableInboxEmpty.tsx");
const pull=read("components/PullRefreshUnderHeader.tsx");

test("Android lists use one gesture controller and keep the original refresh circles",()=>{
  assert.ok(profile.includes('components/OwnProfileMagneticRefresh'));
  for(const code of [profile,inbox,empty])assert.ok(!code.includes('refreshControl='));
  assert.equal((inbox.match(/<ResistantScrollView onRefresh=\{handleRefresh\}/g)||[]).length,2);
  assert.ok(empty.includes('<ResistantScrollView'));
  const native=read('components/ResistantRefresh.tsx');
  assert.ok(native.includes('refreshControl={undefined}'));
  assert.ok(native.includes('Gesture.Exclusive(pull, nativeScroll)'));
  assert.ok(native.includes('<ActivityIndicator size="small" color={color}/>'));
});

test("B9 empty Inbox refresh works without rows; group inbox refreshes along with private rows",()=>{
  assert.ok(empty.includes('return <ResistantScrollView style={styles.fill} contentContainerStyle={styles.content}'));
  assert.ok(empty.includes('content:{flexGrow:1}'));
  assert.ok(inbox.includes('if(tab==="messages")setGroupRevision(current=>current+1);'));
  assert.ok(inbox.includes("tab === \"messages\" ? loadConvos() : Promise.resolve()"));
  assert.ok(inbox.includes("if(refreshGuard.current)return;"));
});

test("B9 preserve six-tab geometry, swipe and pinned header; none of the code changes target Feed or chat",()=>{
  assert.ok(profile.includes('width:width/6,flex:0'));
  assert.ok(profile.includes('tabBar:{backgroundColor:v.white,flexDirection:"row",width:"100%",height:39}'));
  assert.ok(profile.includes('stickyHeaderIndices={[1]}'));
  assert.ok(inbox.includes('styles.swipeContent}'));
  assert.ok(inbox.includes('onPress={() => selectTab(t)}'));
  assert.ok(!profile.includes("ProfileTabBar"));
  for(const code of [profile,inbox,empty,pull]){
    const out=ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
    assert.deepEqual(out.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>String(d.messageText)),[]);
  }
});
