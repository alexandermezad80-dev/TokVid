const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../../artifacts/mobile");
const visitor=fs.readFileSync(path.join(root,"app/user-profile.tsx"),"utf8");
const footer=fs.readFileSync(path.join(root,"components/ProfileTabBar.tsx"),"utf8");
const own=fs.readFileSync(path.join(root,"app/(tabs)/profile.tsx"),"utf8");
test("APK261 visitor: original identity/header/chat/follow/stats/privacy and sticky untouched",()=>{
 for(const item of [
   "readProfileVisibility(userId)",
   "readProfileActivity(userId,tab,activityOffset)",
   "visibility.show_likes?['liked']:[]",
   "visibility.show_shares?['shared']:[]",
   "stickyHeaderIndices={[1]}",
   "height:39",
   "openPrivateConversation(userId)",
   "<FollowButton userId={profile.id}/>",
   "record_profile_visit",
   "<ProfileTabBar/>",
   "<ProfilePullRefresh scrollOffsetRef={scrollOffsetRef} refreshing={refreshing} onRefresh={onRefresh}>",
   "onPress={()=>router.back()}",
   "onPress={()=>connections('followers')}",
   "onPress={()=>connections('following')}",
 ])assert.ok(visitor.includes(item),"Protected visitor contract changed: "+item);
});
test("APK261 visitor: approved Tokvid Videos/Compartidos vectors and no fake private tabs",()=>{
 assert.ok(visitor.includes('import TokvidProfileIcon from "../components/TokvidProfileIcon";'));
 assert.ok(visitor.includes("style={[styles.tabItem,{width:width/3,flex:0},tab===t&&styles.tabItemActive]}"));
 assert.ok(visitor.includes('t==="videos"||t==="shared"?<TokvidProfileIcon name={t} size={22} color={tab===t?v.ink:v.inactive}/>'));
 assert.ok(visitor.includes('<Feather name="heart" size={22} color={tab===t?v.ink:v.inactive}/>'));
 assert.ok(!visitor.includes("width:width/shownTabs.length"));
 assert.ok(!visitor.includes("setVisibility({show_likes:true,show_shares:true})"));
 assert.ok(!visitor.includes("key:'drafts'"));
 assert.ok(own.includes('width:width/6,flex:0'));
});
test("APK261 visitor: Crear is lifted only vertically to match approved tab bar screenshot, routes and gradients preserved",()=>{
 assert.ok(footer.includes('transform: [{translateY:-5}]'));
 for(const item of [
   'width: 49, height: 30, borderRadius: 9, padding: 1, overflow: "hidden", marginBottom: 4',
   '<LinearGradient colors={v.outline}',
   '<LinearGradient colors={v.createFill}',
   '<Feather name="plus" size={24} color="#FFFFFF"/>',
   '<View style={{ height: 50, flexDirection: "row", borderTopWidth: 1',
   'paddingBottom: insets.bottom',
   '["Crear", "plus", "/(tabs)/create"]',
   'onPress={() => router.dismissTo(route)}',
 ])assert.ok(footer.includes(item),"Protected Create control changed: "+item);
 const matches=footer.match(/transform:\s*\[\{translateY:-5\}\]/g)||[];
 assert.equal(matches.length,1);
});
