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
function frame(height, top, keyboardTop, width = 360, screenHeight = 800) {
  const measured = viewport({ viewportHeight: height, viewportTop: top, screenHeight, keyboardTop, safeTop: 24, tabBarHeight: 70 });
  const navigationHeight = measured.keyboardVisible ? 0 : 70;
  return { ...layout({ width, availableHeight: measured.availableHeight, safeTop: Math.max(0, 24 - top), bottomPadding: measured.keyboardVisible ? 8 : 0, desiredSheetHeight: measured.commentsHeight + navigationHeight, keyboardVisible: measured.keyboardVisible }), measured, top };
}
test('vertical video stays clear of the comments composer before and after keyboard opening', () => {
  const rest = frame(800, 0, null), typing = frame(800, 0, 460);
  assert.ok(typing.preview.height < rest.preview.height); assert.ok(typing.preview.height > 100);
  for (const state of [rest, typing]) {
    const p = state.preview; assert.equal(p.width / p.height, 9 / 16);
    assert.ok(p.y >= 24); assert.ok(p.x >= 0 && p.x + p.width <= 360);
    const bottom = state.measured.availableHeight - (state.measured.keyboardVisible ? 8 : 0);
    assert.ok(p.y + p.height + 10 <= bottom - state.sheetHeight + 0.0001);
  }
});
test('resized Android modal and full modal produce the same screen preview without double keyboard subtraction', () => {
  const full = frame(800, 0, 460), resized = frame(436, 24, 460);
  assert.equal(full.preview.height, resized.preview.height); assert.equal(full.sheetHeight, resized.sheetHeight);
  assert.equal(full.preview.y, resized.preview.y + 24);
});
test('small screens and landscape safe areas keep the preview and panel inside the measured window', () => {
  for (const height of [600, 300, 180, 60]) {
    const state = layout({ width: 700, availableHeight: height, safeTop: 24, safeLeft: 40, safeRight: 30, bottomPadding: 8, desiredSheetHeight: 500, keyboardVisible: true });
    assert.ok(state.preview.x >= 40); assert.ok(state.preview.x + state.preview.width <= 670);
    assert.ok(state.sheetHeight >= 0); assert.ok(state.preview.height >= 0);
    assert.ok(state.preview.y + state.preview.height <= height - 8 + 0.0001);
  }
});
