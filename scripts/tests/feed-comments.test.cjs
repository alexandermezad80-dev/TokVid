const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const mobile = path.join(__dirname, '../../artifacts/mobile');
function load(relative, names, globals = {}) {
  let source = fs.readFileSync(path.join(mobile, relative), 'utf8').replace(/^import .*;\n/gm, '').replace(/export (?=(?:async )?function |const )/g, '');
  const exports = {};
  vm.runInNewContext(stripTypeScriptTypes(source, { mode: 'transform' }) + `\nObject.assign(exports, {${names.join(',')}});`, { exports, Error, setTimeout, clearTimeout, ...globals });
  return exports;
}
const model = load('lib/features/comments/model.ts', ['mergeComments', 'commentTime', 'commentLength', 'COMMENT_FIELDS', 'COMMENT_LIMIT', 'COMMENT_PAGE_SIZE', 'REPLY_PAGE_SIZE']);
const { keyboardSheetGeometry: geometry } = load('lib/keyboardSheetGeometry.ts', ['keyboardSheetGeometry']);
const row = (id = 'c1', overrides = {}) => ({ id, video_id: 'v1', user_id: 'u1', username: 'real-profile', avatar_url: null, text: 'Real content', created_at: '2026-10-07T00:00:00Z', parent_id: null, root_id: null, reply_to_username: null, likes_count: 0, reply_count: 0, ...overrides });

test('a shorter floating panel leaves video space and stays above the keyboard', () => {
  const rest = geometry({ viewportHeight: 800, viewportTop: 0, screenHeight: 800, keyboardTop: null, safeTop: 24, tabBarHeight: 70 });
  assert.equal(rest.commentsHeight, 480); assert.equal(rest.registrationGap, 82);
  const shown = geometry({ viewportHeight: 800, viewportTop: 0, screenHeight: 800, keyboardTop: 460, safeTop: 24, tabBarHeight: 70 });
  assert.equal(shown.keyboardInset, 340); assert.equal(shown.registrationGap, 12);
  assert.equal(460 - shown.registrationMaxHeight - shown.registrationGap, 36);
  assert.ok(shown.commentsHeight < 330);
  assert.ok(shown.commentsHeight + 36 + 8 <= 460);
});
test('Android resized windows do not subtract keyboard height twice', () => {
  const resized = geometry({ viewportHeight: 436, viewportTop: 24, screenHeight: 800, keyboardTop: 460, safeTop: 24, tabBarHeight: 70 });
  assert.equal(resized.keyboardInset, 0); assert.equal(resized.registrationMaxHeight, 412);
  const fullWindow = geometry({ viewportHeight: 800, viewportTop: 0, screenHeight: 800, keyboardTop: 460, safeTop: 24 });
  assert.equal(resized.commentsHeight, fullWindow.commentsHeight);
});
test('compact screens clamp the sheet above the status bar and keyboard', () => {
  for (const keyboardTop of [260, 180, 60]) {
    const result = geometry({ viewportHeight: 640, viewportTop: 0, screenHeight: 640, keyboardTop, safeTop: 24 });
    assert.ok(result.commentsHeight >= 0); assert.ok(result.commentsHeight + 36 <= keyboardTop);
    assert.ok(result.registrationMaxHeight + result.registrationGap + 36 <= keyboardTop);
  }
});
test('canonical rows replace duplicate events and Unicode length agrees with PostgreSQL', () => {
  const merged = model.mergeComments([row('a'), row('b')], [row('a', { likes_count: 2 })]);
  assert.equal(merged.length, 2); assert.equal(merged[0].id, 'b'); assert.equal(merged[1].likes_count, 2);
  assert.equal(model.commentLength('😀'.repeat(300)), 300);
  assert.equal(model.commentTime('2026-10-08T00:00:00Z', Date.parse('2026-10-07T00:00:00Z')), 'ahora');
});
function serviceHarness(responder) {
  const calls = [];
  const supabase = {
    from(table) {
      const spec = { table, filters: [], orders: [] };
      const query = {
        select(fields, options) { spec.fields = fields; spec.options = options; return query; },
        eq(...value) { spec.filters.push(value); return query; }, is(...value) { spec.filters.push(value); return query; },
        in(...value) { spec.filters.push(value); return query; }, order(...value) { spec.orders.push(value); return query; },
        or(value) { spec.cursor = value; return query; },
        range(start, end) { spec.range = [start, end]; return query; },
        then(resolve, reject) { calls.push(spec); return Promise.resolve().then(() => responder(spec)).then(resolve, reject); },
      }; return query;
    },
    async rpc(name, args) { const spec = { name, args }; calls.push(spec); return responder(spec); },
  };
  return { calls, ...load('lib/features/comments/services.ts', ['readComments', 'readReplies', 'readOwnCommentLikes', 'createComment', 'setCommentLike', 'readCommentCounts'], { supabase, ...model }) };
}
test('publishing sends no fabricated identity and returns only server-confirmed rows', async () => {
  const service = serviceHarness(() => ({ data: [row()], error: null }));
  assert.equal((await service.createComment('v1', ' Real content ', null, 'request-1')).id, 'c1');
  assert.deepEqual(JSON.parse(JSON.stringify(service.calls[0])), { name: 'create_feed_comment', args: { p_video_id: 'v1', p_text: 'Real content', p_parent_id: null, p_request_id: 'request-1' } });
  await assert.rejects(service.createComment('v1', '😀'.repeat(301), null, 'other'), /300/);
  const failed = serviceHarness(() => ({ data: null, error: { message: 'Disconnected' } }));
  await assert.rejects(failed.createComment('v1', 'Content', null, 'request'), /Disconnected/);
  const empty = serviceHarness(() => ({ data: [], error: null }));
  await assert.rejects(empty.createComment('v1', 'Content', null, 'request'), /confirmar/);
});
test('paging remains functional above the API maximum and replies are scoped to their video', async () => {
  const service = serviceHarness(spec => {
    if (spec.options?.head) return { data: null, count: 1250, error: null };
    // A new newest row arrives after the first batch. Offset-based queries
    // repeat c1501; the timestamp/id boundary remains stable.
    const next = spec.cursor ? Number(spec.cursor.match(/id.lt.c(\d+)/)[1]) - 1 : spec.range[0] ? 2001 - spec.range[0] : 2000;
    return { data: Array.from({ length: spec.range[1] - spec.range[0] + 1 }, (_, i) => row(`c${next - i}`)), error: null };
  });
  const page = await service.readComments('v1', 1020);
  assert.equal(page.rows.length, 1020); assert.equal(page.hasMore, true); assert.equal(page.total, 1250);
  assert.equal(new Set(page.rows.map(item => item.id)).size, 1020, 'Concurrent insertion must not duplicate rows');
  assert.ok(service.calls.filter(call => call.range).every(call => call.range[1] - call.range[0] < 500));
  await service.readReplies('v2', 'parent', 20);
  const replyQuery = service.calls.at(-1);
  assert.deepEqual(JSON.parse(JSON.stringify(replyQuery.filters)), [['video_id', 'v2'], ['root_id', 'parent']]);
});
test('a failed count cannot become a fabricated zero or demo total', async () => {
  const service = serviceHarness(spec => spec.options?.head ? { data: null, count: null, error: { message: 'Count failed' } } : { data: [], error: null });
  await assert.rejects(service.readComments('v1'), /Count failed/);
});
test('like requests set an idempotent desired state and never synthesize success', async () => {
  const service = serviceHarness(() => ({ data: [row('c1', { likes_count: 1 })], error: null }));
  assert.equal((await service.setCommentLike('c1', true)).likes_count, 1);
  assert.equal(service.calls[0].args.p_liked, true);
  const failed = serviceHarness(() => ({ data: [], error: null }));
  await assert.rejects(failed.setCommentLike('c1', false), /confirmar/);
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
  return { hooks, mount(fn) { render = fn; dirty = true; }, update() { dirty = true; }, get output() { return output; }, async flush() { for (let turn = 0; turn < 20; turn++) { if (dirty) { cursor = 0; dirty = false; effects = []; output = render(); effects.forEach(fn => fn()); } await new Promise(resolve => setImmediate(resolve)); } assert.equal(dirty, false, 'Hook settled'); }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
function hookHarness(overrides = {}) {
  const rt = runtime(); const state = { video: 'v1', visible: true, user: { id: 'u1' }, roots: [row()], liked: new Set() };
  const calls = []; const channel = { on() { return channel; }, subscribe() { return channel; } };
  const services = {
    async readComments() { return { rows: state.roots, total: state.roots.length, hasMore: false }; },
    async readReplies() { return { rows: [], hasMore: false }; },
    async readOwnCommentLikes() { return state.liked; },
    async createComment(video, text, parent, request) { calls.push({ video, text, parent, request }); return row('posted', { video_id: video, text, parent_id: parent }); },
    async setCommentLike(id, liked) { calls.push({ id, liked }); return row(id, { likes_count: liked ? 1 : 0 }); }, ...overrides,
  };
  const { useFeedComments } = load('hooks/useFeedComments.ts', ['useFeedComments'], { ...rt.hooks, ...model, ...services, useAuth: () => ({ user: state.user }), AppState: { addEventListener: () => ({ remove() {} }) }, supabase: { channel: () => channel, removeChannel: async () => {} } });
  rt.mount(() => useFeedComments(state.visible, state.video));
  return { rt, state, calls };
}
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
test('a lost response preserves the request ID across retry without claiming success', async () => {
  let attempts = 0; const requests = [];
  const h = hookHarness({ async createComment(video, text, parent, request) { requests.push(request); if (++attempts === 1) throw new Error('Network lost'); return row('confirmed'); } });
  await h.rt.flush(); assert.equal(await h.rt.output.publish('Content', null), null); await h.rt.flush();
  assert.match(h.rt.output.error, /Network lost/);
  await h.rt.output.refresh(); await h.rt.flush(); assert.match(h.rt.output.error, /Network lost/);
  assert.equal((await h.rt.output.publish('Content', null)).id, 'confirmed');
  assert.equal(requests[0], requests[1]); h.rt.unmount();
});
test('double tapping publish serializes writes and late confirmation cannot clear another video draft', async () => {
  const pending = deferred(); let calls = 0;
  const h = hookHarness({ createComment: () => { calls++; return pending.promise; } }); await h.rt.flush();
  const first = h.rt.output.publish('Draft', null); assert.equal(await h.rt.output.publish('Draft', null), null); assert.equal(calls, 1);
  h.state.video = 'v2'; h.state.roots = []; h.rt.update(); await h.rt.flush();
  pending.resolve(row()); assert.equal(await first, null); await h.rt.flush(); assert.equal(h.rt.output.roots.length, 0); h.rt.unmount();
});
test('late reads and likes are discarded when switching accounts or videos', async () => {
  const pending = deferred(); let reads = 0;
  const h = hookHarness({ readComments: () => ++reads === 1 ? pending.promise : Promise.resolve({ rows: [], total: 0, hasMore: false }) }); await h.rt.flush();
  h.state.video = 'v2'; h.state.user = { id: 'u2' }; h.rt.update(); await h.rt.flush();
  pending.resolve({ rows: [row()], total: 1, hasMore: false }); await h.rt.flush(); assert.equal(h.rt.output.total, 0); assert.equal(h.rt.output.roots.length, 0); h.rt.unmount();
});
test('like failure retains canonical counters and remains visible after a reload', async () => {
  const h = hookHarness({ async setCommentLike() { throw new Error('Like failed'); } }); await h.rt.flush();
  await h.rt.output.like(row()); await h.rt.flush(); assert.equal(h.rt.output.roots[0].likes_count, 0); assert.equal(h.rt.output.liked.has('c1'), false); assert.match(h.rt.output.error, /Like failed/);
  await h.rt.output.refresh(); await h.rt.flush(); assert.match(h.rt.output.error, /Like failed/); h.rt.unmount();
});
