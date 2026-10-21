const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../../artifacts/mobile');
const element = (type, props, ...children) => {
  if (type === 'EmojiStrip') children = props.recent.map(emoji => ({type:'Pressable',props:{accessibilityLabel:`Añadir emoji ${emoji} al comentario`,onPress:()=>props.onSelect(emoji)}}));
  return { type, props: { ...props, ...(children.length ? { children } : {}) } };
};
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const flatten = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
function pure(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports });
  return exports;
}
function harness({ hidden = false, safeBottom = 24, roots = [], width = 360 } = {}) {
  const props = { visible: true, videoId: 'video' };
  const slots = []; let cursor = 0, effects = [], dirty = false, last, keyboardVisible = false;
  const calls = { publish: [], edit: [], like: [], remove: [], removeForMe: [], hide: [], restore: 0, dismiss: 0, focus: 0, blur: 0, close: 0, routes: [], copy: [], save: 0 };
  const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const hooks = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, next => { const value = typeof next === 'function' ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; } }]; },
    useRef(current) { return slots[cursor++] ??= { current }; },
    useMemo(fn) { return fn(); },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) { slots[i] = { deps }; effects.push(fn); } },
  };
  const viewport = { fullHeight: 802, availableHeight: 802, viewportTop: 0, keyboardInset: 0, keyboardVisible: false,
    insets: { top: 25, bottom: safeBottom, left: 0, right: 0 }, viewportRef: { current: { measureInWindow(fn) { fn(0, 0); } } }, onLayout() {} };
  const comments = { roots, threads: {}, expanded: new Set(), dismissedComments: new Set(), hiddenThreads: new Set(hidden ? ['hidden'] : []), liked: new Set(), pendingLikes: new Set(), loading: false, sending: false, mutating: false, paging: false, hasMore: false, error: null, total: roots.length, publicationOwnerId: 'owner',
    publish: async (...args) => { calls.publish.push(args); const row = { id: 'confirmed' }; args[2]?.(row); return row; }, edit: async (...args) => { calls.edit.push(args); return true; },
    like: row => calls.like.push(row.id), remove: async row => { calls.remove.push(row.id); return true; }, removeForMe: async row => { calls.removeForMe.push(row.id); return true; }, hideThread: row => calls.hide.push(row.id),
    restoreThreads: () => { calls.restore++; }, toggleThread() {}, moreReplies() {}, loadMore() {}, refresh() {},
  };
  const native = Object.fromEntries(['ActivityIndicator', 'FlatList', 'Image', 'Modal', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View'].map(k => [k, k]));
  Object.assign(native, { Alert: { alert() {} }, Dimensions: { get: () => ({ width, height: 802 }) }, useWindowDimensions: () => ({ width, height: 802, fontScale: 1 }),
    Keyboard: { dismiss() { calls.dismiss++; } }, StyleSheet: { create: x => x, hairlineWidth: 0.5, absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } } });
  const model = pure('lib/features/comments/model.ts');
  const mocks = {
    react: { ...hooks, createElement: element, default: { createElement: element } }, 'react/jsx-runtime': { jsx: (t, p) => element(t, p), jsxs: (t, p) => element(t, p) },
    'react-native': native, '@expo/vector-icons': { Feather: 'Feather', Ionicons: 'Ionicons' }, 'expo-blur': { BlurView: 'BlurView' },
    'react-native-svg': { __esModule: true, default: 'Svg', Line: 'Line' },
    'expo-clipboard': { setStringAsync: async text => { calls.copy.push(text); } },
    'expo-router': { router: { push: x => calls.routes.push(x) } }, 'react-native-keyboard-controller': { KeyboardProvider: 'KeyboardProvider' },
    'react-native-reanimated': { __esModule: true, default: { View: 'AnimatedView', createAnimatedComponent: x => x }, FadeIn: { duration: () => ({}) }, LinearTransition: { duration: () => ({}) }, View: 'AnimatedView', useAnimatedStyle: fn => fn(), useSharedValue: value => hooks.useRef({ value }).current, withTiming: x => x, Easing: { out: x => x, cubic: x => x } },
    './CommentEmojiPicker': { __esModule: true, default: 'EmojiPicker' },
    './CommentPhoto': { __esModule: true, default: 'CommentPhoto' },
    '../hooks/useCommentDictation': { useCommentDictation: () => ({ listening: false, toggle() {}, cancel() {} }) },
    '../lib/commentComposerText': pure('lib/commentComposerText.ts'),
    '../lib/features/comments/composerTools': { pickCommentPhoto: async () => ({ uri: 'file://photo.jpg', path: null }), uploadCommentPhoto: async () => 'me/photo.jpg', discardCommentPhoto: async () => {}, suggestCommentMentions: async () => [], commentMentionProfile: async () => null },
    './CommentEmojiStrip': { __esModule: true, default: 'EmojiStrip' },
    './CommentActionsPopover': { __esModule: true, default: 'Popover' }, '../lib/commentPopoverGeometry': pure('lib/commentPopoverGeometry.ts'),
    '../constants/palette': { palette: { text: '#0E1216', secondary: '#6B7580', teal: '#15868B', destructive: '#FE0979', button: '#0E1216', onButton: '#FFFFFF', magenta: '#FE0979' } },
    '../context/RegistrationContext': { useRegistration: () => ({ tabBarHeight: 70 }) }, '../context/AuthContext': { useAuth: () => ({ user: { id: 'me' }, profile: { username: 'Alexander', avatar_url: null } }) },
    '../hooks/useSystemNavigation': { useSystemNavigation() {} },
    '../hooks/useCommentKeyboardMotion': { useCommentKeyboardMotion: () => ({ height: { value: viewport.keyboardInset }, progress: { value: keyboardVisible ? 1 : 0 }, bodyOpacity: { value: keyboardVisible ? 0 : 1 }, controlsOpacity: { value: keyboardVisible ? 1 : 0 }, controlsOpen: keyboardVisible }) },
    '../hooks/useRecentCommentEmojis': { useRecentCommentEmojis: () => { const [recent, setRecent] = hooks.useState(pure('lib/commentRecentEmojis.ts').DEFAULT_COMMENT_EMOJIS); return { recent, remember: used => { if (used.length) setRecent(pure('lib/commentRecentEmojis.ts').rememberCommentEmojis(recent, used)); } }; } },
    '../lib/commentSheetMotion': pure('lib/commentSheetMotion.ts'), '../lib/commentRecentEmojis': pure('lib/commentRecentEmojis.ts'),
    '../hooks/useFeedComments': { useFeedComments: () => comments }, '../hooks/useOverlayKeyboard': { useOverlayKeyboard: () => viewport },
    '../lib/features/auth/services/registrationBridge': { requestRegistration() {} }, '../lib/features/comments/model': model,
    '../lib/commentVideoLayout': pure('lib/commentVideoLayout.ts'), '../lib/commentsGlassGeometry': pure('lib/commentsGlassGeometry.ts'),
  };
  const exports = {};
  const source = fs.readFileSync(path.join(root, 'components/CommentsSheet.tsx'), 'utf8') + '\nexport { CommentsPanel, styles };';
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, require(name) { if (name.endsWith('/jsx-runtime')) return mocks['react/jsx-runtime']; if (!(name in mocks)) throw Error('Missing UI boundary: ' + name); return mocks[name]; }, setTimeout, clearTimeout, requestAnimationFrame: fn => { fn(); return 1; }, cancelAnimationFrame() {} });
  const attach = node => {
    if (node.props?.ref) {
      const instance = node.type === 'TextInput' ? { focus() { calls.focus++; }, blur() { calls.blur++; } } : { measureInWindow(fn) { fn(0, 400, 360, 70); }, scrollToIndex() {}, scrollToOffset() {} };
      if (node.props.ref === viewport.viewportRef) instance.measureInWindow = fn => fn(0, 0);
      if (typeof node.props.ref === 'function') node.props.ref(instance); else node.props.ref.current = instance;
    }
  };
  function render() {
    for (let iteration = 0; iteration < 6; iteration++) {
      cursor = 0; effects = []; dirty = false;
      last = exports.CommentsPanel({ onSaveVideo: () => calls.save++, ...props, onClose: () => calls.close++, showVideoPreview: true, backHandler: { current() {} } });
      nodes(last).forEach(attach);
      const list = nodes(last).find(n => n.type === 'FlatList');
      for (const item of list.props.data) nodes(list.props.renderItem({ item })).forEach(attach);
      effects.forEach(fn => fn());
      if (!dirty && effects.length === 0) break;
    }
    return last;
  }
  return { props, calls, comments, styles: exports.styles, viewport, render, nodes: () => nodes(last), input: () => nodes(last).find(n => n.type === 'TextInput'),
    openKeyboard(height = 330.5) { keyboardVisible = true; Object.assign(viewport, { keyboardVisible, keyboardInset: height, availableHeight: 802 - height }); return render(); },
    closeKeyboard() { keyboardVisible = false; Object.assign(viewport, { keyboardVisible, keyboardInset: 0, availableHeight: 802 }); return render(); },
    rowNodes(index = 0) { const list = nodes(last).find(n => n.type === 'FlatList'); return nodes(list.props.renderItem({ item: list.props.data[index] })); },
  };
}
module.exports = { harness, nodes, flatten };
