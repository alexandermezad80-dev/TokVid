const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
function load(file, name) {
  const source = fs.readFileSync(path.join(__dirname, '../../artifacts/mobile/lib', file), 'utf8').replace(/^export /gm, '');
  const exports = {}; vm.runInNewContext(stripTypeScriptTypes(source, { mode: 'transform' }) + `\nexports.fn=${name};`, { exports }); return exports.fn;
}
const layout = load('commentVideoLayout.ts', 'commentVideoLayout');
const viewport = load('keyboardSheetGeometry.ts', 'keyboardSheetGeometry');
test('opening any keyboard leaves the 9:16 preview and sheet at exactly the same position',()=>{
 for(const width of [320,360,412,800])for(const height of [600,800,950]){
  const options={width,availableHeight:height,safeTop:24,bottomPadding:0,desiredSheetHeight:500};
  const rest=layout({...options,keyboardVisible:false});
  for(const keyboardTop of [height-250,height-400,height-500]){
   const typing=layout({...options,keyboardVisible:true});assert.deepEqual(typing,rest);
   const measured=viewport({viewportHeight:height,viewportTop:0,screenHeight:height,keyboardTop,safeTop:24,tabBarHeight:88});
   assert.equal(height-measured.keyboardInset,keyboardTop);
  }
  assert.equal(rest.preview.width/rest.preview.height,9/16);
  assert.equal(rest.preview.y,32);
  assert.ok(Math.abs(rest.preview.y+rest.preview.height+8+rest.sheetHeight-height)<0.001);
 }
});
test('preview remains within horizontal safe areas at compact and landscape sizes',()=>{
 for(const height of [180,300,600]){const result=layout({width:700,availableHeight:height,safeTop:24,safeLeft:40,safeRight:30,bottomPadding:0,desiredSheetHeight:500,keyboardVisible:true});assert.ok(result.preview.x>=40);assert.ok(result.preview.x+result.preview.width<=670);assert.ok(result.sheetHeight>=0);assert.ok(result.preview.y+result.preview.height+8<=height);}
});
const crop=load('features/profile/cropGeometry.ts','cropRectangle');
test('photo cropping preserves a square within source bounds for every drag and zoom',()=>{for(const [w,h] of [[1080,2400],[3000,1000],[512,512]])for(const zoom of [1,2,4])for(const offset of [-5000,0,5000]){const c=crop(w,h,300,zoom,offset,-offset);assert.equal(c.width,c.height);assert.ok(c.originX>=0&&c.originY>=0);assert.ok(c.originX+c.width<=w&&c.originY+c.height<=h);}});
