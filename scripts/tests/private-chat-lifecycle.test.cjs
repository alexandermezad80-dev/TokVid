const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const root = path.join(__dirname, '../../artifacts/mobile');
function load(file, names, globals = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/^import .*\n/gm, '').replace(/^export /gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source, { mode: 'transform' }) + '\nObject.assign(exports,{' + names.join(',') + '});', { exports, Error, ...globals });
  return exports;
}
const model = load('lib/features/messages/model.ts', ['mergePrivateMessages']);
const message = id => ({ id, conversation_id: 'room', sender_id: 'actor', text: id, created_at: '2026-10-09T00:00:00Z', read_by_other: false });
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function harness(inbox = false) {
  const state = [], refs = [], channels = [], intervals = new Set();
  let si = 0, ri = 0, focus, appListener, api, reads = 0, serial = 0;
  let rows = [], read = async () => rows, send = async draft => ({ ...draft, created_at: '2026-10-09T00:00:01Z' });
  const db = {
    from(table) {
      const query = { select() { return this; }, eq() { return this; }, in() { return this; }, neq() { return this; }, update() { return this; },
        single: async () => ({ data: { id: 'room', user1_id: 'actor', user2_id: 'recipient' } }),
        maybeSingle: async () => ({ data: { username: 'Recipient', avatar_url: null } }),
        then(resolve) { resolve({ data: [] }); } };
      assert.ok(['conversations', 'profiles', 'messages'].includes(table), 'Notification navigation is not involved');
      return query;
    },
    channel(topic) {
      const c = { topic, bindings: [], on(type, filter, callback) { this.bindings.push({ filter, callback }); return this; }, subscribe(callback) { this.status = callback; return this; } };
      channels.push(c); return c;
    },
    removeChannel: async () => {},
  };
  const helper = load('lib/realtimeSubscriptions.ts', ['createDatabaseChannel'], { supabase: db });
  const name = inbox ? 'usePrivateInbox' : 'usePrivateChat';
  const hook = load(`hooks/${name}.ts`, [name], {
    ...model, ...helper, supabase: db,
    useState(initial) { const i = si++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
    useRef(initial) { const i = ri++; return refs[i] ??= { current: initial }; },
    useCallback: fn => fn, useFocusEffect: fn => { focus = fn; },
    AppState: { currentState: 'active', addEventListener: (_, fn) => { appListener = fn; return { remove() {} }; } },
    readPrivateMessages: async () => { reads++; return read(); }, readPrivateInbox: async () => { reads++; return read(); },
    sendPrivateMessage: draft => send(draft), removePrivateMessages: async () => {}, publicationId: () => `send-${++serial}`,
    setInterval: fn => { intervals.add(fn); return fn; }, clearInterval: fn => intervals.delete(fn),
  })[name];
  const render = () => { si = 0; ri = 0; api = inbox ? hook('actor') : hook('room', 'actor'); return api; };
  render();
  return { render, channels, intervals, mount: () => focus(), get reads() { return reads; },
    rows(value) { rows = value; }, read(fn) { read = fn; }, send(fn) { send = fn; }, resume: () => appListener('active') };
}
test('an open chat receives new messages and removals without visiting notifications', async () => {
  const h = harness(); h.rows([message('first')]); const cleanup = h.mount(); await settle();
  assert.equal(h.render().messages.length, 1);
  h.rows([message('first'), { ...message('reply'), sender_id: 'recipient' }]);
  h.channels[0].bindings.find(b => b.filter.event === 'INSERT').callback({}); await settle();
  assert.equal(h.render().messages.length, 2);
  h.rows([message('reply')]); h.channels[0].bindings.find(b => b.filter.event === 'UPDATE').callback({}); await settle();
  assert.equal(h.render().messages[0].id, 'reply'); cleanup();
});
test('inbox receives a new conversation directly and recovers missed events on resume', async () => {
  const h = harness(true); const cleanup = h.mount(); await settle();
  h.rows([{ id: 'room', last_message: 'hello', unread_count: 1 }]);
  h.channels[0].bindings[0].callback({}); await settle(); assert.equal(h.render().conversations[0].unread_count, 1);
  h.rows([{ id: 'room', last_message: 'second', unread_count: 2 }]); h.resume(); await settle();
  assert.equal(h.render().conversations[0].last_message, 'second'); cleanup();
});
test('late events and old fetches cannot write after focus cleanup or reuse a subscribed topic', async () => {
  const h = harness(true); let resolve; h.read(() => new Promise(done => { resolve = done; }));
  const cleanup = h.mount(); const first = h.channels[0]; cleanup();
  const reads = h.reads; first.bindings[0].callback({}); first.status('SUBSCRIBED'); assert.equal(h.reads, reads);
  resolve([{ id: 'stale' }]); await settle(); assert.equal(h.render().conversations.length, 0);
  h.read(async () => []); const secondCleanup = h.mount(); await settle(); assert.notEqual(first.topic, h.channels[1].topic);
  secondCleanup(); assert.equal(h.intervals.size, 0);
});
test('failed sends keep a stable retry id and stale refreshes do not erase a confirmed send', async () => {
  const h = harness(); const cleanup = h.mount(); await settle(); let api = h.render();
  let firstId; h.send(async draft => { firstId = draft.id; throw Error('offline'); });
  assert.equal(await api.send('hello'), false);
  let finishRead; h.read(() => new Promise(resolve => { finishRead = resolve; })); const staleRefresh = api.refresh();
  h.send(async draft => { assert.equal(draft.id, firstId); return { ...draft, created_at: '2026-10-09T00:00:01Z' }; });
  api = h.render(); assert.equal(await api.send('hello'), true);
  finishRead([]); await staleRefresh;
  assert.equal(h.render().messages.length, 1); assert.equal(h.render().messages[0].text, 'hello'); cleanup();
});
