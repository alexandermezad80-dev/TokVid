const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");

const repo=path.resolve(__dirname,"../..");
const mobile=path.join(repo,"artifacts/mobile");

/**
 * Current audited branch baseline accompanying the user's physical APK 261
 * screenshots. DO NOT change these values for an unrelated feature.
 * An authorized change must declare its scope and new baseline explicitly.
 */
const pinnedGitBlobs={
  ".github/workflows/android-apk.yml": "47a8f04f94230a8d1dbfe078330c3ff89483d024",
  ".github/workflows/check-chat-phase.yml": "77f10f678544f5fa77a4e74c54926af98820ce12",
  "artifacts/mobile/app/(tabs)/index.tsx": "b3184969ec2bd86f5cb134150fae0341c3d6ebe7",
  "artifacts/mobile/app/(tabs)/_layout.tsx": "aa492afd76c9d849215fd5d34ef6912557961784",
  "artifacts/mobile/components/VideoCard.tsx": "1e4fc21642fc090bda291c9b71fc56a5301ffcc4",
  "artifacts/mobile/components/VideoActions.tsx": "52927affdd58afdb58f2babaeac86e2a2f5aff64",
  "artifacts/mobile/components/VideoInfo.tsx": "da9c00a872c8cb3790b07316ff5506116f532d3f",
  "artifacts/mobile/components/VideoShareSheet.tsx": "dd22324b26d03fda7e54a85d490233706f4fcc76",
  "artifacts/mobile/components/ProfilePullRefresh.tsx": "74b47601c2762a1ee0591f54506d05bd8a326fbd",
  "artifacts/mobile/components/ProfileTabBar.tsx": "32e73cd0e8ccd4aeaf6a18e2e479b348c909fe9b",
  "artifacts/mobile/components/TokvidProfileIcon.tsx": "09e6ba4b3dccb74a2d2281eb22cdc6073f7b60d2",
  "artifacts/mobile/components/PublicationThumbnail.tsx": "721842d028d757dee830076dd2d4ba71592ec61b",
  "artifacts/mobile/components/reference/BrandAvatar.tsx": "5ba2665abed37a47ca6f82e9f772fe8402ee859a",
  "artifacts/mobile/components/reference/BrandOutline.tsx": "24d60c884b81d36bcbcdf6fb1c43e2b6349c8679",
  "artifacts/mobile/components/reference/HeaderSurface.tsx": "7f30157d3f9eebcefd48aa48cdf713f6ff5c51b9",
  "artifacts/mobile/components/reference/ReferenceHeader.tsx": "94c0439cfaf87e508c5f81855f882e157ece169c",
  "artifacts/mobile/constants/palette.ts": "ce6fa039cca4f8c5ef8101c4af227e4571b986f2",
  "artifacts/mobile/constants/referenceVisual.ts": "60172ba808656797b403dc745ae09c1262d44793"
};
function gitBlobSha(content){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+content.length+"\0"))
    .update(content).digest("hex");
}
function readMobile(relative){return fs.readFileSync(path.join(mobile,relative),"utf8");}
function requireTokens(source,tokens,label){
  for(const token of tokens)assert.ok(source.includes(token),label+" must preserve: "+token);
}

test("APK261 isolation: never silently change the approved Feed, tab bar, TOKVID branding or Codex workflows",()=>{
  for(const [relative,expected] of Object.entries(pinnedGitBlobs)){
    const buffer=fs.readFileSync(path.join(repo,relative));
    assert.equal(gitBlobSha(buffer),expected,"Protected file changed without approval: "+relative);
  }
});

test("APK261 own profile: preserve sticky, six slots, grid geometry, upper routes and header buttons",()=>{
  const source=readMobile("app/(tabs)/profile.tsx");
  requireTokens(source,[
    'stickyHeaderIndices={[1]}',
    'tileWidth=Math.max(1,(Math.floor(width)-8)/3)',
    'width:width/6,flex:0',
    'stickySlot:{width:"100%",height:39',
    'tabBar:{backgroundColor:v.white,flexDirection:"row",width:"100%",height:39}',
    'filtersPinned&&<>',
    'onPress={()=>router.push("/user-tools")}',
    'onPress={()=>router.push("/edit-profile")}',
    'onPress={()=>router.push({pathname:"/story-viewer",params:{userId:user.id}})}',
    'onPress={()=>router.push("/story-create")}',
    '{key:"shared",icon:"share-2",label:"Compartidos"}',
    '{key:"drafts",icon:"file-text",label:"Borradores"}',
    'onPress={()=>setTab(item.key)}',
  ],"owner profile");
  const slotNames=['Videos','Historias','Compartidos','Me gusta','Guardados','Borradores'];
  for(const name of slotNames)assert.ok(source.includes('label:"'+name+'"'),"Missing approved section "+name);
});

test("APK261 Inbox isolation: preserve existing tab taps, marks, vertical refresh and message actions while adding new gesture separately",()=>{
  const source=readMobile("app/(tabs)/inbox.tsx");
  requireTokens(source,[
    'const [tab, setTab] = useState<"activity" | "messages">("activity")',
    'if(params.tab==="messages"||params.tab==="activity")setTab(params.tab)',
    'onPress={() => setTab(t)}',
    't === "activity" ? "Actividad" : "Mensajes"',
    'onPress={markAllRead}',
    'markRead(n.id)',
    'openActivity(n)',
    'onRefresh={handleRefresh}',
    'tab === "messages" ? loadConvos() : Promise.resolve()',
    'usePrivateInbox(user?.id)',
    'useGroupInbox(user?.id,groupRevision)',
    'onLongPress={options}',
    'hideConversation(menu.convo.id)',
    'inbox_clear_boundary',
    'clear_own_inbox',
    'pathname:"/chat-group",params:{groupId:g.id}',
    'onPress={goToChat}',
    'minHeight:90',
    'tabIndicator: {',
    'height: 2, width: 97, backgroundColor: "#25F4EE"',
  ],"Inbox");
});

test("Isolation remains tests/docs only; feature code is the same as before the baseline checkpoint",()=>{
  const source=readMobile("app/(tabs)/profile.tsx");
  assert.ok(source.includes("<ProfilePullRefresh scrollOffsetRef={scrollOffsetRef} refreshing={refreshing} onRefresh={onRefresh}>"));
  assert.ok(source.includes("<View {...tabSwipeResponder.panHandlers}>"));
  assert.ok(source.includes("onMoveShouldSetPanResponder:(_event,g)=>isOwnProfileHorizontalMove(g.dx,g.dy)"));
  assert.ok(!source.includes("setTab('more')"));
});
