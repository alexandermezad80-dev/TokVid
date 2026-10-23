const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");

const repo=path.resolve(__dirname,"../..");
const mobile=path.join(repo,"artifacts/mobile");
const read=(relative)=>fs.readFileSync(path.join(repo,relative),"utf8");

// Current audited E2 starting point: no production change is authorized by this test.
// Frozen paths must not be silently modified for an unrelated editor tool.
// If a necessary change is explicitly authorized, audit its diff and tests first,
// then update the baseline and document the new SHA with that authorization.
const frozen={
  "artifacts/mobile/lib/features/publishing/service.ts":"952640c2984ac1c4cf7dba0de03024dead7828f3",
  "artifacts/mobile/lib/features/publishing/nativeUpload.ts":"340e1ccabc76b273d18822b806ef3209a54a7e76",
  "artifacts/mobile/lib/features/publishing/localDrafts.ts":"5dab1dfd853a6b60bd07665c810542fce7099fa2",
  "artifacts/mobile/app/comment-video-reply.tsx":"0f7ac1aacb502b0649feb9d64f0f6f4ca084b554"
};
function gitBlobSha(buffer){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+buffer.length+"\0"))
    .update(buffer).digest("hex");
}
const composer=read("artifacts/mobile/app/(tabs)/create.tsx");
const model=read("artifacts/mobile/lib/features/publishing/model.ts");

test("E2 isolation: publish/upload, private drafts and comment-reply gateway remain byte-for-byte intact",()=>{
  for(const [relative,expected] of Object.entries(frozen)){
    const actual=gitBlobSha(fs.readFileSync(path.join(repo,relative)));
    assert.equal(actual,expected,"Approved editor dependency changed without reviewed exception: "+relative);
  }
});

test("E2 isolation: retain Create capture, gallery, preview, description, actions and reply-video restriction",()=>{
  for(const token of [
    'const [phase, setPhase] = useState<Phase>("pick")',
    'const [mode, setMode] = useState<"video" | "picture">("video")',
    'const player = useVideoPlayer(draft?.kind === "video" ? draft.uri : null',
    'ImagePicker.launchImageLibraryAsync(',
    'videoMaxDuration: 180',
    'camera.current.recordAsync({ maxDuration: 180 })',
    'if (activeReplyId && kind !== "video")',
    '<VideoView player={player}',
    'maxLength={300}',
    'accessibilityLabel="Publicar"',
    'accessibilityLabel="Guardar borrador"',
    'accessibilityLabel="Cerrar creación"',
    'Cambiar archivo'
  ])assert.ok(composer.includes(token),"Approved Create control/path missing: "+token);
  assert.ok(composer.includes("selection.current !== sequence || currentUserId.current !== owner"),
    "Media selection must reject stale or other-account results");
});

test("E2 isolation: saving a draft never uploads and keeps account ownership",()=>{
  const start=composer.indexOf("const saveUnpublishedDraft=async");
  const end=composer.indexOf("const publish = async () => {");
  assert.ok(start>=0&&end>start,"Saving/publishing boundaries must remain separate");
  const saving=composer.slice(start,end);
  assert.ok(saving.includes("saveLocalPublicationDraft(draft,caption)"));
  assert.ok(saving.includes("if(!user||user.id!==draft.userId)"));
  assert.ok(!saving.includes("publishDraft(supabase"),"Saving must not publish");
  assert.ok(!saving.includes("uploadPublicationFile("),"Saving must not upload");
  assert.ok(composer.includes("openLocalPublicationDraft(user.id,initialDraftId)"),
    "Existing draft resume must remain");
  assert.ok(composer.includes("replyCommentId||draft?.replyCommentId"),
    "Saved video reply must preserve its comment association");
});

test("E2 isolation: publishing is explicit; existing retry and local cleanup remain",()=>{
  const start=composer.indexOf("const publish = async () => {");
  const end=composer.indexOf("const leaveComposer=");
  assert.ok(start>=0&&end>start);
  const publishing=composer.slice(start,end);
  assert.ok(publishing.includes("publishDraft(supabase, draft, sentCaption, uploadPublicationFile"));
  assert.ok(publishing.includes("if (locallySaved)"));
  assert.ok(publishing.includes("deleteLocalPublicationDraft(draft.userId,draft.id)"));
  const exitStart=composer.indexOf("const exit = () => {");
  const exitEnd=composer.indexOf("const secondaryFormColors=");
  assert.ok(exitStart>=0&&exitEnd>exitStart);
  const leaving=composer.slice(exitStart,exitEnd);
  for(const token of ['Publicación sin terminar','Seguir editando','Guardar borrador','Descartar'])
    assert.ok(leaving.includes(token),"Existing unsaved-exit option missing: "+token);
});

test("E2 isolation: preserve the existing limits, never imply a trim engine is already installed",()=>{
  for(const token of [
    "MAX_VIDEO_BYTES = 250 * 1024 * 1024",
    "(asset.duration ?? 0) > 180000",
    '"video/mp4": "mp4"',
    '"video/quicktime": "mov"'
  ])assert.ok(model.includes(token),"Existing media validation changed: "+token);
  // New trim/export capability is NOT established by these regression tests.
  // A later E2 implementation needs separate tests of real exported file,
  // legacy draft compatibility, and never uploading the untrimmed original.
});
