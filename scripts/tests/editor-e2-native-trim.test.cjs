const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile");
const read=x=>fs.readFileSync(path.join(root,x),"utf8");
const ui=read("app/video-editor.tsx"),composer=read("app/(tabs)/create.tsx"),session=read("lib/features/publishing/videoEditorSession.ts"),bridge=read("lib/features/publishing/videoTrimNative.ts");
const native=read("plugins/video-trim-native/VideoTrimModule.kt"),plugin=read("plugins/withTokvidVideoTrim.js"),config=JSON.parse(read("app.json"));
test("E2 isolation: composer opens a separate editor and keeps existing actions",()=>{
 for(const x of ["beginVideoEdit(draft)","takeCompletedVideoEdit(user?.id)","alreadyUploaded?publicationId():previous.id","thumbnailUri:undefined,uploadedUrl:undefined,thumbnailUrl:undefined","accessibilityLabel=\"Publicar\"","accessibilityLabel=\"Guardar borrador\"","camera.current.recordAsync({ maxDuration: 180 })"])assert.ok(composer.includes(x),x);
 assert.ok(ui.includes("Aplicar recorte")&&ui.includes("Cancelar sin cambios"));
});
test("E2 native export: new private MP4, clipping, validation and no publish from editor",()=>{
 for(const x of ["MediaItem.ClippingConfiguration.Builder()","setStartPositionMs(begin)","setEndPositionMs(end)","Transformer.Builder","job.start(clip,out.absolutePath)","UUID.randomUUID()","cacheDir","job.cancel()"])assert.ok(native.includes(x),x);
 assert.ok(plugin.includes("media3-transformer:1.7.1"));
 assert.ok(config.expo.plugins.some(x=>Array.isArray(x)&&x[0]==="./plugins/withTokvidVideoTrim"));
 assert.ok(!ui.includes("publishDraft(")&&!native.includes("supabase"));
 assert.ok(bridge.includes("r.size<=250*1024*1024"));
 assert.ok(session.includes("current.userId===userId")&&session.includes("finished.userId!==userId"));
});
test("E2 TypeScript syntax checks",()=>{
 for(const v of [ui,composer,session,bridge]){const t=ts.transpileModule(v,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});assert.deepEqual(t.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).map(x=>String(x.messageText)),[]);}
});
