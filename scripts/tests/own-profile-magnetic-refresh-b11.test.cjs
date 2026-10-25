const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '../../artifacts/mobile');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const element = (type, props) => ({type, props});
const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
const flat = value => Array.isArray(value) ? Object.assign({}, ...value.map(flat)) : value || {};
function load(file, modules = {}, extra = '') {
  const exports = {};
  const result = ts.transpileModule(read(file) + extra, {compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}});
  vm.runInNewContext(result.outputText, {exports, require(name) {
    if (name.includes('jsx-runtime')) return {jsx: element, jsxs: element};
    if (name in modules) return modules[name];
    throw Error('Unmocked ' + name);
  }});
  return exports;
}
const math = load('lib/features/profile/ownProfilePull.ts');
const tuning = math.OWN_PROFILE_PULL;
function harness(onRefresh = async () => {}, initial = {}) {
  const slots = [], effects = [], animations = [], gestures = [], scheduled = [];
  let cursor = 0, tree;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const memo = (fn, deps) => {const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = {deps, value: fn()}; return slots[i].value;};
  const react = {useRef: value => memo(() => ({current: value}), []), useMemo: memo,
    useCallback: (fn, deps) => memo(() => fn, deps),
    useEffect(fn, deps) {const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) {const old = slots[i]; slots[i] = {deps}; effects.push(() => {old?.cleanup?.(); slots[i].cleanup = fn();});}},
  };
  class Builder {
    constructor(kind) {this.kind = kind; this.handlers = {}; this.options = {}; gestures.push(this);}
  }
  for (const key of ['manualActivation', 'maxPointers', 'shouldCancelWhenOutside', 'disallowInterruption']) Builder.prototype[key] = function (v) {this.options[key] = v; return this;};
  for (const key of ['onTouchesDown', 'onTouchesMove', 'onUpdate', 'onEnd', 'onFinalize']) Builder.prototype[key] = function (v) {this.handlers[key] = v; return this;};
  const reanimated = {
    __esModule: true, default: {View: 'AnimatedView', ScrollView: 'AnimatedScrollView'},
    useSharedValue: value => memo(() => {let current = value; return {get value() {return current;}, set value(next) {if (next?.spring) {this.animation = next; animations.push(next); current = next.target;} else current = next;}};}, []),
    useAnimatedStyle: fn => ({get transform() {return fn().transform;}}),
    useAnimatedScrollHandler: fn => fn,
    withSpring: (target, config, completion) => ({spring: true, target, config, completion}),
    cancelAnimation: value => {value.animation?.completion?.(false); value.animation = null;},
    runOnJS: fn => (...args) => {const result = fn(...args); if (result?.then) scheduled.push(result); return result;},
  };
  const modules = {
    react, 'react-native': {Platform: {OS: 'android'}, ActivityIndicator: 'Spinner', View: 'View', ScrollView: 'ScrollView', StyleSheet: {create: s => s}},
    'react-native-reanimated': reanimated,
    'react-native-gesture-handler': {GestureDetector: 'Detector', Gesture: {Native: () => new Builder('native'), Pan: () => new Builder('pan'), Exclusive: (...items) => ({mode: 'exclusive', items})}},
    './PullRefreshUnderHeader': {__esModule: true, default: 'LegacyPull'},
    '../lib/features/profile/ownProfilePull': math,
  };
  const component = load('components/OwnProfileMagneticRefresh.tsx', modules, '\nexport {AndroidProfilePull};');
  let props = {scrollOffsetRef: {current: 0}, refreshing: false, onRefresh, children: ['details', 'sticky', 'grid'], stickyHeaderIndices: [1], scrollEventThrottle: 16, ...initial};
  const render = patch => {props = {...props, ...patch}; cursor = 0; tree = component.AndroidProfilePull(props); effects.splice(0).forEach(fn => fn()); return tree;};
  render(); tree.props.onLayout({nativeEvent: {layout: {height: 700}}});
  const pan = () => gestures.filter(g => g.kind === 'pan').at(-1).handlers;
  const manager = {activations: 0, failures: 0, activate() {this.activations++;}, fail() {this.failures++;}};
  const touch = (x, y, count = 1) => ({allTouches: [{absoluteX: x, absoluteY: y}], numberOfTouches: count});
  return {
    get tree() {return tree;}, get props() {return props;}, gestures, animations, render, manager, pan, touch,
    get offset() {return flat(nodes(tree).find(n => n.props.testID === 'own-profile-pull-moving').props.style).transform[0].translateY;},
    start() {pan().onTouchesDown(touch(100, 100), manager);},
    move(dx, dy) {pan().onTouchesMove(touch(100 + dx, 100 + dy), manager); pan().onUpdate({absoluteY: 100 + dy});},
    release(success = true) {pan().onEnd({}, success); pan().onFinalize();},
    scroll(y) {nodes(tree).find(n => n.type === 'AnimatedScrollView').props.onScroll({contentOffset: {x: 0, y}});},
    settle() {animations.at(-1)?.completion?.(true);},
    async flush() {await Promise.all(scheduled);},
    unmount() {slots.forEach(s => s?.cleanup?.());},
    legacy() {modules['react-native'].Platform.OS = 'ios'; return component.default(props);},
  };
}
const deferred = () => {let resolve, reject; const promise = new Promise((a, b) => {resolve = a; reject = b;}); return {promise, resolve, reject};};

test('B11 long pull grows continuously beyond the old 156dp cap with decreasing gain', () => {
  for (const height of [360, 700, 1000]) {
    let previous = 0, gain = Infinity;
    for (let distance = 1; distance <= height * 4; distance++) {
      const offset = math.profilePullOffset(distance, height), nextGain = offset - previous;
      assert.ok(offset > previous && offset <= height);
      assert.ok(nextGain <= gain + 1e-9);
      previous = offset; gain = nextGain;
    }
    assert.ok(math.profilePullOffset(height, height) > height * 0.8);
  }
  assert.ok(math.profilePullOffset(600, 700) > 500);
  assert.equal(math.profilePullOffset(Number.MAX_VALUE, 700), 700);
  for (const d of [NaN, Infinity, -1]) assert.equal(math.profilePullOffset(d, 700), 0);
});
test('B11 resumed pull preserves its position; horizontal, upward, multitouch and scrolled gestures yield', () => {
  for (const distance of [1, 50, 200, 600, 1500]) assert.ok(Math.abs(math.profilePullDistance(math.profilePullOffset(distance, 700), 700) - distance) < 1e-7);
  assert.equal(math.profilePullIntent(1, 30, 0, 1), 'pull');
  assert.equal(math.profilePullIntent(2, 3, 0, 1), 'wait');
  for (const args of [[70, 5, 0, 1], [0, -50, 0, 1], [0, 50, 15, 1], [0, 50, 0, 2], [NaN, 50, 0, 1]]) assert.equal(math.profilePullIntent(...args), 'yield');
});
test('B11 physical clipping moves the original blue circle and content in one layer with a constant gap', () => {
  const h = harness(), all = nodes(h.tree), moving = all.find(n => n.props.testID === 'own-profile-pull-moving');
  assert.equal(flat(h.tree.props.style).overflow, 'hidden');
  const indicator = nodes(moving).find(n => n.props.testID === 'own-profile-pull-indicator');
  assert.equal(flat(indicator.props.style).top + flat(indicator.props.style).height, -tuning.indicatorGap);
  const spinner = nodes(indicator).find(n => n.type === 'Spinner');
  assert.equal(spinner.props.color, '#4B7194'); assert.equal(spinner.props.size, 'small');
  assert.equal(all.filter(n => n.type === 'Spinner').length, 1);
  const scroll = nodes(moving).find(n => n.type === 'AnimatedScrollView');
  assert.equal(scroll.props.refreshControl, undefined);
  assert.deepEqual(scroll.props.stickyHeaderIndices, [1]); assert.deepEqual(scroll.props.children, ['details', 'sticky', 'grid']);
  h.start(); h.move(0, 20); h.move(0, 620); assert.ok(h.offset > 500);
  assert.equal(flat(indicator.props.style).top + flat(indicator.props.style).height, -tuning.indicatorGap);
});
test('B11 short, cancelled and horizontal pulls never request data', () => {
  let calls = 0; const h = harness(() => {calls++;});
  h.start(); h.move(0, 20); h.move(0, 60); h.release(); assert.equal(h.offset, 0); assert.equal(calls, 0); h.settle();
  h.start(); h.move(0, 20); h.move(0, 300); h.release(false); assert.equal(h.offset, 0); assert.equal(calls, 0); h.settle();
  const before = h.manager.activations; h.start(); h.move(60, 5); h.release(); assert.equal(h.manager.activations, before); assert.equal(calls, 0);
});
test('B11 direction decides which native controller owns the gesture; taps never trigger refresh', () => {
  let calls = 0; const h = harness(() => {calls++;});
  const gesture = nodes(h.tree).find(n => n.type === 'Detector').props.gesture;
  assert.equal(gesture.mode, 'exclusive');
  assert.deepEqual(gesture.items.map(g => g.kind), ['pan', 'native']);
  h.start(); h.release(); assert.equal(h.manager.activations, 0); assert.equal(calls, 0);
  h.start(); h.move(0, -40); h.release(); assert.equal(h.manager.activations, 0); assert.equal(calls, 0);
  h.start(); h.move(0, 20); h.move(0, 400); const down = h.offset;
  h.move(0, 300); assert.ok(h.offset < down && h.offset > 0); assert.equal(h.props.scrollOffsetRef.current, 0);
  h.release(false); assert.equal(calls, 0);
});
test('B11 one long pull calls the existing callback once and holds until its actual promise resolves', async () => {
  let calls = 0; const pending = deferred(), h = harness(() => {calls++; return pending.promise;});
  h.start(); h.move(0, 20); h.move(0, 400); h.release();
  assert.equal(calls, 1); assert.equal(h.offset, tuning.holdDistance);
  h.release(); h.start(); h.move(0, 500); h.release(); assert.equal(calls, 1); assert.equal(h.offset, tuning.holdDistance);
  h.render({refreshing: true}); h.render({refreshing: false}); assert.equal(h.offset, tuning.holdDistance);
  pending.resolve(); await h.flush(); assert.equal(h.offset, 0); h.settle();
});
test('B11 failed refresh returns home and permits another gesture', async () => {
  let calls = 0; const h = harness(async () => {calls++; throw Error('offline');});
  for (let i = 1; i <= 2; i++) {h.start(); h.move(0, 20); h.move(0, 300); h.release(); await h.flush(); h.settle(); assert.equal(h.offset, 0); assert.equal(calls, i);}
});
test('B11 cancellation, external refresh, native scroll and unmount keep lifecycle boundaries', async () => {
  const pending = deferred(), events = [], h = harness(() => pending.promise, {onScroll: e => events.push(e.nativeEvent.contentOffset.y)});
  h.scroll(150); h.start(); h.move(0, 200); assert.equal(h.manager.activations, 0); assert.equal(h.props.scrollOffsetRef.current, 150); assert.deepEqual(events, [150]);
  h.scroll(0); h.start(); h.move(0, 20); h.move(0, 100); h.pan().onFinalize(); assert.equal(h.offset, 0); h.settle();
  h.render({refreshing: true}); assert.equal(h.offset, tuning.holdDistance); h.render({refreshing: false}); assert.equal(h.offset, 0); h.settle();
  h.start(); h.move(0, 20); h.move(0, 300); h.release(); h.unmount(); const count = h.animations.length;
  pending.resolve(); await h.flush(); assert.equal(h.animations.length, count);
});
test('B11 leaves the non-Android legacy refresher and scroll props intact', () => {
  const h = harness(), tree = h.legacy();
  assert.equal(tree.type, 'LegacyPull'); assert.equal(tree.props.maxPull, 156); assert.equal(tree.props.holdDistance, 72); assert.equal(tree.props.holdWhileRefreshing, true);
  assert.equal(tree.props.children.type, 'ScrollView'); assert.deepEqual(tree.props.children.props.stickyHeaderIndices, [1]);
});
