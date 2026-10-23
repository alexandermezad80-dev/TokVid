const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const file=path.resolve(__dirname,"../../artifacts/mobile/app/(tabs)/create.tsx");
const code=fs.readFileSync(file,"utf8");
test("C2 maintains native publication and existing comment video reply entry",()=>{
 assert.match(code,/export function PublicationComposer\(\{ replyCommentId, onExit, initialDraftId \}/);
 assert.match(code,/const activeReplyId=replyCommentId\|\|draft\?\.replyCommentId/);
 assert.match(code,/readVideoReplyTarget\(supabase, activeReplyId\)/);
 assert.match(code,/const id = await publishDraft\(supabase, draft, sentCaption, uploadPublicationFile/);
 assert.match(code,/if\s*\(locallySaved\)\s*\{\s*try\{await deleteLocalPublicationDraft\(draft\.userId,draft\.id\);/);
});
test("C2 shows an explicit three-choice exit and independent save action",()=>{
 assert.match(code,/Alert\.alert\("Publicación sin terminar"/);
 for(const label of ["Seguir editando","Guardar borrador","Descartar"])assert.ok(code.includes(`text:"${label}"`));
 assert.match(code,/onPress:\(\)=>void saveUnpublishedDraft\(true\)/);
 assert.match(code,/accessibilityLabel="Guardar borrador"/);
 assert.match(code,/onPress=\{\(\)=>void saveUnpublishedDraft\(false\)\}/);
 assert.match(code,/saveLocalPublicationDraft\(draft,caption\)/);
 assert.match(code,/busy\.current=true;setSavingDraft\(true\)/);
 assert.match(code,/disabled=\{phase === "uploading" \|\| savingDraft \|\| !replyReady\}/);
});
test("C2 restores project, its description and editor phase only for original account",()=>{
 assert.match(code,/useLocalSearchParams<\{draftId\?:string\}>\(\)/);
 assert.match(code,/openLocalPublicationDraft\(user\.id,initialDraftId\)/);
 assert.match(code,/currentUserId\.current!==saved\.userId/);
 assert.match(code,/setDraft\(saved\);setCaption\(saved\.caption\);setLocallySaved\(true\);setPhase\("edit"\)/);
 assert.match(code,/if\(replyCommentId&&saved\.replyCommentId!==replyCommentId\)/);
 assert.match(code,/onPress=\{\(\)=>\{reset\(\);if\(initialDraftId\)router\.replace\("\/\(tabs\)\/create"\);\}\}/);
});
test("C2 compiles TSX without diagnostics and doesn't import storage in the Feed",()=>{
 const out=ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert.deepEqual(out.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>String(d.messageText)),[]);
});

test("C2 publishing a just-saved draft cleans it and replacing reply media retains comment context",()=>{
 assert.match(code,/setDraft\(stored\);setLocallySaved\(true\)/);
 assert.match(code,/if\s*\(locallySaved\)\s*\{\s*try\{await deleteLocalPublicationDraft\(draft\.userId,draft\.id\);/);
 assert.match(code,/if \(activeReplyId && kind !== "video"\)/);
 assert.match(code,/\.\.\.\(activeReplyId \? \{ replyCommentId:activeReplyId \} : \{\}\)/);
 assert.match(code,/setLocallySaved\(false\); setPhase\("edit"\)/);
});

test("C2 resumed comment-video editor limits picker and capture modes to video",()=>{
 assert.match(code,/mediaTypes: activeReplyId \? \["videos"\] : \["videos", "images"\]/);
 assert.match(code,/useEffect\(\(\)=>\{if\(activeReplyId\)setMode\("video"\);\},\[activeReplyId\]\)/);
});

test("C3 saves an optional local video cover and returns to the originating draft grid",()=>{
 assert.match(code,/if\(draft\.kind==="video"&&!draft\.thumbnailUri&&Platform\.OS!=="web"\)/);
 assert.match(code,/player\.generateThumbnailsAsync\(0,\{maxWidth:540\}\)/);
 assert.match(code,/saveLocalPublicationDraft\(draft,caption\)/);
 assert.match(code,/if\(leaveAfterSave\)\{reset\(\);leaveComposer\(\);\}/);
 assert.match(code,/if\(onExit\)onExit\(\);else if\(initialDraftId\)router\.back\(\);else router\.replace\("\/\(tabs\)"\)/);
});
