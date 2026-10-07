const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const modulePromise = import('../configure-seamless-auth.mjs');
const env = { SUPABASE_PROJECT_ID: 'kvbppgofblldwnkkoscb', SUPABASE_ACCESS_TOKEN: 'fake-token-for-tests' };
const template = '<p>{{ .Token }}</p>';

function harness(responses, overrides = {}) {
  const calls = [];
  const logs = [];
  return {
    calls,
    logs,
    options: {
      env,
      fetchImpl: async (url, options) => {
        calls.push({ url, ...options });
        assert.ok(responses.length, 'unexpected Management API request');
        return responses.shift();
      },
      readFileImpl: async () => template,
      log: message => logs.push(message),
      ...overrides,
    },
  };
}

test('preserves redirects and provider settings, then verifies the applied OTP configuration', async () => {
  const { configureSeamlessAuth } = await modulePromise;
  const previous = {
    uri_allow_list: ' https://tokvid.example/auth/callback, mobile:///auth/callback ',
    smtp_pass: 'private-smtp-value',
    external_google_secret: 'private-google-value',
  };
  const current = {
    ...previous,
    uri_allow_list: 'https://tokvid.example/auth/callback,mobile:///auth/callback',
    mailer_otp_length: 8,
    mailer_templates_magic_link_content: template,
    mailer_templates_confirmation_content: template,
  };
  const h = harness([Response.json(previous), Response.json(current), Response.json(current)]);
  await configureSeamlessAuth(h.options);
  assert.deepEqual(h.calls.map(c => c.method), ['GET', 'PATCH', 'GET']);
  assert.ok(h.calls.every(c => c.url === 'https://api.supabase.com/v1/projects/kvbppgofblldwnkkoscb/config/auth'));
  assert.equal(h.calls[1].headers.Authorization, `Bearer ${env.SUPABASE_ACCESS_TOKEN}`);
  assert.deepEqual(JSON.parse(h.calls[1].body), {
    uri_allow_list: current.uri_allow_list,
    mailer_otp_length: 8,
    mailer_subjects_magic_link: 'Tu código de TokVid',
    mailer_subjects_confirmation: 'Tu código de TokVid',
    mailer_templates_magic_link_content: template,
    mailer_templates_confirmation_content: template,
  });
  assert.equal(JSON.parse(h.logs[0]).otpTemplatesVerified, true);
  assert.doesNotMatch(h.logs.join(''), /private-|fake-token/);
});

test('GET 403 reports only allowed permission names and stops before PATCH', async () => {
  const { configureSeamlessAuth } = await modulePromise;
  const h = harness([Response.json({
    missing_permissions: ['auth_config_read', 'auth_config_read', 'private-provider-value'],
    message: 'private-error-value',
    smtp_pass: 'private-smtp-value',
  }, { status: 403 })]);
  await assert.rejects(configureSeamlessAuth(h.options), error => {
    assert.match(error.message, /GET failed \(403\)/);
    assert.match(error.message, /Missing permissions: auth_config_read\./);
    assert.match(error.message, /SUPABASE_AUTH_ACCESS_TOKEN/);
    assert.doesNotMatch(error.message, /private-|fake-token/);
    return true;
  });
  assert.deepEqual(h.calls.map(c => c.method), ['GET']);
  assert.equal(h.logs.length, 0);
});

test('PATCH 403 reports write permissions and does not claim verification success', async () => {
  const { configureSeamlessAuth } = await modulePromise;
  const h = harness([
    Response.json({ uri_allow_list: 'https://tokvid.example/callback' }),
    Response.json({ missing_permissions: ['auth_config_write', 'project_admin_write'] }, { status: 403 }),
  ]);
  await assert.rejects(configureSeamlessAuth(h.options), /PATCH failed \(403\).*auth_config_write, project_admin_write/);
  assert.deepEqual(h.calls.map(c => c.method), ['GET', 'PATCH']);
  assert.equal(h.logs.length, 0);
});

test('non-JSON 403 produces actionable guidance without leaking the response', async () => {
  const { configureSeamlessAuth } = await modulePromise;
  const h = harness([new Response('private-error-body', { status: 403 })]);
  await assert.rejects(configureSeamlessAuth(h.options), error => {
    assert.match(error.message, /Auth Config \(Read-write\).*Project Settings \(Read-write\)/);
    assert.doesNotMatch(error.message, /private-error-body/);
    return true;
  });
  assert.equal(h.calls.length, 1);
});

test('401 identifies Management API credentials without exposing the response', async () => {
  const { configureSeamlessAuth } = await modulePromise;
  const h = harness([Response.json({ message: 'private-value' }, { status: 401 })]);
  await assert.rejects(configureSeamlessAuth(h.options), error => {
    assert.match(error.message, /valid, unexpired Supabase personal access token/);
    assert.doesNotMatch(error.message, /private-value/);
    return true;
  });
  assert.equal(h.calls.length, 1);
});

test('does not report success when the server has not applied the reviewed configuration', async () => {
  const { configureSeamlessAuth } = await modulePromise;
  const h = harness([Response.json({}), Response.json({}), Response.json({ mailer_otp_length: 6 })]);
  await assert.rejects(configureSeamlessAuth(h.options), /Seamless Auth verification failed/);
  assert.equal(h.logs.length, 0);
});

test('rejects the wrong project or missing credentials before making requests', async () => {
  const { configureSeamlessAuth } = await modulePromise;
  for (const credentials of [{ ...env, SUPABASE_PROJECT_ID: 'other-project' }, { SUPABASE_PROJECT_ID: env.SUPABASE_PROJECT_ID }]) {
    const h = harness([], { env: credentials });
    await assert.rejects(configureSeamlessAuth(h.options), /Expected TokVid project and workflow credentials/);
    assert.equal(h.calls.length, 0);
  }
});

test('the actual CLI entry point exits with failure on 403 and never sends PATCH', () => {
  const folder = mkdtempSync(join(tmpdir(), 'tokvid-auth-test-'));
  try {
    const preload = join(folder, 'deny-auth.cjs');
    writeFileSync(preload, `globalThis.fetch = async (_url, options) => {
      if (options.method !== 'GET') throw new Error('unexpected PATCH');
      return Response.json({ missing_permissions: ['auth_config_read'], message: 'private-error-value' }, { status: 403 });
    };`);
    const childEnv = { ...process.env, ...env };
    delete childEnv.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ['--require', preload, resolve(__dirname, '../configure-seamless-auth.mjs')], {
      env: childEnv,
      encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /GET failed \(403\).*auth_config_read/);
    assert.doesNotMatch(result.stderr + result.stdout, /private-error-value|fake-token-for-tests|unexpected PATCH/);
    assert.equal(result.stdout, '');
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
