const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../artifacts/mobile');
const element = (type, props, key) => ({type, props, key});
const flat = value => Array.isArray(value) ? Object.assign({}, ...value.map(flat)) : value || {};
function load(file, modules = {}, globals = {}) {
  const exports = {};
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(compiled, {exports, ...globals, require(name) {
    if (name.includes('jsx-runtime')) return {jsx: element, jsxs: element, Fragment: 'fragment'};
    if (name in modules) return modules[name];
    throw Error('Unmocked ' + name);
  }});
  return exports;
}
const vectorModules = {react: {}, 'react-native-svg': {__esModule: true, default: 'svg', Circle: 'circle', Rect: 'rect', Path: 'path'}};
const originalIcon = load('components/TokvidProfileIcon.tsx', vectorModules);
const sectionIcon = load('components/ProfileSectionIcon.tsx', {...vectorModules, './TokvidProfileIcon': originalIcon}).default;
const expand = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(expand) : typeof node.type === 'function' ? expand(node.type(node.props)) : [node, ...expand(node.props?.children)];
const normalize = attrs => Object.fromEntries(Object.entries(attrs).filter(([k]) => k !== 'children').map(([k, v]) => [k.replace(/[A-Z]/g, c => '-' + c.toLowerCase()), String(v).replace(/\s+/g, ' ').trim()]));

test('six section icons render the exact supplied SVG geometry at 22dp, in light grey and selected ink', () => {
  const pairs = [['videos', '01_Videos'], ['stories', '02_Historias'], ['shared', '03_Compartidos'], ['liked', '04_Me_gusta'], ['saved', '05_Guardados'], ['drafts', '06_Borradores']];
  for (const [name, file] of pairs) for (const color of ['#9AA5AE', '#0E1216']) {
    const svg = fs.readFileSync(path.join(__dirname, 'fixtures/profile-icons', file + '.svg'), 'utf8').replaceAll('currentColor', color);
    const expected = [...svg.matchAll(/<(svg|path|circle|rect)\s+([^>]+)>/g)].map(([, type, raw]) => ({type, attrs: Object.fromEntries([...raw.matchAll(/([\w:-]+)="([^"]*)"/g)].filter(([, k]) => k !== 'xmlns').map(([, k, v]) => [k === 'viewBox' ? 'view-box' : k, v.replace(/\s+/g, ' ').trim()]))}));
    const actual = expand(sectionIcon({name, size: 22, color})).filter(n => ['svg', 'path', 'circle', 'rect'].includes(n.type)).map(n => ({type: n.type, attrs: normalize(n.props)}));
    assert.deepEqual(actual, expected, name + ' / ' + color);
  }
});

function hintRuntime() {
  const slots = [], effects = [], timers = new Map(), animations = [];
  const handle = {current: null}; let cursor = 0, now = 0, nextTimer = 0, updates = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const memo = (fn, deps) => {const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = {value: fn(), deps}; return slots[i].value;};
  const react = {
    forwardRef: fn => props => fn(props, props.ref), useRef: value => memo(() => ({current: value}), []), useCallback: (fn, deps) => memo(() => fn, deps),
    useState(value) {const i = cursor++; if (!slots[i]) slots[i] = {value}; return [slots[i].value, next => {updates++; slots[i].value = typeof next === 'function' ? next(slots[i].value) : next;}];},
    useEffect(fn, deps) {const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) {const old = slots[i]; slots[i] = {deps}; effects.push(() => {old?.cleanup?.(); slots[i].cleanup = fn();});}},
    useImperativeHandle(ref, create) {ref.current = create();},
  };
  class Value {
    constructor(value) {this.value = value;}
    setValue(value) {this.value = value;}
    stopAnimation() {const done = this.completion; this.completion = null; done?.({finished: false});}
  }
  const native = {Text: 'Text', StyleSheet: {create: s => s}, Animated: {View: 'AnimatedView', Value,
    timing(value, config) {const animation = {value, config, done: null}; animations.push(animation); return {start(done) {value.value = config.toValue; value.completion = done; animation.done = done;}};},
  }};
  const Component = load('components/ProfileTabHint.tsx', {react, 'react-native': native}, {
    setTimeout(fn, ms) {const id = ++nextTimer; timers.set(id, {fn, at: now + ms}); return id;}, clearTimeout(id) {timers.delete(id);},
  }).default;
  let width = 393, tree;
  const render = () => {cursor = 0; tree = Component({width, ref: handle}); effects.splice(0).forEach(fn => fn()); return tree;}; render();
  return {
    handle, timers, animations, render, get tree() {return tree;}, get updates() {return updates;},
    show(name, index) {handle.current.show(name, index); return render();},
    measure(measuredWidth) {tree.props.onLayout({nativeEvent: {layout: {width: measuredWidth}}}); return render();},
    resize(next) {width = next; return render();},
    advance(ms) {now += ms; for (const [id, timer] of [...timers]) if (timer.at <= now) {timers.delete(id); timer.fn();}},
    finish() {animations.at(-1)?.done?.({finished: true}); return render();},
    unmount() {slots.forEach(s => s?.cleanup?.()); handle.current = null;},
  };
}

test('subtle names measure before appearing and stay within both screen edges at different text widths', () => {
  const h = hintRuntime(); assert.equal(h.tree, null);
  for (const width of [320, 360, 393, 800]) for (const index of [0, 5]) for (const measured of [70, 110, 180]) {
    h.resize(width); h.show(index ? 'Borradores' : 'Videos', index);
    assert.equal(flat(h.tree.props.style).opacity.value, 0);
    h.measure(measured); const s = flat(h.tree.props.style);
    assert.ok(s.left >= 6 && s.left + measured <= width - 6);
    assert.equal(s.position, 'absolute'); assert.equal(s.top, 45);
    assert.equal(s.backgroundColor, '#F2F4F6'); assert.equal(h.tree.props.pointerEvents, 'none');
    assert.equal(h.tree.props.children.props.style.fontFamily, 'Inter_400Regular');
    assert.equal(h.tree.props.children.props.style.color, '#6B7580');
  }
});
test('a name fades after 1.5 seconds, then leaves no extra layout or touch target', () => {
  const h = hintRuntime(); h.show('Guardados', 4); h.measure(86);
  h.advance(1499); assert.equal(flat(h.tree.props.style).opacity.value, 1);
  h.advance(1); assert.equal(h.animations.at(-1).config.toValue, 0); assert.equal(h.animations.at(-1).config.duration, 250);
  h.finish(); assert.equal(h.tree, null); assert.equal(h.timers.size, 0);
});
test('rapid or repeated taps replace stale timers, including labels of identical measured width', () => {
  const h = hintRuntime(); h.show('Videos', 0); h.measure(70); h.advance(900);
  const oldKey = h.tree.key;
  h.show('Videos', 0); assert.notEqual(h.tree.key, oldKey); h.measure(70);
  assert.equal(h.timers.size, 1); h.advance(600); assert.equal(flat(h.tree.props.style).opacity.value, 1);
  h.show('Historias', 1); h.measure(70); h.advance(1499); assert.equal(flat(h.tree.props.style).opacity.value, 1);
  h.advance(1); h.finish(); assert.equal(h.tree, null);
});
test('leaving the profile cancels delayed work and an unfinished fade', () => {
  for (const duringFade of [false, true]) {
    const h = hintRuntime(); h.show('Me gusta', 3); h.measure(80); if (duringFade) h.advance(1500);
    h.unmount(); const updates = h.updates; h.advance(5000);
    assert.equal(h.timers.size, 0); assert.equal(h.updates, updates);
  }
});
test('approved magnetic refresh remains byte-identical while the strip keeps its indicator and old palette', () => {
  for (const [file, expected] of [
    ['components/OwnProfileMagneticRefresh.tsx', '58d5b80d8153223cd904fc8c637a8b90c5663b2e'],
    ['lib/features/profile/ownProfilePull.ts', 'e1320754a3ffcb9c0694c3a7e1f78d271cab8f24'],
  ]) {const b = fs.readFileSync(path.join(root, file)); assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + b.length + '\0'), b])).digest('hex'), expected);}
  const source = fs.readFileSync(path.join(root, 'app/(tabs)/profile.tsx'), 'utf8');
  assert.ok(source.includes('<ProfileSectionIcon name={item.key} size={22} color={previewTab===item.key?v.ink:v.inactive}/>'));
  assert.ok(source.includes('<SwipePositionUnderline position={pagePosition} tabWidth={width/6}/>'));
  assert.ok(source.includes('height:39')); assert.ok(source.includes('width:width/6,flex:0'));
});
