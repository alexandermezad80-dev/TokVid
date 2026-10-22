const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '../../artifacts/mobile');
const source = fs.readFileSync(path.join(root, 'lib/commentsGlassGeometry.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const moduleExports = {};
vm.runInNewContext(js, { exports: moduleExports });
const geometry = moduleExports.commentsGlassGeometry;
const reference = (more = {}) => geometry({ fullHeight: 802, availableHeight: 802, sheetTop: 325, safeBottom: 24, keyboardVisible: false, ...more });

test('closed editor ends 8dp above measured gesture area', () => {
  const a = reference();
  assert.equal(a.headerHeight, 56);
  assert.equal(a.composerTop, 719.5);
  assert.equal(a.composerHeight, 58.5);
});
test('open keyboard: glass runs y325 to y471.5 and composer follows header', () => {
  const a = reference({ keyboardVisible: true, availableHeight: 471.5 });
  assert.equal(a.keyboardGlassHeight, 146.5);
  assert.equal(a.composerTop, 381);
  assert.equal(a.composerHeight, 90.5);
  assert.equal(a.composerTop + 1, 382);   // emoji row
  assert.equal(a.composerTop + 24, 405);  // input y325+80
  assert.equal(a.composerTop + 63, 444);  // tools y325+119
  assert.equal(a.composerTop + 87, 468);  // 3.5dp above keyboard
  assert.equal(a.composerTop + a.composerHeight, 471.5);
});
test('different Gboard/emoji keyboard heights always align to IME top', () => {
  for (const inset of [250, 300, 330.5, 360, 400]) {
    const a = reference({ keyboardVisible: true, availableHeight: 802 - inset });
    assert.equal(a.composerTop + a.composerHeight, 802 - inset);
  }
});
test('modal-local keyboard top stays aligned when the stable window includes system bars', () => {
  const a = reference({ sheetTop: 301, availableHeight: 447.5, keyboardVisible: true });
  assert.equal(a.keyboardGlassHeight, 146.5);
  assert.equal(a.composerTop + a.composerHeight, 447.5);
});
test('three-button navigation reserves its measured inset with compact bottom clearance', () => {
  const a = reference({ safeBottom: 42 });
  assert.equal(a.closedBottom, 760);
  assert.equal(a.closedSheetHeight, 435);
  assert.equal(a.composerTop, 701.5);
  assert.equal(a.composerHeight, 58.5);
  assert.equal(a.composerTop + 12.5, 714);
  assert.equal(a.composerTop + 12.5 + 38, 752);
  assert.equal(reference({ safeBottom: 42, availableHeight: 471.5, keyboardVisible: true }).composerHeight, 90.5);
});
test('already inset modal never subtracts the system navigation bar twice', () => {
  const a = reference({ fullHeight: 736, screenHeight: 802, viewportTop: 24, sheetTop: 301, safeBottom: 42 });
  assert.equal(a.closedBottom + 24, 760);
  assert.equal(a.composerTop + 24, 701.5);
});
test('measured navigation bar heights keep the field entirely above system controls', () => {
  for (const safeBottom of [0, 16, 24, 34, 42, 48, 60]) {
    const a = reference({ safeBottom });
    assert.ok(a.composerTop + 12.5 + 38 <= 802 - safeBottom + 0.5);
  }
});
test('no negative size with unusually tall keyboards or shorter screens', () => {
  const a = reference({ fullHeight: 400, availableHeight: 150, sheetTop: 325, keyboardVisible: true });
  assert.equal(a.keyboardGlassHeight, 0);
  assert.equal(a.composerHeight, 0);
});
test('single native editor keeps comment controls and native keyboard ownership', () => {
  const ui = fs.readFileSync(path.join(root, 'components/CommentsSheet.tsx'), 'utf8');
  assert.equal((ui.match(/<AnimatedTextInput /g) || []).length, 1);
  assert.ok(!ui.includes('showSoftInputOnFocus={false}'));
  assert.ok(!ui.includes('refreshing={comments.loading}'));
  assert.ok(ui.includes('name="at-sign"'));
  const result = ts.transpileModule(ui, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true });
  assert.deepEqual((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error), []);
});
