const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire, stripTypeScriptTypes } = require('node:module');
const mobile = path.join(__dirname, '../../artifacts/mobile');
const { toByteArray } = createRequire(path.join(mobile, 'package.json'))('base64-js');
function service(responder = () => ({ id: 'actor', username: 'Raul', avatar_url: 'https://photo.test/new.jpg' }), uploadFailure = false) {
  const calls = [];
  const bucket = {
    async upload(file, body, options) { calls.push({ file, body, options }); return uploadFailure ? { error: new Error('Denied') } : { data: { path: file }, error: null }; },
    getPublicUrl(file) { return { data: { publicUrl: `https://photo.test/${file}` } }; },
  };
  const query = {
    update(updates) { calls.push({ updates }); return query; }, eq(column, value) { calls.push({ column, value }); return query; },
    select(fields) { calls.push({ fields }); return query; }, async maybeSingle() { return { data: responder(), error: null }; },
  };
  const source = fs.readFileSync(path.join(mobile, 'lib/features/profile/avatar.ts'), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  const exports = {};
  vm.runInNewContext(stripTypeScriptTypes(source, { mode: 'transform' }) + '\nObject.assign(exports,{avatarImage,uploadProfileAvatar,saveProfileChanges});', {
    exports, Error, ArrayBuffer, toByteArray, supabase: { storage: { from(name) { assert.equal(name, 'avatars'); return bucket; } }, from(name) { assert.equal(name, 'profiles'); return query; } },
  });
  return { ...exports, calls };
}
const jpeg = Buffer.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 0, 0]).toString('base64');
test('native avatar uploads use exact binary bytes, the authenticated folder and fresh public URLs', async () => {
  const s = service(); const first = await s.uploadProfileAvatar('actor', jpeg); const second = await s.uploadProfileAvatar('actor', jpeg);
  assert.notEqual(first, second); assert.match(first, /^https:\/\/photo.test\/actor\/avatar-.*\.jpg$/);
  assert.ok(s.calls[0].body instanceof ArrayBuffer); assert.deepEqual(Buffer.from(s.calls[0].body), Buffer.from(jpeg, 'base64'));
  assert.equal(s.calls[0].options.upsert, false); assert.equal(s.calls[0].options.contentType, 'image/jpeg');
});
test('actual image signatures select MIME and extension rather than gallery URI suffixes', () => {
  const s = service();
  const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]).toString('base64');
  const webp = Buffer.from('RIFF0000WEBP').toString('base64');
  assert.equal(s.avatarImage(png).contentType, 'image/png'); assert.equal(s.avatarImage(webp).extension, 'webp');
  for (const image of ['', '%%%=', Buffer.from('GIF89a0000000000').toString('base64'), 'A'.repeat(14 * 1024 * 1024)]) assert.throws(() => s.avatarImage(image));
});
test('an upload denial is surfaced and cannot be reported as a saved photo', async () => {
  const s = service(undefined, true); await assert.rejects(s.uploadProfileAvatar('actor', jpeg), /subir la foto/);
  assert.equal(s.calls.length, 1);
});
test('profile saving requires a matching persisted owner row and avatar URL', async () => {
  const s = service(); const updates = { username: 'Raul', bio: '', full_name: 'Raul', avatar_url: 'https://photo.test/new.jpg' };
  assert.equal((await s.saveProfileChanges('actor', updates)).avatar_url, updates.avatar_url);
  assert.ok(s.calls.some(call => call.column === 'id' && call.value === 'actor'));
  for (const response of [null, { id: 'other', avatar_url: updates.avatar_url }, { id: 'actor', avatar_url: 'old' }]) {
    await assert.rejects(service(() => response).saveProfileChanges('actor', updates), /confirmar/);
  }
});
