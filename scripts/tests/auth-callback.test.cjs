const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const file = path.join(__dirname, '../../artifacts/mobile/lib/features/auth/services/authCallback.ts');
function load(auth) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: () => ({ supabase: { auth } }), URL, URLSearchParams, Error });
  return exports.completeAuthCallback;
}
test('PKCE extracts code and shares one exchange across both callback receivers', async () => {
  let calls = 0;
  const complete = load({ exchangeCodeForSession: async (code) => {
    calls++; assert.equal(code, 'one-use'); return { data: { session: { id: 'session' } }, error: null };
  }});
  const results = await Promise.all([complete('mobile://auth/callback?code=one-use'), complete('https://example.test/auth/callback?code=one-use')]);
  assert.equal(calls, 1); assert.equal(results[0], results[1]);
});
test('legacy token fragment establishes session without passing URL as a code', async () => {
  const complete = load({ setSession: async (tokens) => {
    assert.equal(tokens.access_token, 'access'); assert.equal(tokens.refresh_token, 'refresh');
    return { data: { session: { id: 'session' } }, error: null };
  }});
  await complete('mobile://auth/callback#access_token=access&refresh_token=refresh');
});
test('email verification link uses token hash', async () => {
  const complete = load({ verifyOtp: async (params) => {
    assert.equal(params.token_hash, 'hash'); assert.equal(params.type, 'email');
    return { data: { session: { id: 'session' } }, error: null };
  }});
  await complete('mobile://auth/callback?token_hash=hash&type=email');
});
test('missing credentials and provider errors cannot reuse an existing session', async () => {
  const complete = load({});
  await assert.rejects(complete('mobile://auth/callback'), /código válido/);
  await assert.rejects(complete('mobile://auth/callback?error=access_denied'), /autenticación/);
});
test('failed exchange may be retried instead of caching a rejected promise', async () => {
  let calls = 0;
  const complete = load({ exchangeCodeForSession: async () => ++calls === 1
    ? { data: {}, error: new Error('temporary') }
    : { data: { session: {} }, error: null } });
  await assert.rejects(complete('mobile://auth/callback?code=retry'), /temporary/);
  await complete('mobile://auth/callback?code=retry'); assert.equal(calls, 2);
});
