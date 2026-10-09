const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const root = path.join(__dirname, '../../artifacts/mobile');
function loadService(name, mocks) {
 const exports = {};
 const source = ts.transpileModule(fs.readFileSync(path.join(root, `lib/features/auth/services/${name}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
 vm.runInNewContext(source, { exports, require: id => mocks[id], Error });
 return exports;
}
test('restricted controls request exactly one intention without applying it before Auth', () => {
 const bridge = loadService('registrationBridge', {});
 const requests = []; bridge.installRegistrationHandler(intent => requests.push(intent));
 bridge.requestRegistration({ kind: 'like', videoId: '4' }); bridge.requestRegistration();
 assert.equal(requests[0].kind, 'like'); assert.equal(requests[0].videoId, '4'); assert.equal(requests[1].kind, 'register');
 bridge.installRegistrationHandler(null); bridge.requestRegistration(); assert.equal(requests.length, 2);
});
test('Like and favorite replay ensure state with ignoreDuplicates instead of toggling', async () => {
 const calls = [];
 const { applyPendingAction } = loadService('pendingAction', { '../../../supabase': { supabase: { from: table => ({ upsert: async (row, options) => { calls.push({ table, row, options }); return { error: null }; } }) } }, './demoFollows': {} });
 for (const kind of ['like', 'favorite']) { await applyPendingAction('user', { kind, videoId: '4' }); await applyPendingAction('user', { kind, videoId: '4' }); }
 assert.deepEqual(calls.map(x => x.table), ['video_likes','video_likes','saved_videos','saved_videos']);
 calls.forEach(x => { assert.equal(x.options.ignoreDuplicates, true); assert.equal(x.options.onConflict, 'user_id,video_id'); assert.equal(x.row.user_id, 'user'); assert.equal(x.row.video_id, '4'); });
});
test('demo follow stays local; real follow persists under the signed-in user', async () => {
 const calls = []; const previews = [];
 const { applyPendingAction } = loadService('pendingAction', { '../../../supabase': { supabase: { from: table => ({ upsert: async row => { calls.push({table,row}); return {error:null}; } }) } }, './demoFollows': { setDemoFollow: async (...args) => previews.push(args) } });
 await applyPendingAction('user', { kind:'follow', creatorId:'demo', isDemo:true });
 assert.equal(calls.length,0); assert.deepEqual(previews[0],['user','demo',true]);
 await applyPendingAction('user', { kind:'follow', creatorId:'real' }); assert.equal(calls[0].table,'follows'); assert.equal(calls[0].row.follower_id,'user');
});
test('comment, generic register and own profile do not execute a feed action', async () => {
 const { applyPendingAction } = loadService('pendingAction', { '../../../supabase': { supabase: { from: () => { throw new Error('Unexpected mutation'); } } }, './demoFollows': {} });
 for (const kind of ['comment','register','profile']) await applyPendingAction('user',{kind,videoId:'4'});
});
test('failed action is reported to the coordinator, never claimed successful', async () => {
 const { applyPendingAction } = loadService('pendingAction', { '../../../supabase': { supabase: { from: () => ({ upsert: async () => ({error: new Error('RLS rejected')}) }) } }, './demoFollows': {} });
 await assert.rejects(applyPendingAction('user',{kind:'like',videoId:'4'}),/RLS rejected/);
});
test('legacy onboarding is absent and compatibility routes have no forms', () => {
 for (const name of ['onboarding-profile','interests','verify-email']) assert.equal(fs.existsSync(path.join(root,`app/auth/${name}.tsx`)),false);
 for (const name of ['register','login','welcome']) { const source = fs.readFileSync(path.join(root,`app/auth/${name}.tsx`),'utf8'); assert.match(source,/requestRegistration/); assert.doesNotMatch(source,/TextInput|password|signUp|signInWithPassword/); }
 const auth = fs.readFileSync(path.join(root,'lib/features/auth/context/AuthContext.tsx'),'utf8'); assert.doesNotMatch(auth,/signInWithPassword|auth\.signUp/);
});
