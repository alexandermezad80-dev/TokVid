const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile");
const source=fs.readFileSync(path.join(root,"hooks/useSavedVideos.ts"),"utf8");
const feed=fs.readFileSync(path.join(root,"hooks/useVideoFeed.ts"),"utf8");
const profile=fs.readFileSync(path.join(root,"app/(tabs)/profile.tsx"),"utf8");
const other=fs.readFileSync(path.join(root,"app/user-profile.tsx"),"utf8");

function resolver(lookup){
  const mod={};
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const fake={from(table){
    assert.equal(table,"videos");
    return {select(columns){assert.equal(columns,"*");return {in(key,ids){assert.equal(key,"id");return lookup(Array.from(ids));}};}};
  }};
  vm.runInNewContext(compiled,{exports:mod,require(name){
    if(name==="react")return {};
    if(name==="../lib/supabase")return {supabase:fake};
    if(name==="./useVideoFeed")return {BASE_VIDEOS:[{id:"1",isReal:false},{id:"2",isReal:false}],mapRowsToVideoItems:async rows=>rows.map(r=>({id:r.id,isReal:true}))};
    if(name.includes("RegistrationContext"))return {};
    if(name.includes("registrationBridge"))return {};
    if(name==="expo-router")return {};
    throw Error("Unexpected dependency "+name);
  }});
  return mod.resolveSavedVideos;
}
test("D: placeholder favorites stay local to resolution without querying videos table",async()=>{
 const read=resolver(()=>{throw Error("No database lookup for placeholder");});
 const found=await read(new Set(["1"]));
 assert.equal(found.length,1);assert.equal(found[0].id,"1");assert.equal(found[0].isFollowing,false);
});
test("D: real saved videos resolve from genuine Supabase rows",async()=>{
 const read=resolver(ids=>({data:[{id:ids[0]}],error:null}));
 const found=await read(new Set(["real-uuid"]));
 assert.equal(found.length,1);assert.equal(found[0].id,"real-uuid");assert.equal(found[0].isReal,true);
});
test("D: a failed saved publication lookup rejects rather than silently deleting the displayed list",async()=>{
 const read=resolver(()=>({data:null,error:{message:"network failure"}}));
 await assert.rejects(read(new Set(["real-uuid"])),/network failure/);
});
test("D: profile refresh keeps server-backed counts and real sources with original sticky",()=>{
 for(const snippet of [
  "connections.refresh()","publications.refresh()","if(tab===\"saved\")tasks.push(refreshSaved())",
  "if(tab===\"liked\")tasks.push(refreshLikes())","if(tab===\"shared\")tasks.push(shared.refresh())",
  "if(tab===\"drafts\")tasks.push(drafts.refresh())","stickyHeaderIndices={[1]}",
  "const likes = profile?.likes_count ?? 0;","const followers = profile?.followers_count ?? 0;",
 ])assert.ok(profile.includes(snippet),"Missing original behavior "+snippet);
 for(const snippet of ["fetchProfile(false)","publications.refresh()","readProfileVisibility(userId)","readProfileActivity(userId,tab,0)","stickyHeaderIndices={[1]}"]){
  assert.ok(other.includes(snippet));
 }
});
test("D: saving guards concurrent taps, discards stale reads and rolls back lookup/write failures",()=>{
 for(const snippet of [
  "if (mutationInFlight.current) return;",
  "request = ++requestSequence.current;",
  "if (writeError) throw writeError;",
  "setSavedIds(originalIds);",
  "setSavedVideos(originalVideos);",
  'setError("No se pudo guardar el favorito.',
  "if (listError) throw listError;",
  "if (request !== requestSequence.current) return;",
  "void loadSaved().catch(() => {});",
 ])assert.ok(source.includes(snippet),"Missing failure protection: "+snippet);
 assert.ok(feed.includes('id: "1"')&&feed.includes('isReal: false'));
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert.deepEqual(output.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).map(x=>String(x.messageText)),[]);
});
