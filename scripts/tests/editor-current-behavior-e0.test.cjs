const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile");
const composer=fs.readFileSync(path.join(root,"app/(tabs)/create.tsx"),"utf8");
const model=fs.readFileSync(path.join(root,"lib/features/publishing/model.ts"),"utf8");
const service=fs.readFileSync(path.join(root,"lib/features/publishing/service.ts"),"utf8");
const local=fs.readFileSync(path.join(root,"lib/features/publishing/localDrafts.ts"),"utf8");
const uploaded=fs.readFileSync(path.join(root,"lib/features/publishing/nativeUpload.ts"),"utf8");
function contains(label,source,strings){
 for(const str of strings)assert.ok(source.includes(str),label+": missing "+str);
}
test("E0 protect capture/pick, preview, caption and existing creation actions",()=>{
 contains("compositor",composer,[
   'type Phase = "pick" | "edit" | "uploading" | "success"',
   'const [mode, setMode] = useState<"video" | "picture">("video")',
   'ImagePicker.launchImageLibraryAsync',
   'allowsEditing: false',
   'videoMaxDuration: 180',
   'camera.current.recordAsync({ maxDuration: 180 })',
   'mode === "video" ? "Grabar video" : "Tomar foto"',
   'player={player}',
   'nativeControls={false}',
   'placeholder="Añade una descripción…"',
   'maxLength={300}',
   'accessibilityLabel="Publicar"',
   'accessibilityLabel="Guardar borrador"',
 ]);
});
test("E0 preserve private local drafts, author isolation and comment reply ownership",()=>{
 contains("drafts",composer,[
   'openLocalPublicationDraft(user.id,initialDraftId)',
   'saveLocalPublicationDraft(draft,caption)',
   'if (activeReplyId && kind !== "video")',
   'replyCommentId||draft?.replyCommentId',
   'if(!user||user.id!==draft.userId)',
   'await deleteLocalPublicationDraft(draft.userId,draft.id)',
   'Guardar borrador',
   'Seguir editando',
   'Descartar',
 ]);
 contains("local storage",local,[
   'expo-file-system/legacy',
   'documentDirectory',
   'tokvid-drafts/v1/',
   'recordKey(userId)',
   'isStoredDraft(value:unknown,userId:string)',
   'MIME_EXTENSIONS',
   'openLocalPublicationDraft',
   'deleteLocalPublicationDraft',
 ]);
});
test("E0 confirm public upload requires explicit Publish and verifiable backend commit",()=>{
 const p=composer.indexOf('const saveUnpublishedDraft=');
 const q=composer.indexOf('const publish=')>=0?composer.indexOf('const publish='):composer.indexOf('const publish =');
 const boundary=composer.indexOf('const exit =')>=0?composer.indexOf('const exit ='):composer.indexOf('const exit=');
 assert.ok(p>0&&q>p&&boundary>q,"Saving and publishing must be separate actions");
 assert.ok(!composer.slice(p,q).includes('publishDraft(supabase'),"Saving alone must never publish");
 contains("service",service,[
   'client.auth.getSession()',
   'if (await findPublished()) return draft.id;',
   'readVideoReplyTarget(client, draft.replyCommentId)',
   'await uploadFile(path, draft.uri, draft.contentType',
   'if (freshSession.session?.user.id !== draft.userId)',
   '.insert({ id: draft.id, user_id: draft.userId,',
   'No se pudo confirmar la publicación.',
 ]);
 contains("upload",uploaded,['uploadAsync','storage']);
});
test("E0 existing media caps protect native selection; no silent editor functionality claims",()=>{
 contains("validation",model,[
  'MAX_VIDEO_BYTES = 250 * 1024 * 1024',
  'MAX_IMAGE_BYTES = 10 * 1024 * 1024',
  '(asset.duration ?? 0) > 180000',
  '"video/mp4": "mp4"',
  '"video/quicktime": "mov"',
  '"image/jpeg": "jpg"',
  '"image/png": "png"',
  '"image/webp": "webp"',
 ]);
 assert.match(model,/export type PublicationDraft = \{ id: string; userId: string; uri: string; kind:/);
 assert.ok(!/\bclip(s)?\s*:\s*|timeline\s*:|audioTrack\s*:|textOverlays\s*:/.test(model),"Multimedia project fields need explicit design + backward compatibility");
});
test("E0 compositor, storage model and publish service transpile without errors",()=>{
 for(const source of [composer,model,service,local]){
  const result=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.deepEqual(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>String(d.messageText)),[]);
 }
});
