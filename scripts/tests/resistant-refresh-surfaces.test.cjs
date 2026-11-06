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
const snapMath = load('lib/features/profile/profileHeaderSnap.ts');
const tuning = math.OWN_PROFILE_PULL;
function harness(onRefresh = async () => {}, initial = {}) {
  const slots = [], effects = [], animations = [], gestures = [], scheduled = [];
  let cursor = 0, tree, currentTranslation = 0;
  const scrollCalls = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const memo = (fn, deps) => {const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = {deps, value: fn()}; return slots[i].value;};
  const react = {forwardRef: fn => fn, useRef: value => memo(() => ({current: value}), []), useMemo: memo,
    useCallback: (fn, deps) => memo(() => fn, deps),
    useEffect(fn, deps) {const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) {const old = slots[i]; slots[i] = {deps}; effects.push(() => {old?.cleanup?.(); slots[i].cleanup = fn();});}},
  };
  class Builder {
    constructor(kind) {this.kind = kind; this.handlers = {}; this.options = {}; gestures.push(this);}
  }
  for (const key of ['manualActivation', 'maxPointers', 'averageTouches', 'shouldCancelWhenOutside', 'disallowInterruption']) Builder.prototype[key] = function (v) {this.options[key] = v; return this;};
  for (const key of ['onTouchesDown', 'onTouchesMove', 'onStart', 'onUpdate', 'onEnd', 'onFinalize']) Builder.prototype[key] = function (v) {this.handlers[key] = v; return this;};
  const reanimated = {
    __esModule: true, default: {View: 'AnimatedView', ScrollView: 'AnimatedScrollView'},
    useSharedValue: value => memo(() => {let current = value; return {get value() {return current;}, set value(next) {if (next?.spring) {this.animation = next; animations.push(next); current = next.target;} else current = next;}};}, []),
    useAnimatedStyle: fn => ({get transform() {return fn().transform;}}),
    useAnimatedScrollHandler: handlers => typeof handlers === "function" ? handlers : Object.assign(event => handlers.onScroll(event), {handlers}),
    useAnimatedRef: () => memo(() => ({current: null}), []), scrollTo: (ref, x, y, animated) => scrollCalls.push({x, y, animated}),
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
    '../lib/features/profile/profileHeaderSnap': snapMath,
  };
  const component = load('components/ResistantRefresh.tsx', modules, '\nexport {NativeSurface};');
  let props = {holdDistance: 64, color: '#FE2C55', renderScroll: onScroll => element('AnimatedScrollView', {onScroll}), scrollOffsetRef: {current: 0}, refreshing: false, onRefresh, children: ['details', 'sticky', 'grid'], stickyHeaderIndices: [1], scrollEventThrottle: 16, ...initial};
  const render = patch => {props = {...props, ...patch}; cursor = 0; tree = component.NativeSurface(props); effects.splice(0).forEach(fn => fn()); return tree;};
  render(); tree.props.onLayout({nativeEvent: {layout: {height: 700}}});
  const pan = () => gestures.filter(g => g.kind === 'pan').at(-1).handlers;
  const manager = {activations: 0, failures: 0, activate() {this.activations++; pan().onStart({translationY:currentTranslation});}, fail() {this.failures++;}};
  const touch = (x, y, count = 1) => ({allTouches: [{absoluteX: x, absoluteY: y}], numberOfTouches: count});
  return {
    get tree() {return tree;}, get props() {return props;}, gestures, animations, render, manager, pan, touch, scrollCalls,
    get offset() {return flat(nodes(tree).find(n => n.props.testID === 'resistant-refresh-moving').props.style).transform[0].translateY;},
    start() {pan().onTouchesDown(touch(100, 100), manager);},
    move(dx, dy) {currentTranslation = dy; pan().onTouchesMove(touch(100 + dx, 100 + dy), manager); pan().onUpdate({absoluteY: 100 + dy, translationY: dy});},
    release(success = true) {pan().onEnd({}, success); pan().onFinalize();},
    scroll(y) {nodes(tree).find(n => n.type === 'AnimatedScrollView').props.onScroll({contentOffset: {x: 0, y}});},
    boundary(kind, y) {nodes(tree).find(n => n.type === 'AnimatedScrollView').props.onScroll.handlers[kind]({contentOffset: {x:0, y}});},
    settle() {animations.at(-1)?.completion?.(true);},
    async flush() {await Promise.all(scheduled);},
    unmount() {slots.forEach(s => s?.cleanup?.());},
    legacy() {modules['react-native'].Platform.OS = 'ios'; return component.default(props);},
  };
}
const deferred = () => {let resolve, reject; const promise = new Promise((a, b) => {resolve = a; reject = b;}); return {promise, resolve, reject};};

test('native list pull yields to horizontal/upward motion and ordinary scrolling', () => {
  let calls = 0; const h=harness(()=>{calls++;});
  for(const [dx,dy] of [[60,3],[0,-60]]){h.start();h.move(dx,dy);h.release();}
  h.scroll(150);h.start();h.move(0,300);h.release();
  assert.equal(h.manager.activations,0);assert.equal(calls,0);
  const gesture=nodes(h.tree).find(n=>n.type==='Detector').props.gesture;
  assert.equal(gesture.mode,'exclusive');assert.deepEqual(gesture.items.map(g=>g.kind),['pan','native']);
});
test('one completed pull holds once, survives two pointers and waits for real completion', async () => {
  let calls=0;const pending=deferred(),h=harness(()=>{calls++;return pending.promise;});
  h.start();h.move(0,20);h.move(0,140);const before=h.offset;
  h.pan().onTouchesDown(h.touch(300,900,2),h.manager);
  h.pan().onUpdate({translationY:140,absoluteY:900,numberOfPointers:2});assert.equal(h.offset,before);
  h.pan().onUpdate({translationY:20+tuning.triggerDistance+40,absoluteY:100,numberOfPointers:1});h.release();
  assert.equal(calls,1);assert.equal(h.offset,64);h.start();h.move(0,400);h.release();assert.equal(calls,1);
  pending.resolve();await h.flush();assert.equal(h.offset,0);
});
test('short, cancelled and inactive-page pulls do not refresh; failures return home',async()=>{
  let calls=0;const h=harness(async()=>{calls++;throw Error('offline');});
  h.start();h.move(0,20);h.move(0,100);h.release();assert.equal(calls,0);h.settle();
  h.render({enabled:false});h.start();h.move(0,300);h.release();assert.equal(calls,0);
  h.render({enabled:true});h.start();h.move(0,20);h.move(0,400);h.release(false);assert.equal(calls,0);h.settle();
  h.start();h.move(0,20);h.move(0,400);h.release();await h.flush();assert.equal(calls,1);assert.equal(h.offset,0);
});
test('refresh callbacks and offsets stay local to each Inbox page; late completion cannot animate after unmount',async()=>{
  const pending=deferred(),events=[],h=harness(()=>pending.promise,{onScroll:e=>events.push(e.nativeEvent.contentOffset.y)});
  const other=harness();h.scroll(200);assert.deepEqual(events,[200]);other.start();other.move(0,20);assert.equal(other.manager.activations,1);
  h.scroll(0);h.start();h.move(0,20);h.move(0,20+tuning.triggerDistance+40);h.release();h.unmount();const count=h.animations.length;
  pending.resolve();await h.flush();assert.equal(h.animations.length,count);
});
