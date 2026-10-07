const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const mobile = path.join(__dirname, '../../artifacts/mobile');
const element = (type, props, ...children) => ({ type, props: { ...props, ...(children.length ? { children } : {}) } });
const jsx = (type, props) => element(type, props);
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
function runtime() {
  const slots = []; let cursor = 0, effects = [], previousCount;
  const equal = (a, b) => a && a.length === b.length && b.every((value, i) => Object.is(value, a[i]));
  const hooks = {
    useState(initial) { const i = cursor++; if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
    useRef(current) { return slots[cursor++] ??= { current }; },
    useEffect(effect, deps) { const i = cursor++; if (!equal(slots[i]?.deps, deps)) { const previous = slots[i]; slots[i] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = effect(); }); } },
  };
  return { hooks, render(fn, commit = () => {}) { cursor = 0; effects = []; const result = fn(); if (previousCount !== undefined) assert.equal(cursor, previousCount, 'Hook order remains stable'); previousCount = cursor; commit(result); effects.forEach(fn => fn()); return result; } };
}
const native = { View: 'View', Image: 'Image', Pressable: 'Pressable', Text: 'Text', TouchableOpacity: 'TouchableOpacity', KeyboardAvoidingView: 'KeyboardAvoidingView', ScrollView: 'ScrollView', TextInput: 'TextInput', ActivityIndicator: 'ActivityIndicator', Alert: { alert() {} }, Platform: { OS: 'android' }, StyleSheet: { create: value => value, absoluteFillObject: {} }, Dimensions: { get: () => ({ width: 360, height: 800 }) } };
function component(file, modules, extra = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(mobile, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  vm.runInNewContext(source, { exports, require(name) {
    if (name.includes('jsx-runtime')) return { jsx, jsxs: jsx };
    if (name in modules) return modules[name];
    throw new Error(`Missing component boundary: ${name}`);
  }, Error, ...extra });
  return exports.default;
}
test('opening comments, typing and restoring full size keep one player and one VideoView without seeking or pausing', () => {
  const rt = runtime(), calls = [], timers = new Map(); let allocations = 0;
  const player = { currentTime: 95, play: () => calls.push('play'), pause: () => calls.push('pause') };
  const Card = component('components/VideoCard.tsx', {
    react: { ...rt.hooks, createElement: element }, 'react-native': native,
    '@expo/vector-icons': { Feather: 'Feather' }, '../hooks/useVideoFeed': { formatCount: String },
    './VideoActions': { __esModule: true, default: 'VideoActions' }, './VideoInfo': { __esModule: true, default: 'VideoInfo' },
    'expo-video': { VideoView: 'VideoView', useVideoPlayer(uri, setup) { const ref = rt.hooks.useRef(null); if (!ref.current) { allocations++; ref.current = player; setup(player); } return ref.current; } },
    'react-native-reanimated': { __esModule: true, default: { View: 'AnimatedView' }, useSharedValue(value) { return rt.hooks.useRef({ value }).current; }, useAnimatedStyle(fn) { return fn(); }, withSpring: value => value },
  }, { setTimeout: fn => { const id = Symbol(); timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id), setInterval: () => 1, clearInterval() {} });
  const props = { video: { uri: 'https://video.test/clip.mp4', likes: 1, comments: 2, shares: 0 }, isActive: true, isGuest: false };
  const render = () => rt.render(() => Card(props), tree => { tree.props.ref.current = { measureInWindow: fn => fn(0, 24, 360, 800) }; });
  let tree = render(); assert.equal(nodes(tree).filter(n => n.type === 'VideoView').length, 1);
  for (const previewFrame of [{ x: 117, y: 44, width: 126, height: 224 }, { x: 143, y: 36, width: 74, height: 132 }, null]) {
    props.previewFrame = previewFrame; tree = render();
    const views = nodes(tree).filter(n => n.type === 'VideoView'); assert.equal(views.length, 1); assert.equal(views[0].props.player, player);
    assert.equal(player.currentTime, 95);
  }
  assert.equal(allocations, 1); assert.deepEqual(calls, ['play']);
  tree.props.onPress(); [...timers.values()].forEach(fn => fn()); timers.clear(); render();
  const pausedCalls = calls.length; props.previewFrame = { x: 117, y: 44, width: 126, height: 224 }; render();
  assert.equal(calls.length, pausedCalls, 'A paused video stays paused in the preview'); assert.equal(player.currentTime, 95);
});
test('the authenticated creator + follows only other unfollowed users and is disabled during a request', () => {
  const rt = runtime(); let follows = 0;
  const animation = () => ({ start() {}, stop() {} });
  const Actions = component('components/VideoActions.tsx', {
    react: { ...rt.hooks, createElement: element }, 'react-native': { ...native, Animated: { Value: class {}, View: 'AnimatedView', timing: animation, sequence: animation, loop: animation } },
    '@expo/vector-icons': { Feather: 'Feather', MaterialCommunityIcons: 'Icon' }, 'expo-linear-gradient': { LinearGradient: 'Gradient' }, 'expo-haptics': {},
  });
  const props = { isGuest: false, isOwner: false, isFollowing: false, onFollow: () => follows++ };
  const follow = () => nodes(rt.render(() => Actions(props))).find(n => n.props?.accessibilityLabel === 'Seguir creador');
  assert.ok(follow()); follow().props.onPress(); assert.equal(follows, 1);
  props.followPending = true; assert.equal(follow().props.disabled, true);
  props.isFollowing = true; assert.equal(follow(), undefined);
  props.isFollowing = false; props.isOwner = true; assert.equal(follow(), undefined);
  props.isGuest = true; assert.ok(follow());
});
test('photo selection is retained on upload failure, saved explicitly on retry and hooks survive sign-out', async () => {
  const rt = runtime(), state = { user: { id: 'actor', email: 'person@example.test' }, fail: true }; let writes = 0, backs = 0, refreshes = 0;
  const profile = { username: 'Raul', bio: '', avatar_url: 'https://photo.test/old.jpg' };
  const Edit = component('app/edit-profile.tsx', {
    react: { ...rt.hooks, createElement: element }, 'react-native': native, '@expo/vector-icons': { Feather: 'Feather' },
    'expo-router': { router: { back: () => backs++ } }, 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 24 }) },
    '../context/AuthContext': { useAuth: () => ({ user: state.user, profile, refreshProfile: async confirm => { assert.equal(confirm, true); refreshes++; } }) },
    '../lib/features/auth/services/registrationBridge': { requestRegistration() {} }, '../lib/supabase': { supabase: { auth: { updateUser() { throw new Error('An avatar change should not modify auth metadata'); } } } },
    'expo-image-picker': { requestMediaLibraryPermissionsAsync: async () => ({ status: 'granted' }), launchImageLibraryAsync: async options => { assert.equal(options.base64, true); return { canceled: false, assets: [{ uri: 'file:///selected.jpg', base64: 'chosen-photo' }] }; } },
    '../lib/features/profile/avatar': { uploadProfileAvatar: async () => { if (state.fail) throw new Error('Upload failed'); return 'https://photo.test/new.jpg'; }, saveProfileChanges: async (id, updates) => { writes++; assert.equal(id, 'actor'); assert.equal(updates.avatar_url, 'https://photo.test/new.jpg'); } },
  });
  const render = () => rt.render(() => Edit());
  const button = label => nodes(render()).find(n => n.props?.accessibilityLabel === label);
  await button('Seleccionar foto de perfil').props.onPress(); await button('Guardar perfil').props.onPress();
  assert.equal(writes, 0); assert.equal(backs, 0); assert.ok(nodes(render()).some(n => n.props?.source?.uri === 'file:///selected.jpg'));
  state.fail = false; await button('Guardar perfil').props.onPress(); assert.equal(writes, 1); assert.equal(refreshes, 1); assert.equal(backs, 1);
  state.user = null; assert.equal(render(), null);
});
