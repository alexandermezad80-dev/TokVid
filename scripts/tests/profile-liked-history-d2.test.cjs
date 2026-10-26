const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript"),vm=require("node:vm");
const root=path.resolve(__dirname,"../../artifacts/mobile");
const hookSource=fs.readFileSync(path.join(root,"hooks/useProfileLikedHistory.ts"),"utf8");
const owner=fs.readFileSync(path.join(root,"app/(tabs)/profile.tsx"),"utf8");
const viewer=fs.readFileSync(path.join(root,"app/liked-feed.tsx"),"utf8");
const context={exports:{},require(name){
 if(name==="react")return {};
 if(name==="expo-router")return {};
 if(name.endsWith("/visibility"))return {readProfileActivity:async()=>({items:[],hasMore:false})};
 throw Error("Unexpected module "+name);
}};
vm.runInNewContext(ts.transpileModule(hookSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
test("D2 liked grid loads actual liked media independent of the Feed's current page",()=>{
 assert.match(hookSource,/readProfileActivity\(userId,"liked",start\)/);
 assert.match(hookSource,/offset.current=start\+PAGE_SIZE/);
 assert.match(owner,/const likedHistory=useProfileLikedHistory\(user\?\.id,tab==="liked"\)/);
 assert.match(viewer,/const likedHistory=useProfileLikedHistory\(user\?\.id,!!user\)/);
 assert.match(owner,/likedHistory\.hasMore && <TouchableOpacity/);
 assert.match(viewer,/likedHistory\.hasMore&&!likedHistory\.loading\)void likedHistory\.loadMore\(\)/);
});
test("D2 preserve old demo likes but never mistake Feed-subset real items for complete liked history",()=>{
 const f=context.exports.mergeLikedProfileItems;
 const merged=f([{id:"real-first",isReal:true},{id:"real-second",isReal:true}],
   [{id:"fake",isReal:false},{id:"real-third",isReal:true},{id:"real-first",isReal:true}]);
 assert.deepEqual(Array.from(merged,v=>v.id),["real-first","real-second","fake"]);
});
test("D2 viewer resolves video by immutable ID, never blindly by a possibly stale index",()=>{
 assert.match(owner,/\/liked-feed\?startIndex=\$\{idx\}&videoId=\$\{encodeURIComponent\(v.id\)\}/);
 assert.match(viewer,/likedVideos\.findIndex\(v=>v\.id===requestedId\)/);
 assert.match(viewer,/if\(requestedId&&found<0&&likedHistory\.hasMore\)/);
 assert.match(viewer,/if\(requestedId&&found<0\)\{setResolvedStart\(-1\);return;\}/);
 assert.match(viewer,/initialScrollIndex=\{resolvedStart\}/);
 assert.match(viewer,/if\(resolvedStart===null\)/);
 assert.match(viewer,/if\(resolvedStart<0\)/);
 assert.match(viewer,/if\(resolvedStart===-2\)/);
 assert.match(viewer,/if\(likedHistory\.error&&found<0/);
 assert.match(viewer,/onPress=\{\(\)=>\{setResolvedStart\(null\);void likedHistory\.refresh\(\);\}\}/);
 assert.match(owner,/likedHistory\.error && likedVideos\.length===0/);
 assert.match(owner,/onPress=\{\(\)=>void likedHistory\.refresh\(\)\}/);
});
test("D2 no Feed, avatar, thumbnail, saved, story, sticky or registration behavior changed",()=>{
 for(const token of ['tileWidth=Math.max(1,(Math.floor(width)-8)/3)','stickyHeaderIndices={[1]}','width:width/6,flex:0','if(tab==="saved")tasks.push(refreshSaved())','onPress={()=>selectTab(item.key)}','onPress={()=>router.push("/story-create")}']){
  assert.ok(owner.includes(token),"Protected owner token changed: "+token);
 }
 assert.match(viewer,/onSave=\{\(\) => toggleSave\(item.id\)\}/);
 assert.match(viewer,/onComment=\{\(\) => setCommentVideo\(item\)\}/);
 assert.match(viewer,/onShare=\{\(\) => handleShare\(item\)\}/);
 assert.match(viewer,/onAvatarPress=\{\(\) => router.push\(/);
});
test("D2 own grid, viewer and shared hook still transpile",()=>{
 for(const source of [owner,viewer,hookSource]){
  const result=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.deepEqual(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>String(d.messageText)),[]);
 }
});
