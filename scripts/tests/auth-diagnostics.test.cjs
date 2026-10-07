const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const mobile = path.join(__dirname, '../../artifacts/mobile');
const sha = '61cd8a9ad83256848d674de28f7c6df38ddc7fc0';

function diagnostics(flag, build = sha) {
  if (arguments.length === 0) flag = '1';
  const exports = {};
  const source = fs.readFileSync(path.join(mobile, 'lib/authDiagnostics.ts'), 'utf8').replace(/^export /gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source, { mode: 'transform' }) + '\nObject.assign(exports, { AUTH_DIAGNOSTICS_ENABLED, recordAuthDiagnostic, startAuthDiagnostic, rememberAuthSecrets, rememberAuthUrl, redactAuthDiagnostic, formatAuthDiagnostic });', {
    exports, process: { env: { EXPO_PUBLIC_AUTH_DIAGNOSTICS: flag, EXPO_PUBLIC_AUTH_DIAGNOSTIC_BUILD: build } },
    URL, URLSearchParams, fetch: () => { throw Error('Diagnostics must not send data'); },
  });
  return exports;
}

test('diagnostics are opt-in and a normal release records no callback data', () => {
  for (const flag of [undefined, '0', 'true']) {
    const d = diagnostics(flag);
    assert.equal(d.AUTH_DIAGNOSTICS_ENABLED, false);
    d.startAuthDiagnostic(); d.recordAuthDiagnostic('google.session.ready');
    d.rememberAuthSecrets({ code: 'opaque-known-value' });
    const report = d.formatAuthDiagnostic(new Error('ordinary error'), '', 'android 35');
    assert.doesNotMatch(report, /google\.session\.ready/);
    assert.equal(d.redactAuthDiagnostic('opaque-known-value'), 'opaque-known-value');
  }
});

test('known callback values are hidden even when an error echoes them without a key', () => {
  const d = diagnostics();
  const code = 'one-use-private-code';
  const access = 'opaque+private/access-token';
  const refresh = 'opaque-private-refresh-token';
  d.rememberAuthUrl(`mobile:///auth/callback?code=${code}#access_token=${encodeURIComponent(access)}&refresh_token=${refresh}`);
  const error = new Error(`${code} ${access} ${encodeURIComponent(access)} ${refresh}`);
  const report = d.formatAuthDiagnostic(error, '    at AuthCallback (index.android.bundle:1:12345)', 'android 35');
  for (const value of [code, access, encodeURIComponent(access), refresh]) assert.equal(report.includes(value), false);
  assert.match(report, /\[OCULTO\]/);
  assert.match(report, /index\.android\.bundle:1:12345/);
});

test('reports remove URL credentials, bearer tokens, JWTs, API tokens, email and JSON secret fields', () => {
  const d = diagnostics();
  const values = [
    'mobile:///auth/callback?code=unseen-code', 'https://example.test/auth?token=unseen-token',
    'Bearer opaque-bearer-secret', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signature',
    'sbp_fc_private_management_token', 'sb_secret_private_api_token', 'person@example.test',
    'sb_publishable_private_api_token',
    'json-private-code', 'json-private-secret', 'json-private-verifier', 'json-private-state',
  ];
  const error = new Error(values.slice(0, 8).join(' ') + ' {"code":"json-private-code","client_secret":"json-private-secret","code_verifier":"json-private-verifier","state":"json-private-state"}');
  const report = d.formatAuthDiagnostic(error, '', 'android 35');
  for (const value of values) assert.equal(report.includes(value), false, value);
});

test('a report preserves the actual error, JS offsets, React component stack and stage order', () => {
  const d = diagnostics();
  d.startAuthDiagnostic(); d.recordAuthDiagnostic('google.browser.success');
  d.recordAuthDiagnostic('callback.navigate'); d.recordAuthDiagnostic('app.render.error');
  const error = new TypeError('Cannot read property currentTime of null');
  error.stack = 'TypeError: Cannot read property currentTime of null\n    at restore (index.android.bundle:1:54321)';
  const report = d.formatAuthDiagnostic(error, '    at VideoCard\n    at FeedScreen', 'android 35');
  assert.match(report, new RegExp(sha));
  assert.match(report, /TypeError: Cannot read property currentTime of null/);
  assert.match(report, /index\.android\.bundle:1:54321/);
  assert.match(report, /at VideoCard\n    at FeedScreen/);
  assert.ok(report.indexOf('google.browser.success') < report.indexOf('callback.navigate'));
  assert.ok(report.indexOf('callback.navigate') < report.indexOf('app.render.error'));
});

test('trace records are bounded and cannot accept untrusted stage text', () => {
  const d = diagnostics();
  d.startAuthDiagnostic();
  d.recordAuthDiagnostic('secret-data@example.test');
  for (let i = 0; i < 100; i++) d.recordAuthDiagnostic('callback.render');
  const report = d.formatAuthDiagnostic(new Error('failure'), '', 'android 35');
  assert.equal((report.match(/callback\.render/g) ?? []).length, 40);
  assert.doesNotMatch(report, /secret-data/);
  const huge = d.formatAuthDiagnostic(new Error('x'.repeat(50000)), '', 'android 35');
  assert.ok(huge.length < 24100);
  assert.match(huge, /Informe recortado/);
});

test('invalid callback inputs and hostile Error getters cannot break the fallback report', () => {
  const d = diagnostics();
  assert.doesNotThrow(() => d.rememberAuthUrl('not a URL'));
  assert.doesNotThrow(() => d.rememberAuthSecrets(null));
  d.rememberAuthSecrets({ code: 'bad-\ud800-code' });
  assert.doesNotThrow(() => d.redactAuthDiagnostic('bad-\ud800-code'));
  const error = Object.defineProperties({}, {
    name: { get() { throw Error('getter'); } }, message: { get() { throw Error('getter'); } }, stack: { get() { throw Error('getter'); } },
  });
  assert.match(d.formatAuthDiagnostic(error, '', 'android 35'), /Error sin mensaje/);
});

test('duplicate callback parameters and array route values are all redacted', () => {
  const d = diagnostics();
  d.rememberAuthUrl('mobile:///auth/callback?code=first-secret-code&code=second-secret-code');
  d.rememberAuthSecrets({ token_hash: ['first-secret-hash', 'second-secret-hash'] });
  const text = 'first-secret-code second-secret-code first-secret-hash second-secret-hash';
  const report = d.formatAuthDiagnostic(new Error(text), '', 'android 35');
  for (const value of text.split(' ')) assert.equal(report.includes(value), false);
});

function boundary(enabled) {
  let source = fs.readFileSync(path.join(mobile, 'components/ErrorBoundary.tsx'), 'utf8');
  source = source.slice(0, source.indexOf('  render() {')) + '  render() { return { error: this.state.error, componentStack: this.state.componentStack }; }\n}\n';
  source = source.replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  const events = []; const exports = {};
  class Component { constructor(props) { this.props = props; } setState(next) { this.state = { ...this.state, ...next }; } }
  vm.runInNewContext(stripTypeScriptTypes(source, { mode: 'transform' }) + '\nexports.ErrorBoundary = ErrorBoundary;', {
    exports, Component, ErrorFallback: () => {}, AUTH_DIAGNOSTICS_ENABLED: enabled, recordAuthDiagnostic: stage => events.push(stage),
  });
  return { ErrorBoundary: exports.ErrorBoundary, events };
}

test('the real error boundary captures the React stack and clears it on retry', () => {
  const { ErrorBoundary, events } = boundary(true);
  const observed = [];
  const instance = new ErrorBoundary({ onError: (error, stack) => observed.push([error, stack]) });
  const error = new Error('original');
  instance.state = ErrorBoundary.getDerivedStateFromError(error);
  instance.componentDidCatch(error, { componentStack: 'at AuthCallback\nat RootLayout' });
  assert.equal(instance.render().error, error);
  assert.equal(instance.render().componentStack, 'at AuthCallback\nat RootLayout');
  assert.deepEqual(events, ['app.render.error']);
  assert.deepEqual(observed, [[error, 'at AuthCallback\nat RootLayout']]);
  instance.resetError(); assert.equal(instance.state.error, null); assert.equal(instance.state.componentStack, '');
});

test('the ordinary boundary keeps its existing callback without recording diagnostics', () => {
  const { ErrorBoundary, events } = boundary(false);
  let observed = 0;
  const instance = new ErrorBoundary({ onError: () => observed++ });
  instance.state = ErrorBoundary.getDerivedStateFromError(new Error('original'));
  instance.componentDidCatch(instance.state.error, { componentStack: 'at Screen' });
  assert.equal(observed, 1); assert.equal(instance.state.componentStack, ''); assert.equal(events.length, 0);
});
