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

test('closed keyboard: comments header 48dp and glass bar y728/h74', () => {
  const a = reference();
  assert.equal(a.headerHeight, 48);
  assert.equal(a.composerTop, 728);
  assert.equal(a.composerHeight, 74);
});
test('open keyboard: glass runs y325 to y471.5 and composer follows header', () => {
  const a = reference({ keyboardVisible: true, availableHeight: 471.5 });
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
    const a = reference({ keyboardVisible: true, availableHeight: 802 - inset });
    assert.equal(a.composerTop + a.composerHeight, 802 - inset);
  }
});
test('modal-local keyboard top stays aligned when the stable window includes system bars', () => {
  const a = reference({ sheetTop: 301, availableHeight: 447.5, keyboardVisible: true });
  assert.equal(a.keyboardGlassHeight, 146.5);
  assert.equal(a.composerTop + a.composerHeight, 447.5);
});
test('larger safe-bottom inset grows only the closed composer', () => {
  assert.equal(reference({ safeBottom: 36 }).composerHeight, 86);
  assert.equal(reference({ safeBottom: 36, availableHeight: 471.5, keyboardVisible: true }).composerHeight, 98.5);
});
test('no negative size with unusually tall keyboards or shorter screens', () => {
  const a = reference({ fullHeight: 400, availableHeight: 150, sheetTop: 325, keyboardVisible: true });
  assert.equal(a.keyboardGlassHeight, 0);
  assert.equal(a.composerHeight, 0);
});
test('UI uses glass, preserves comment actions, and declares unimplemented media controls disabled', () => {
  const ui = fs.readFileSync(path.join(root, 'components/CommentsSheet.tsx'), 'utf8');
  for (const snippet of ['styles.headerGlass', 'styles.openSheetGlass', 'intensity={24} tint="default"', 'styles.emojiRow',
    'styles.toolsRow', 'styles.editorKeyboard', 'comments.like(row)', 'comments.remove(row)',
    'comments.publish(sentText', 'comments.edit(editing, sentText)', 'disabled style={styles.tool}']) {
    assert.ok(ui.includes(snippet), 'Missing invariant: ' + snippet);
  }
  assert.ok(ui.includes('accessibilityLabel="Menciones: función pendiente"'), '@ icon stays disabled');
  assert.ok(ui.includes('disabled style={styles.tool}'), 'New media icons stay disabled');
  assert.ok(ui.includes('onPress={() => insertQuickEmoji(emoji)}'), 'Seven quick Unicode emojis must be tappable');
  assert.ok(ui.includes('["😂", "😍", "😮", "😢", "🔥", "👏", "❤️"]'), 'Seven emojis match the supplied reference image and order');
  assert.ok(ui.includes('{viewport.keyboardVisible && <View style={styles.emojiRow}>'), 'Reactions remain visible also when replying or editing');
  assert.ok(ui.includes('editing && <Pressable accessibilityRole="button" accessibilityLabel="Cancelar edición"'), 'Existing edit cancellation persists');
  assert.ok(ui.includes('reply && <Pressable accessibilityRole="button" accessibilityLabel="Cancelar respuesta"'), 'Existing reply cancellation persists');
  assert.ok(!ui.includes('editing || reply ? <View style={styles.emojiRow}>'), 'Do not replace emoji row with reply/edit labels');
  assert.ok(ui.includes('!viewport.keyboardVisible && <View pointerEvents="none" style={styles.glassTint} />'), 'Closed glass bar retains tint');
  assert.ok(ui.includes('viewport.keyboardVisible && styles.openSheetGlass'), 'Open keyboard has glass backing');
  assert.ok(ui.includes('Array.from(previous + emoji).slice(0, COMMENT_LIMIT).join("")'), 'Quick emoji respects existing 300 character limit');
  assert.ok(ui.includes('input.current?.focus()'), 'Quick emoji uses original focused input');
  assert.ok(ui.includes('onChangeText={value => setText(Array.from(value).slice(0, COMMENT_LIMIT).join(""))}'), 'Native keyboard and Gboard emojis still type normally');
  assert.ok(!ui.includes('showSoftInputOnFocus={false}'), 'Never block the native emoji keyboard');
  assert.equal((ui.match(/<TextInput /g) || []).length, 1, 'one editor keeps focus across keyboard changes');
  assert.ok(ui.includes('emojiRow: { height: 22, marginTop: 2, marginHorizontal: 10'), 'Emoji row y50-72 and 10dp side margin');
  assert.ok(ui.includes('editorKeyboard: { marginTop: 4, marginHorizontal: 10'), 'Open editor starts at y76 relative to glass panel');
  assert.ok(ui.includes('editorBodyKeyboard: { height: 38, borderRadius: 14'), 'Open 306x38 text field keeps radius14');
  assert.ok(ui.includes('toolsRow: { height: 26, marginTop: 4, paddingLeft: 44, paddingRight: 10'), 'Tools y118-144 and x44');
  assert.ok(ui.includes('sendKeyboard: { width: 44, height: 26, borderRadius: 13'), 'Send button 44x26');
  assert.ok(ui.includes('editorClosed: { marginLeft: 8, marginRight: 9, paddingLeft: 9, paddingRight: 9, gap: 6.5'), 'Closed field matches x8/351, avatar x17, text x55.5');
  assert.ok(ui.includes('sendCollapsed: { width: 29, height: 38'), 'Closed arrow center at x327.5');
  assert.ok(ui.includes('empty: { alignItems: "center", gap: 16 }'), 'Empty state horizontally and vertically centered');
  assert.ok(!ui.includes('keyboardContext:'), 'Reference header/emoji placement does not gain new context row');
  const transpiled = ts.transpileModule(ui, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true });
  const diagnosticErrors = (transpiled.diagnostics || [])
    .filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => `${d.code} at ${d.start}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
  assert.deepEqual(diagnosticErrors, [], 'CommentsSheet TypeScript/JSX syntax must transpile');
});
