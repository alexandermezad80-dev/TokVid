const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile");
const logic=fs.readFileSync(path.join(root,"lib/features/profile/savedVideoSelection.ts"),"utf8");
const viewer=fs.readFileSync(path.join(root,"app/saved-feed.tsx"),"utf8");
const owner=fs.readFileSync(path.join(root,"app/(tabs)/profile.tsx"),"utf8");
const savedHook=fs.readFileSync(path.join(root,"hooks/useSavedVideos.ts"),"utf8");
const shared=fs.readFileSync(path.join(root,"hooks/useMySharedVideos.ts"),"utf8");
const visibility=fs.readFileSync(path.join(root,"lib/features/profile/visibility.ts"),"utf8");
const published=fs.readFileSync(path.join(root,"app/publication.tsx"),"utf8");
const exportsObj={};
vm.runInNewContext(ts.transpileModule(logic,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsObj});

test("Owner removal: saved entry's original ID resolves even after another saved item was removed",()=>{
 const pick=exportsObj.savedVideoStartIndex;
 const before=[{id:"a"},{id:"b"},{id:"c"}];
 assert.equal(pick(before,"c",2),2);
 assert.equal(pick([{id:"b"},{id:"c"}],"c",2),1);
 assert.equal(pick([{id:"b"}],"c",2),-1);
 assert.equal(pick([{id:"b"}],undefined,55),0);
 assert.equal(pick([],undefined,0),-1);
 assert.equal(pick([{id:"b"}],undefined,NaN),0);
});

test("Saved grid opens by ID; refreshed unavailable media never opens a neighboring video",()=>{
 assert.match(owner,/\/saved-feed\?startIndex=\$\{idx\}&videoId=\$\{encodeURIComponent\(v.id\)\}/);
 assert.match(viewer,/savedVideoStartIndex\(savedVideos,requestedId,startIndex\)/);
 assert.match(viewer,/if\(requestedId&&selectedIndex<0\)/);
 assert.match(viewer,/initialScrollIndex=\{Math.max\(0,selectedIndex\)\}/);
 assert.match(viewer,/isActive=\{index === visibleIndex\}/);
 assert.match(viewer,/Este video ya no está disponible en tus Guardados/);
 assert.match(owner,/useFocusEffect\(useCallback\(\(\)=>\{\s*if\(tab==="saved"&&user\?\.id\)void refreshSaved/);
});

test("Outage must not be mislabeled deletion; refresh is read-only with retry",()=>{
 assert.ok(viewer.indexOf("if(savedError)")<viewer.indexOf("if(requestedId&&selectedIndex<0)"));
 assert.match(viewer,/No pudimos comprobar tus Guardados/);
 assert.match(viewer,/onPress=\{\(\)=>void refreshSaved\(\)\.catch\(\(\)=>\{\}\)\}/);
 assert.match(savedHook,/if \(error\) throw error; \/\/ An unavailable lookup is not an empty saved list/);
 assert.match(savedHook,/Preserve the last confirmed list on a failed read/);
 assert.ok(!logic.includes("supabase"));
 assert.ok(!viewer.includes('from("saved_videos").delete()'));
});

test("Related history is visibility-filtered and direct publication presents unavailable state",()=>{
 assert.match(shared,/readProfileActivity\(userId,"shared",start\)/);
 assert.match(visibility,/const result=await supabase.from\('videos'\).select\('\*'\).in\('id',ids\)/);
 assert.match(visibility,/items:ids.map\(\(id:string\)=>items.find\(v=>v.id===id\)\).filter/);
 assert.match(published,/if \(!data\) \{ if \(active\) setError\("Esta publicación ya no está disponible\."\)/);
});

test("Saved player layout, tools and playback actions stay unchanged",()=>{
 for(const source of [viewer,owner,logic]){
  const out=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.deepEqual(out.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>String(d.messageText)),[]);
 }
 for(const token of [
  'snapToInterval={SCREEN_HEIGHT}',
  'onLike={() => toggleLike(item.id)}',
  'onComment={() => setCommentVideo(item)}',
  'onSave={() => toggleSave(item.id)}',
  'onShare={() => handleShare(item)}',
  '<CommentsSheet',
 ])assert.ok(viewer.includes(token),"Approved saved player behavior changed: "+token);
 for(const token of ['stickyHeaderIndices={[1]}','width:width/6,flex:0','tileWidth=Math.max(1,(Math.floor(width)-8)/3)'])assert.ok(owner.includes(token));
});
