const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire, stripTypeScriptTypes } = require('node:module');
const mobile = path.join(__dirname, '../../artifacts/mobile');
const library = process.env.TOKVID_REALTIME_LIBRARY || path.dirname(createRequire(
  require.resolve('@supabase/supabase-js', { paths: [mobile] })
).resolve('@supabase/realtime-js'));

// Execute the installed library's topic cache and callback guard. Only the
// transport and asynchronous removal timing are controlled; no socket opens.
function loadLibrary(file, channelFactory) {
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(library, file), 'utf8'), {
    exports,
    require(name) {
      if (name === 'tslib') return { __importDefault: value => ({ default: value }), __importStar: value => value };
      if (name === './RealtimeChannel') return channelFactory;
      return {};
    },
  });
  return exports.default;
}
function load(relative, names, globals = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(mobile, relative), 'utf8')
    .replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source, { mode: 'transform' }) +
    `\nObject.assign(exports,{${names.join(',')}});`, { exports, Error, ...globals });
  return exports;
}
function harness(file, name, args) {
  const Channel = loadLibrary('RealtimeChannel.js');
  const removals = [], timers = new Map(), effects = [];
  function transportChannel(topic, params, socket) {
    const channel = Object.create(Channel.prototype);
    Object.assign(channel, {
      topic, params, socket, joined: false, bindings: [],
      channelAdapter: { isJoined: () => channel.joined, isJoining: () => false },
      _on(type, filter, callback) { this.bindings.push({ type, filter, callback }); return this; },
      subscribe(callback) { this.joined = true; this.status = callback; return this; },
      unsubscribe() { return new Promise(resolve => removals.push(() => { this.joined = false; socket._remove(this); resolve('ok'); })); },
      teardown() {},
    });
    return channel;
  }
  const Client = loadLibrary('RealtimeClient.js', transportChannel);
  const client = Object.create(Client.prototype);
  Object.assign(client, { channels: [], _cancelPendingDisconnect() {}, _schedulePendingDisconnect() {}, log() {} });
  const helper = load('lib/realtimeSubscriptions.ts', ['createDatabaseChannel'], { supabase: client });
  const model = load('lib/features/comments/model.ts', ['COMMENT_PAGE_SIZE', 'REPLY_PAGE_SIZE', 'commentCapabilities', 'mergeComments']);
  const hooks = load(file, [name], {
    supabase: client, ...helper, ...model,
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: current => ({ current }), useCallback: callback => callback,
    useEffect: effect => effects.push(effect),
    useAuth: () => ({ user: { id: 'actor' } }), useRegistration: () => ({ completed: null }),
    AppState: { addEventListener: () => ({ remove() {} }) },
    readCommentCounts: async () => ({}), readVideoLikes: async () => ({ counts: {}, liked: new Set() }),
    readComments: async () => ({ rows: [], total: 0, hasMore: false }), readReplies: async () => ({ rows: [], hasMore: false }),
    readPublicationOwner: async () => null, readOwnCommentLikes: async () => new Set(), readHiddenThreads: async () => new Set(),
    setTimeout: callback => { const id = Symbol('timer'); timers.set(id, callback); return id; },
    clearTimeout: id => timers.delete(id),
  });
  return {
    client, timers,
    setup() { hooks[name](...args); const cleanups = effects.splice(0).map(effect => effect()).filter(Boolean); return () => cleanups.forEach(fn => fn()); },
    async finishRemovals() { removals.splice(0).forEach(finish => finish()); await Promise.resolve(); },
  };
}
test('the installed Supabase cache reproduces the reported exception for a shared subscribed topic', () => {
  const h = harness('hooks/useFeedCommentCounts.ts', 'useFeedCommentCounts', [['v1']]);
  h.client.channel('feed-comment-counts').subscribe();
  assert.throws(() => h.client.channel('feed-comment-counts').on('postgres_changes', {}, () => {}),
    /cannot add `postgres_changes` callbacks for realtime:feed-comment-counts after `subscribe\(\)`/);
});
for (const [file, name, args, expectedBindings] of [
  ['hooks/useFeedCommentCounts.ts', 'useFeedCommentCounts', [['v1']], 1],
  ['hooks/useFeedComments.ts', 'useFeedComments', [true, 'v1'], 3],
  ['hooks/useFeedVideoLikes.ts', 'useFeedVideoLikes', [['v1']], 1],
]) {
  test(`${name} reconnects before previous cleanup finishes and keeps the replacement alive`, async () => {
    const h = harness(file, name, args, expectedBindings);
    const cleanup = h.setup(); const first = h.client.getChannels()[0]; cleanup();
    assert.doesNotThrow(() => h.setup()); const second = h.client.getChannels()[1];
    assert.notEqual(first.topic, second.topic); assert.equal(second.bindings.length, expectedBindings);
    first.bindings.forEach(binding => binding.callback({})); first.status?.('SUBSCRIBED');
    assert.equal(h.timers.size, 0, 'Late callbacks cannot refresh an inactive effect');
    await h.finishRemovals();
    assert.equal(h.client.getChannels().length, 1); assert.equal(h.client.getChannels()[0], second);
    second.bindings[0].callback({}); assert.equal(h.timers.size, 1);
  });
  test(`${name} supports overlapping mounts of the same account and video`, () => {
    const h = harness(file, name, args); h.setup(); assert.doesNotThrow(() => h.setup());
    const [first, second] = h.client.getChannels(); assert.notEqual(first.topic, second.topic);
  });
}
