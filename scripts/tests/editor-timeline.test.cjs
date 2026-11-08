const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../artifacts/mobile/lib/features/publishing/trimTimeline.ts'),'utf8');
const strip=require('node:module').stripTypeScriptTypes;
const exportsObject={};
if(strip)vm.runInNewContext(strip(source).replace(/export /g,'')+'\nObject.assign(exports,{trimBoundary,editorTime,thumbnailTimes,clampTime});',{exports:exportsObject});
else{const ts=require('typescript');vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exportsObject});}
const {trimBoundary,editorTime,thumbnailTimes}=exportsObject;
test('trim handles preserve minimum length and original duration',()=>{
 assert.equal(trimBoundary(true,100,0,10,10),9.5);
 assert.equal(trimBoundary(false,-10,3,10,10),3.5);
 assert.equal(trimBoundary(false,999,0,10,10),10);
 assert.equal(trimBoundary(true,-4,0,10,10),0);
});
test('fine selection does not round away tenths or hundredths',()=>{
 assert.equal(trimBoundary(true,1.23,0,10,10),1.23);
 assert.equal(trimBoundary(false,9.87,0,10,10),9.87);
});
test('editor time handles minute carry, hundredths and invalid input',()=>{
 assert.equal(editorTime(59.999),'1:00.00');assert.equal(editorTime(1.23),'0:01.23');
 assert.equal(editorTime(NaN),'0:00.00');assert.equal(editorTime(-5),'0:00.00');
});
test('thumbnails use bounded small sample count and avoid end-of-file',()=>{
 for(const duration of [0.5,1,25,180]){const times=thumbnailTimes(duration);assert.equal(times.length,8);assert.ok(times.every(t=>t>=0&&t<duration));}
 assert.equal(thumbnailTimes(0).length,0);assert.equal(thumbnailTimes(Infinity).length,0);
});
test('editor cancellation remains available and protects late completion',()=>{
 const ui=fs.readFileSync(path.resolve(__dirname,'../../artifacts/mobile/app/video-editor.tsx'),'utf8');
 assert.ok(ui.includes('request!==operation.current'));assert.ok(ui.includes('FileSystem.deleteAsync(result.uri'));
 assert.ok(ui.includes('hardwareBackPress'));assert.ok(ui.includes('readTrimProgress()'));
 assert.ok(!/onPress=\{cancel\} disabled=\{busy\}/.test(ui));
 const native=fs.readFileSync(path.resolve(__dirname,'../../artifacts/mobile/plugins/video-trim-native/VideoTrimModule.kt'),'utf8');
 assert.ok(native.includes('if(token!=generation)return'));
 assert.ok(native.includes('Transformer.PROGRESS_STATE_AVAILABLE'));
 assert.ok(native.includes('generation++'));
});
