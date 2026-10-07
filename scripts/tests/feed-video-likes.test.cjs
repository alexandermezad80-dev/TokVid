const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
function load(relative, names, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../../artifacts/mobile', relative), 'utf8').replace(/^import .*;\n/gm, '').replace(/export (?=(?:async )?function |const )/g, '');
  const exports = {};
  if (relative !== 'lib/realtimeSubscriptions.ts' && globals.supabase) {
    Object.assign(globals, load('lib/realtimeSubscriptions.ts', ['createDatabaseChannel'], { supabase: globals.supabase }));
  }
  vm.runInNewContext(stripTypeScriptTypes(source, { mode: 'transform' }) + `\nObject.assign(exports, {${names.join(',')}});`, { exports, Error, setTimeout, clearTimeout, ...globals });
  return exports;
}
function service(responder) {
  const calls = [];
  const supabase = {
    async rpc(name, args) { const call = { name, args }; calls.push(call); return responder(call); },
    from(table) {
      const call = { table, filters: [] };
      const query = { select() { return query; }, eq(...value) { call.filters.push(value); return query; }, in(...value) { call.filters.push(value); return query; }, then(resolve, reject) { calls.push(call); return Promise.resolve(responder(call)).then(resolve, reject); } };
      return query;
    },
  };
  return { calls, ...load('lib/features/feed/videoLikes.ts', ['readVideoLikes', 'setVideoLike'], { supabase }) };
}
test('Feed counters come from confirmed totals and own likes, including demo video IDs', async () => {
  const s = service(call => ({ error: null, data: call.table ? [{ video_id: '1' }] : call.args.p_video_ids.map(video_id => ({ video_id, total: video_id === '1' ? 7 : 0 })) }));
  const result = await s.readVideoLikes(['1', '2'], 'actor');
  assert.equal(result.counts['1'], 7); assert.equal(result.counts['2'], 0); assert.ok(result.liked.has('1'));
  assert.equal(s.calls.find(call => call.table).filters[0][1], 'actor');
  const many = await s.readVideoLikes(Array.from({ length: 230 }, (_, i) => String(i)), 'actor');
  assert.equal(Object.keys(many.counts).length, 230);
  assert.ok(s.calls.filter(call => call.name).every(call => call.args.p_video_ids.length <= 100));
});
test('unknown or failed totals cannot become invented zero/demo counts', async () => {
  const missing = service(() => ({ data: [], error: null }));
  await assert.rejects(missing.readVideoLikes(['1']), /confirmar/);
  const failure = service(() => ({ data: null, error: { message: 'Disconnected' } }));
  await assert.rejects(failure.readVideoLikes(['1']), /Disconnected/);
});
test('a video Like sets the desired state and requires a canonical server result', async () => {
  const s = service(call => ({ data: [{ video_id: call.args.p_video_id, liked: call.args.p_liked, total: 1 }], error: null }));
  assert.equal((await s.setVideoLike('1', true)).total, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(s.calls[0])), { name: 'set_feed_video_like', args: { p_video_id: '1', p_liked: true } });
  const wrong = service(() => ({ data: [{ video_id: 'other', total: 0, liked: true }], error: null }));
  await assert.rejects(wrong.setVideoLike('1', true), /confirmar/);
});
function runtime() {
  const slots = []; let cursor = 0, dirty = true, effects = [], render, output;
  const same = (a, b) => a && a.length === b.length && b.every((value, i) => Object.is(value, a[i]));
  const hooks = {
    useState(initial) { const i = cursor++; if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, next => { const value = typeof next === 'function' ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; } }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(callback, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { value: callback, deps }; return slots[i].value; },
    useEffect(effect, deps) { const i = cursor++; const previous = slots[i]; if (!same(previous?.deps, deps)) { slots[i] = { deps, cleanup: previous?.cleanup }; effects.push(() => { slots[i].cleanup?.(); slots[i].cleanup = effect(); }); } },
  };
  return { hooks, mount(fn) { render = fn; dirty = true; }, update() { dirty = true; }, get output() { return output; }, async flush() { for (let turn = 0; turn < 20; turn++) { if (dirty) { cursor = 0; dirty = false; effects = []; output = render(); effects.forEach(fn => fn()); } await new Promise(resolve => setImmediate(resolve)); } assert.equal(dirty, false); }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function hook(overrides = {}) {
  const rt = runtime(); const state = { user: { id: 'actor' }, liked: false, total: 0 }; const calls = [];
  const channel = { on() { return channel; }, subscribe() { return channel; } };
  const services = {
    async readVideoLikes() { return { counts: { '1': state.total }, liked: new Set(state.liked ? ['1'] : []) }; },
    async setVideoLike(id, liked) { calls.push({ id, liked }); state.liked = liked; state.total = liked ? 1 : 0; return { video_id: id, liked, total: state.total }; }, ...overrides,
  };
  const { useFeedVideoLikes } = load('hooks/useFeedVideoLikes.ts', ['useFeedVideoLikes'], { ...rt.hooks, ...services, useAuth: () => ({ user: state.user }), useRegistration: () => ({ completed: null }), AppState: { addEventListener: () => ({ remove() {} }) }, supabase: { channel: () => channel, removeChannel: async () => {} } });
  rt.mount(() => useFeedVideoLikes(['1']));
  return { rt, state, calls };
}
test('fast repeated taps issue one write and counters change only after confirmation', async () => {
  const pending = deferred(); let calls = 0;
  const h = hook({ setVideoLike: () => { calls++; return pending.promise; } }); await h.rt.flush();
  const first = h.rt.output.toggleLike('1'); await h.rt.output.toggleLike('1'); await h.rt.flush();
  assert.equal(calls, 1); assert.equal(h.rt.output.counts['1'], 0); assert.equal(h.rt.output.likedIds.has('1'), false);
  h.state.total = 1; h.state.liked = true; pending.resolve({ video_id: '1', total: 1, liked: true }); await first; await h.rt.flush();
  assert.equal(h.rt.output.counts['1'], 1); assert.equal(h.rt.output.likedIds.has('1'), true); h.rt.unmount();
});
test('a failed Like preserves canonical state and its error survives background reads', async () => {
  const h = hook({ async setVideoLike() { throw new Error('Like failed'); } }); await h.rt.flush();
  await h.rt.output.toggleLike('1'); await h.rt.flush(); await h.rt.output.reload(); await h.rt.flush();
  assert.equal(h.rt.output.counts['1'], 0); assert.equal(h.rt.output.likedIds.has('1'), false); assert.match(h.rt.output.error, /Like failed/); h.rt.unmount();
});
test('late Like confirmation cannot change another account state', async () => {
  const pending = deferred(); const h = hook({ setVideoLike: () => pending.promise }); await h.rt.flush();
  const first = h.rt.output.toggleLike('1'); h.state.user = { id: 'other' }; h.rt.update(); await h.rt.flush();
  pending.resolve({ video_id: '1', liked: true, total: 1 }); await first; await h.rt.flush();
  assert.equal(h.rt.output.likedIds.has('1'), false); assert.equal(h.rt.output.counts['1'], 0); h.rt.unmount();
});

