const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '../../artifacts/mobile');
const flat = x => Array.isArray(x) ? Object.assign({}, ...x.map(flat)) : x || {};
function load(file, modules) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }}).outputText;
  vm.runInNewContext(code, {exports, require: n => {
    if (n.includes('jsx-runtime')) return {jsx: (type, props) => ({type, props})};
    if (n in modules) return modules[n];
    throw Error('Unmocked ' + n);
  }});
  return exports;
}
function runtime() {
  const slots = []; let cursor = 0, creates = 0;
  const react = {useMemo(fn, deps) {
    const i = cursor++;
    if (!slots[i] || deps.some((v, j) => !Object.is(v, slots[i].deps[j]))) slots[i] = {deps, value: fn()};
    return slots[i].value;
  }};
  // A derived Animated node is an object in RN, not a multiplication evaluated
  // afresh as a number. Native bindings rely on this node's lifetime.
  const Animated = {View: 'Animated.View', multiply: (position, width) => {
    creates++; return {position, width, read: () => position.value * width};
  }};
  const Indicator = load('components/SwipePositionUnderline.tsx', {react,
    'react-native': {Animated, StyleSheet: {create: x => x}},
    '../constants/referenceVisual': {referenceVisual: {label: '#5B6670'}},
  }).default;
  return {render(props) {cursor = 0; return flat(Indicator(props).props.style);}, get creates() {return creates;}};
}

test('indicator keeps its native binding across manual selection after a swipe and unrelated profile renders', () => {
  const r = runtime(), position = {value: 0}, props = {position, tabWidth: 60};
  const initial = r.render(props), binding = initial.transform[0].translateX;
  // The user's path: swipe through sections, return to Videos, then tap each icon.
  for (const value of [0.3, 1, 1.6, 2, 3.4, 4, 5, 3.5, 1, 0, 2, 3, 4, 5, 1]) {
    position.value = value;
    for (let rerender = 0; rerender < 3; rerender++) {
      const style = r.render(props);
      assert.equal(style.transform[0].translateX, binding, 'must not detach and recreate the native marker when selection/content rerenders');
      assert.equal(style.left + binding.read() + style.width / 2, (value + 0.5) * 60);
    }
  }
  assert.equal(r.creates, 1);
});

test('marker recalculates for a new width or position owner, retaining 22dp and Inbox styling', () => {
  const r = runtime(), position = {value: 4};
  let previous;
  for (const width of [320, 360, 393, 720]) {
    const style = r.render({position, tabWidth: width / 6}), node = style.transform[0].translateX;
    assert.notEqual(node, previous); previous = node;
    assert.equal(style.width, 22); assert.equal(style.height, 2); assert.equal(style.backgroundColor, '#5B6670');
    assert.ok(Math.abs(style.left + node.read() + 11 - 4.5 * width / 6) < 1e-6);
  }
  const inboxPosition = {value: 1};
  const inbox = r.render({position: inboxPosition, tabWidth: 180, markerWidth: 97, color: '#25F4EE'});
  assert.notEqual(inbox.transform[0].translateX, previous);
  assert.equal(inbox.width, 97); assert.equal(inbox.height, 2); assert.equal(inbox.backgroundColor, '#25F4EE');
  assert.equal(inbox.left + inbox.transform[0].translateX.read() + 97 / 2, 270);
});

test('approved swipe controller, pager and Inbox integration remain byte-identical to APK310', () => {
  const crypto = require('node:crypto');
  const expected = require('../fixtures/apk310-swipe-hashes.json');
  for (const [file, sha] of Object.entries(expected)) {
    const b = fs.readFileSync(path.join(root, file));
    assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + b.length + '\0'), b])).digest('hex'), sha, file);
  }
});
