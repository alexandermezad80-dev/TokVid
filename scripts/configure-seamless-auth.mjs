// Apply reviewed Auth configuration from GitHub Actions, never from the APK.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const PROJECT_REF = 'kvbppgofblldwnkkoscb';
// Only these documented permission identifiers are safe to include in logs.
const AUTH_PERMISSIONS = new Set(['auth_config_read', 'auth_config_write', 'project_admin_write']);

async function configurationError(response, method) {
  let hint = '';
  if (response.status === 403) {
    let reportedPermissions = [];
    try {
      const body = await response.json();
      if (Array.isArray(body?.missing_permissions)) {
        reportedPermissions = [...new Set(body.missing_permissions.filter(permission => AUTH_PERMISSIONS.has(permission)))];
      }
    } catch {
      // Some denied requests return non-JSON. Never include the raw response.
    }
    const missing = reportedPermissions.length ? ` Missing permissions: ${reportedPermissions.join(', ')}.` : '';
    hint = `${missing} The GitHub Actions Auth token needs access to TokVid with Auth Config (Read-write) and Project Settings (Read-write). Check the token owner's project role. Set repository secret SUPABASE_AUTH_ACCESS_TOKEN; without it, Auth uses SUPABASE_ACCESS_TOKEN. See docs/operations/supabase-auth-workflow.md.`;
  } else if (response.status === 401) {
    hint = ' Use a valid, unexpired Supabase personal access token for the Management API, not an anon, publishable, or service_role project key. See docs/operations/supabase-auth-workflow.md.';
  }
  // The configuration and error responses can contain provider credentials.
  return new Error(`Auth configuration ${method} failed (${response.status}).${hint}`);
}

export async function configureSeamlessAuth({
  env = process.env,
  fetchImpl = globalThis.fetch,
  readFileImpl = readFile,
  log = console.log,
} = {}) {
  const ref = env.SUPABASE_PROJECT_ID;
  const token = env.SUPABASE_ACCESS_TOKEN;
  if (ref !== PROJECT_REF || !token) throw new Error('Expected TokVid project and workflow credentials');
  const endpoint = `https://api.supabase.com/v1/projects/${ref}/config/auth`;

  async function config(method, body) {
    const response = await fetchImpl(endpoint, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw await configurationError(response, method);
    return response.json();
  }

  const previous = await config('GET');
  const redirects = new Set((previous.uri_allow_list ?? '').split(',').map(x => x.trim()).filter(Boolean));
  redirects.add('mobile:///auth/callback');
  const content = await readFileImpl(new URL('../supabase/templates/seamless-otp.html', import.meta.url), 'utf8');
  await config('PATCH', {
    uri_allow_list: [...redirects].join(','),
    mailer_otp_length: 8,
    mailer_subjects_magic_link: 'Tu código de TokVid',
    mailer_subjects_confirmation: 'Tu código de TokVid',
    mailer_templates_magic_link_content: content,
    mailer_templates_confirmation_content: content,
  });
  const current = await config('GET');
  if (current.mailer_otp_length !== 8 || !current.uri_allow_list?.split(',').includes('mobile:///auth/callback') || current.mailer_templates_magic_link_content !== content || current.mailer_templates_confirmation_content !== content) throw new Error('Seamless Auth verification failed');
  log(JSON.stringify({ project: ref, otpDigits: current.mailer_otp_length, mobileRedirectAllowed: true, otpTemplatesVerified: true, emailEnabled: current.external_email_enabled, googleEnabled: current.external_google_enabled, phoneEnabled: current.external_phone_enabled, customSmtpConfigured: !!current.smtp_host }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await configureSeamlessAuth();
}
