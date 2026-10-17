const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.resolve(__dirname, '../../artifacts/mobile/lib/commentVideoLayout.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, { exports: moduleExports });
const layout = moduleExports.commentVideoLayout;

const reference = (overrides = {}) => layout({
  width: 360, availableHeight: 802, safeTop: 25, viewportTop: 0,
  bottomPadding: 0, desiredSheetHeight: 700, keyboardVisible: false,
  ...overrides,
});

test('reference 360 × 802 dp gives exact frame and 8 dp gap', () => {
  const { preview, sheetHeight } = reference();
  assert.equal(preview.x, 102.5);
  assert.equal(preview.y, 42);
  assert.equal(preview.width, 155);
  assert.equal(preview.height, 275);
  assert.equal(preview.y + preview.height + 8, 325);
  assert.equal(sheetHeight, 477);
});

test('keyboard state does not change video frame or sheet height', () => {
  const closed = reference();
  const opened = reference({ keyboardVisible: true });
  assert.equal(JSON.stringify(closed), JSON.stringify(opened));
});

test('different modal window origin still points to same screen coordinates', () => {
  const { preview, sheetHeight } = reference({ viewportTop: 35, availableHeight: 767 });
  assert.equal(preview.y + 35, 42);
  assert.equal(35 + 767 - sheetHeight, 325);
});

test('respects taller status safe area', () => {
  assert.equal(reference({ safeTop: 39 }).preview.y, 56);
});

test('short screens and narrow widths preserve portrait ratio without overflow', () => {
  const short = reference({ availableHeight: 490 });
  const narrow = reference({ width: 172 });
  assert.ok(short.preview.height < 275);
  assert.ok(short.sheetHeight > 0);
  assert.ok(narrow.preview.width <= 148);
  assert.ok(Math.abs(narrow.preview.height / narrow.preview.width - 275 / 155) < 1e-10);
});
