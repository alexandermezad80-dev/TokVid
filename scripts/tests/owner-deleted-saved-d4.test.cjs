const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile");
const saved=fs.readFileSync(path.join(root,"hooks/useSavedVideos.ts"),"utf8");
const savedPlayer=fs.readFileSync(path.join(root,"app/saved-feed.tsx"),"utf8");
const likes=fs.readFileSync(path.join(root,"lib/features/profile/visibility.ts"),"utf8");
const shared=fs.readFileSync(path.join(root,"hooks/useMySharedVideos.ts"),"utf8");
const direct=fs.readFileSync(path.join(root,"app/publication.tsx"),"utf8");
const compiled=ts.transpileModule(saved,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function run(lookup){
 const exp={};
 const supabase={from(table){assert.equal(table,"videos");return {select(fields){assert.equal(fields,"*");return {in(key,ids){assert.equal(key,"id");return lookup(Array.from(ids));}};}};}};
 vm.runInNewContext(compiled,{exports:exp,require(name){
   if(name==="react"||name==="expo-router"||name.includes("RegistrationContext")||name.includes("registrationBridge"))return {};
   if(name==="../lib/supabase")return {supabase};
   if(name==="./useVideoFeed")return {BASE_VIDEOS:[{id:"1",isReal:false}],mapRowsToVideoItems:async rows=>rows.map(row=>({id:row.id,isReal:true}))};
   throw Error("Unexpected "+name);
 }});
 return exp;
}
test("D4 confirmed deleted videos are absent from both thumbnail list and active bookmark IDs",async()=>{
 const mod=run(async()=>({data:[{id:"present"}],error:null}));
 const visible=await mod.resolveSavedVideos(new Set(["deleted","present","1"]));
 assert.deepEqual(Array.from(visible,v=>v.id).sort(),["1","present"]);
 assert.deepEqual(Array.from(mod.visibleSavedIds(visible)).sort(),["1","present"]);
 assert.match(saved,/setSavedIds\(visibleSavedIds\(resolved\)\)/);
 assert.ok(!saved.includes("setSavedIds(ids);"));
});
test("D4 failed network lookup cannot silently treat video as deleted",async()=>{
 const mod=run(async()=>({data:null,error:{message:"disconnected"}}));
 await assert.rejects(mod.resolveSavedVideos(new Set(["present"])),error=>error.message==="disconnected");
 assert.match(saved,/if \(error\) throw error;/);
 assert.match(saved,/Preserve the last confirmed list on a failed read/);
});
test("D4 prevents saving an inaccessible video, never writes an invented favorite",()=>{
 const check=saved.indexOf('if (!alreadySaved && !resolved.some(item => item.id === videoId))');
 const write=saved.indexOf('.from("saved_videos").insert(');
 assert.ok(check>0&&write>check);
 assert.match(saved,/throw new Error\("SAVED_VIDEO_UNAVAILABLE"\)/);
 assert.match(saved,/setSavedIds\(originalIds\)/);
 assert.match(saved,/setSavedVideos\(originalVideos\)/);
 assert.match(saved,/setError\("Este video ya no está disponible\."\)/);
});
test("D4 saved player, historical likes, shares and direct links still distinguish network error",()=>{
 assert.match(savedPlayer,/if\(savedError\)/);
 assert.match(savedPlayer,/if\(requestedId&&selectedIndex<0\)/);
 assert.match(savedPlayer,/Este video ya no está disponible en tus Guardados/);
 assert.match(likes,/if\(result\.error\)throw new Error/);
 assert.match(likes,/items:ids\.map\(/);
 assert.match(shared,/readProfileActivity\(userId,"shared",start\)/);
 assert.match(direct,/if \(!data\) \{ if \(active\) setError\("Esta publicación ya no está disponible\."\)/);
 assert.ok(!saved.includes('.from("saved_videos").delete().in('));
});
test("D4 TypeScript unchanged APIs and no new migration, Feed or login code",()=>{
 const output=ts.transpileModule(saved,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert.deepEqual(output.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).map(x=>String(x.messageText)),[]);
 assert.match(saved,/return \{ savedIds, savedVideos, toggleSave, loading, error, refresh: loadSaved \}/);
});
