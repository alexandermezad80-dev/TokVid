const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

const mobile = path.join(__dirname, '../../artifacts/mobile');
const storageKey = 'tokvid_seamless_pending_v1';

// Exercise the real coordinator and callback effects. Replace only the JSX
// rendering boundary: these tests do not emulate native views or a phone.
function loadComponent(relativePath, jsxStart, renderResult, exportsName, mocks) {
  const file = path.join(mobile, relativePath);
  let source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf(jsxStart);
  const end = source.indexOf('\n  );', start);
  assert.ok(start >= 0 && end > start, 'Expected component rendering boundary');
  source = source.slice(0, start) + `  return ${renderResult};` + source.slice(end + '\n  );'.length);
  source = source.replace(/^import .*;\n/gm, '').replace(/export default function /g, 'function ').replace(/export function /g, 'function ');
  const exports = {};
  vm.runInNewContext(stripTypeScriptTypes(source, { mode: 'transform', sourceUrl: file }) + `\nexports.component = ${exportsName};`, {
    ...mocks, exports, setTimeout, URL, URLSearchParams,
  });
  return exports.component;
}

function hookRuntime() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let dirty = true;
  let component;
  let output;
  const hooks = {
    createContext: () => ({}),
    useContext: () => null,
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, next => {
        const value = typeof next === 'function' ? next(slots[index].value) : next;
        if (!Object.is(value, slots[index].value)) { slots[index].value = value; dirty = true; }
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback(callback) { cursor++; return callback; },
    useEffect(effect, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        slots[index] = { deps, cleanup: previous?.cleanup };
        effects.push(() => { slots[index].cleanup?.(); slots[index].cleanup = effect(); });
      }
    },
  };
  return {
    hooks,
    mount(next) { component = next; dirty = true; },
    update() { dirty = true; },
    get output() { return output; },
    async flush() {
      for (let turn = 0; turn < 12; turn++) {
        if (dirty) {
          cursor = 0; effects = []; dirty = false;
          output = component({ children: null });
          for (const effect of effects) effect();
        }
        await new Promise(resolve => setImmediate(resolve));
      }
      assert.equal(dirty, false, 'Coordinator settled');
    },
  };
}

async function registration(cached) {
  const runtime = hookRuntime();
  const storage = new Map(cached ? [[storageKey, JSON.stringify(cached)]] : []);
  const navigation = [];
  const applied = [];
  let user = null;
  let request;
  const router = { replace: route => navigation.push(route) };
  const provider = loadComponent('context/RegistrationContext.tsx', '  return (\n    <Context.Provider',
    '{ visible, completed, cancel, getAuthDestination, setFeedContext, registerPlayback, beforeAuth: () => storageWrite.current }', 'RegistrationProvider', {
      ...runtime.hooks, router, useAuth: () => ({ user }),
      AsyncStorage: { getItem: async key => storage.get(key) ?? null, setItem: async (key, value) => storage.set(key, value), removeItem: async key => storage.delete(key) },
      applyPendingAction: async (userId, intent) => applied.push({ userId, intent }),
      installRegistrationHandler: handler => { request = handler; },
    });
  runtime.mount(provider);
  await runtime.flush();
  return {
    runtime, storage, navigation, applied, router,
    request: intent => request(intent),
    async authenticate(id = 'email-user') { user = { id }; runtime.update(); await runtime.flush(); },
  };
}

for (const kind of ['register', 'like', 'follow', 'favorite', 'comment', 'profile']) {
  test(`email completion from ${kind} stays on the Feed with the exact playback snapshot`, async () => {
    const state = await registration();
    state.runtime.output.setFeedContext('older-video', 1, false);
    state.runtime.output.registerPlayback('current-video', () => ({ position: 42.75, wasPaused: true }));
    state.request({ kind, creatorId: 'creator' });
    await state.runtime.flush();
    await state.runtime.output.beforeAuth();
    assert.equal(state.runtime.output.getAuthDestination(), '/(tabs)');
    const saved = JSON.parse(state.storage.get(storageKey));
    await state.authenticate();
    assert.equal(state.runtime.output.visible, false);
    assert.equal(state.runtime.output.completed.videoId, 'current-video');
    assert.equal(state.runtime.output.completed.position, 42.75);
    assert.equal(state.runtime.output.completed.wasPaused, true);
    assert.equal(state.runtime.output.completed.requestId, saved.requestId);
    assert.equal(state.storage.has(storageKey), false);
    assert.deepEqual(state.navigation, [], 'OTP must not navigate away from the underlying Feed');
    assert.equal(state.applied.length, 1);
    await state.authenticate();
    assert.equal(state.applied.length, 1, 'An additional Auth event cannot replay a consumed intention');
  });
}

test('a profile intention cached by the previous APK also returns to the same Feed context', async () => {
  const state = await registration({ kind: 'profile', videoId: 'saved-video', position: 19.5, wasPaused: false, requestId: 'older-apk' });
  assert.equal(state.runtime.output.getAuthDestination(), '/(tabs)');
  await state.authenticate();
  assert.equal(state.runtime.output.completed.videoId, 'saved-video');
  assert.equal(state.runtime.output.completed.position, 19.5);
  assert.equal(state.runtime.output.completed.wasPaused, false);
  assert.deepEqual(state.navigation, []);
});

test('closing registration discards a profile intention before any later Auth event', async () => {
  const state = await registration();
  state.request({ kind: 'profile', videoId: 'video', position: 12 });
  await state.runtime.flush();
  state.runtime.output.cancel();
  await state.runtime.flush();
  await state.runtime.output.beforeAuth();
  assert.equal(state.storage.has(storageKey), false);
  await state.authenticate();
  assert.equal(state.runtime.output.completed, null);
  assert.equal(state.applied.length, 0);
  assert.deepEqual(state.navigation, []);
});

test('the real Google callback uses the same Feed destination after a profile entry', async () => {
  const state = await registration();
  state.runtime.output.setFeedContext('google-video', 27.25, false);
  state.request({ kind: 'profile' });
  await state.runtime.flush();
  const callbackRuntime = hookRuntime();
  const callback = loadComponent('app/auth/callback.tsx', '  return (\n    <View', 'null', 'AuthCallback', {
    ...callbackRuntime.hooks, router: state.router,
    useRegistration: () => ({ getAuthDestination: state.runtime.output.getAuthDestination }),
    useLocalSearchParams: () => ({ code: 'pkce-code' }),
    Linking: { useURL: () => null, createURL: () => 'mobile:///auth/callback' },
    Platform: { OS: 'android' },
    StyleSheet: { create: styles => styles },
    completeAuthCallback: async () => state.authenticate('google-user'),
  });
  callbackRuntime.mount(callback);
  await callbackRuntime.flush();
  await state.runtime.flush();
  await callbackRuntime.flush();
  assert.deepEqual(state.navigation, ['/(tabs)']);
  assert.equal(state.runtime.output.completed.videoId, 'google-video');
  assert.equal(state.runtime.output.completed.position, 27.25);
});
