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
const reference = (more = {}) => geometry({ fullHeight: 802, sheetTop: 325, keyboardInset: 0, safeBottom: 24, keyboardVisible: false, ...more });

test('closed keyboard: comments header 48dp and glass bar y728/h74', () => {
  const a = reference();
  assert.equal(a.headerHeight, 48);
  assert.equal(a.composerTop, 728);
  assert.equal(a.composerHeight, 74);
});
test('open keyboard: glass runs y325 to y471.5 and composer follows header', () => {
  const a = reference({ keyboardVisible: true, keyboardInset: 330.5 });
  assert.equal(a.keyboardGlassHeight, 146.5);
  assert.equal(a.composerTop, 373);
  assert.equal(a.composerHeight, 98.5);
  assert.equal(a.composerTop + 2, 375);   // emoji row
  assert.equal(a.composerTop + 28, 401);  // input y325+76
  assert.equal(a.composerTop + 70, 443);  // tools y325+118
  assert.equal(a.composerTop + 96, 469);  // 2.5dp above keyboard
  assert.equal(a.composerTop + a.composerHeight, 471.5);
});
test('different Gboard/emoji keyboard heights always align to IME top', () => {
  for (const inset of [250, 300, 330.5, 360, 400]) {
    const a = reference({ keyboardVisible: true, keyboardInset: inset });
    assert.equal(a.composerTop + a.composerHeight, 802 - inset);
  }
});
test('larger safe-bottom inset grows only the closed composer', () => {
  assert.equal(reference({ safeBottom: 36 }).composerHeight, 86);
  assert.equal(reference({ safeBottom: 36, keyboardInset: 330.5, keyboardVisible: true }).composerHeight, 98.5);
});
test('no negative size with unusually tall keyboards or shorter screens', () => {
  const a = reference({ fullHeight: 400, sheetTop: 325, keyboardInset: 250, keyboardVisible: true });
  assert.equal(a.keyboardGlassHeight, 0);
  assert.equal(a.composerHeight, 0);
});
test('UI uses glass, preserves comment actions, and declares unimplemented media controls disabled', () => {
  const ui = fs.readFileSync(path.join(root, 'components/CommentsSheet.tsx'), 'utf8');
  for (const snippet of ['styles.headerGlass', 'styles.openSheetGlass', 'styles.emojiRow',
    'styles.toolsRow', 'styles.editorKeyboard', 'comments.like(row)', 'comments.remove(row)',
    'comments.publish(sentText', 'comments.edit(editing, sentText)', 'disabled style={styles.tool}']) {
    assert.ok(ui.includes(snippet), 'Missing invariant: ' + snippet);
  }
  assert.ok(ui.includes('accessibilityLabel="Menciones: función pendiente"'), '@ icon stays disabled');
  assert.ok(ui.includes('disabled style={styles.tool}'), 'New media icons stay disabled');
  assert.ok(ui.includes('onPress={() => insertQuickEmoji(emoji)}'), 'Seven quick Unicode emojis must be tappable');
  assert.ok(ui.includes('Array.from(previous + emoji).slice(0, COMMENT_LIMIT).join("")'), 'Quick emoji respects existing 300 character limit');
  assert.ok(ui.includes('input.current?.focus()'), 'Quick emoji uses original focused input');
  assert.ok(ui.includes('onChangeText={value => setText(Array.from(value).slice(0, COMMENT_LIMIT).join(""))}'), 'Native keyboard and Gboard emojis still type normally');
  assert.ok(!ui.includes('showSoftInputOnFocus={false}'), 'Never block the native emoji keyboard');
  assert.equal((ui.match(/<TextInput /g) || []).length, 1, 'one editor keeps focus across keyboard changes');
  const transpiled = ts.transpileModule(ui, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true });
  assert.equal((transpiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0,
    'CommentsSheet TypeScript/JSX syntax must transpile');
});
