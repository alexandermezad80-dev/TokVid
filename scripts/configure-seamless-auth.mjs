// Apply reviewed Auth configuration from GitHub Actions, never from the APK.
import { readFile } from 'node:fs/promises';
const ref = process.env.SUPABASE_PROJECT_ID;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (ref !== 'kvbppgofblldwnkkoscb' || !token) throw new Error('Expected TokVid project and workflow credentials');
const endpoint = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
async function config(method, body) {
  const response = await fetch(endpoint, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
  // Do not log responses: the configuration can contain provider credentials.
  if (!response.ok) throw new Error(`Auth configuration ${method} failed (${response.status})`);
  return response.json();
}
const previous = await config('GET');
const redirects = new Set((previous.uri_allow_list ?? '').split(',').map(x => x.trim()).filter(Boolean));
redirects.add('mobile:///auth/callback');
const content = await readFile(new URL('../supabase/templates/seamless-otp.html', import.meta.url), 'utf8');
await config('PATCH', {
  uri_allow_list: [...redirects].join(','),
  mailer_otp_length: 8,
  mailer_subjects_magic_link: 'Tu código de TokVid',
  mailer_subjects_confirmation: 'Tu código de TokVid',
  mailer_templates_magic_link_content: content,
  mailer_templates_confirmation_content: content,
});
const current = await config('GET');
if (current.mailer_otp_length !== 8 || !current.uri_allow_list.split(',').includes('mobile:///auth/callback') || current.mailer_templates_magic_link_content !== content || current.mailer_templates_confirmation_content !== content) throw new Error('Seamless Auth verification failed');
console.log(JSON.stringify({ project: ref, otpDigits: current.mailer_otp_length, mobileRedirectAllowed: true, otpTemplatesVerified: true, emailEnabled: current.external_email_enabled, googleEnabled: current.external_google_enabled, phoneEnabled: current.external_phone_enabled, customSmtpConfigured: !!current.smtp_host }));
