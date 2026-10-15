const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {stripTypeScriptTypes} = require('node:module');
const root = path.join(__dirname, '../../artifacts/mobile/lib/features/profile');
const presentation = fs.readFileSync(path.join(root, 'presentation.ts'), 'utf8').replace(/^export /gm, '');
const source = fs.readFileSync(path.join(root, 'connections.ts'), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
const api = {};
vm.runInNewContext(stripTypeScriptTypes(presentation + '\n' + source, {mode: 'transform'}) + '\nObject.assign(api, {readProfileFriends});', {api});
const person = id => ({id, username: id, avatar_url: null});

test('visited friends are mutual relations of the visited user, including later RPC pages', async () => {
  const followers = Array.from({length: 60}, (_, i) => person(`follower-${i}`)).concat(person('friend'), person('visited'));
  const following = [person('friend'), person('outgoing-only'), person('visited')];
  const calls = [];
  const result = await api.readProfileFriends('visited', async (kind, offset) => {
    calls.push([kind, offset]);
    return (kind === 'followers' ? followers : following).slice(offset, offset + 60);
  });
  assert.deepEqual(Array.from(result, p => p.id), ['friend']);
  assert.ok(calls.some(([kind, offset]) => kind === 'followers' && offset === 60));
});

test('a failed page never presents partial friends as a complete list', async () => {
  await assert.rejects(api.readProfileFriends('visited', async (kind, offset) => {
    if (kind === 'followers' && offset === 60) throw new Error('offline');
    return kind === 'followers' ? Array.from({length: 60}, (_, i) => person(`p${i}`)) : [person('p1')];
  }), /offline/);
});

test('leaving a profile stops further pagination', async () => {
  let active = true;
  const calls = [];
  await api.readProfileFriends('visited', async (kind, offset) => {
    calls.push([kind, offset]); active = false;
    return Array.from({length: 60}, (_, i) => person(`p${i}`));
  }, () => active);
  assert.ok(calls.every(([, offset]) => offset === 0));
});
