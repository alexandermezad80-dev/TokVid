const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile");
const direct=fs.readFileSync(path.join(root,"app/publication.tsx"),"utf8");
const saved=fs.readFileSync(path.join(root,"app/saved-feed.tsx"),"utf8");
const likes=fs.readFileSync(path.join(root,"hooks/useProfileLikedHistory.ts"),"utf8");
const shared=fs.readFileSync(path.join(root,"hooks/useMySharedVideos.ts"),"utf8");
const hook=fs.readFileSync(path.join(root,"hooks/useSavedVideos.ts"),"utf8");
test("D5 direct publication revalidates on refocus as well as Retry, not just initial mount",()=>{
 assert.match(direct,/useFocusEffect\(useCallback\(\(\) => \{\s*let active = true; setItem\(null\); setLoading\(true\); setError\(""\); closeComments\(\);/);
 assert.match(direct,/\}, \[id, retry, closeComments\]\)\);/);
 assert.match(direct,/return \(\) => \{ active = false; \};/);
 assert.equal((direct.match(/supabase.from\("videos"\).select\("\*"\).eq\("id", id\).maybeSingle\(\)/g)||[]).length,1);
});
test("D5 direct successful-not-found shows unavailable; a failed query reports network error",()=>{
 assert.match(direct,/if \(failure\) throw failure;/);
 assert.match(direct,/if \(!data\) \{ if \(active\) setError\("Esta publicación ya no está disponible\."\); return; \}/);
 assert.match(direct,/catch \{ if \(active\) setError\("No pudimos cargar la publicación\."\); \}/);
 assert.match(direct,/if \(active\) setItem\(video\)/);
 assert.match(direct,/onPress=\{\(\) => setRetry\(value => value \+ 1\)\}/);
});
test("D5 return to saved player refreshes before applying immutable ID selection",()=>{
 assert.match(saved,/useFocusEffect\(useCallback\(\(\)=>\{void refreshSaved\(\)\.catch\(\(\)=>\{\}\);\},\[refreshSaved\]\)\)/);
 assert.match(saved,/savedVideoStartIndex\(savedVideos,requestedId,startIndex\)/);
 assert.match(saved,/if\(savedLoading\)/);
 assert.match(saved,/if\(savedError\)/);
 assert.match(saved,/if\(requestedId&&selectedIndex<0\)/);
 assert.ok(saved.indexOf("if(savedError)")<saved.indexOf("if(requestedId&&selectedIndex<0)"));
 assert.match(saved,/Este video ya no está disponible en tus Guardados/);
});
test("D5 existing liked and shared history refresh on focus; failed reads are not deletions",()=>{
 for(const source of [likes,shared]){
  assert.match(source,/useFocusEffect\(useCallback/);
  assert.match(source,/readProfileActivity\(userId,"(?:liked|shared)",start\)/);
  assert.match(source,/setError\("No se pudieron cargar/);
 }
 assert.match(hook,/if \(error\) throw error; \/\/ An unavailable lookup is not an empty saved list/);
 assert.match(hook,/Preserve the last confirmed list on a failed read/);
});
test("D5 no player, Feed, Auth or visual redesign; published and saved TSX transpile",()=>{
 for(const snippet of ['onLike={() => signedAction(() => void likes.toggleLike(item.id))}', 'onSave={() => signedAction(() => void toggleSave(item.id))}', 'onDelete={remove}', '<CommentsSheet', 'router.back()'])assert.ok(direct.includes(snippet),snippet);
 for(const snippet of ['snapToInterval={SCREEN_HEIGHT}','onLike={() => toggleLike(item.id)}','onSave={() => toggleSave(item.id)}','onComment={() => setCommentVideo(item)}','onShare={() => handleShare(item)}'])assert.ok(saved.includes(snippet),snippet);
 for(const source of [direct,saved]){
  const r=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.deepEqual(r.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>String(d.messageText)),[]);
 }
});
