// Enabled only in the standalone diagnostic APK. Never send reports remotely.
export const AUTH_DIAGNOSTICS_ENABLED = process.env.EXPO_PUBLIC_AUTH_DIAGNOSTICS === "1";
const build = process.env.EXPO_PUBLIC_AUTH_DIAGNOSTIC_BUILD ?? "";
const BUILD = /^[a-f0-9]{40}$/i.test(build) ? build : "local";
const HIDDEN = "[OCULTO]";
const stages = new Set([
  "google.start", "google.authorize.ready", "google.authorize.failed",
  "google.browser.open", "google.browser.success", "google.browser.cancel", "google.browser.other",
  "google.session.start", "google.session.ready", "google.session.failed",
  "callback.render", "callback.ready", "callback.effect", "callback.session.ready",
  "callback.navigate", "callback.failed", "auth.initial.session", "auth.initial.guest",
  "auth.session.present", "auth.session.absent", "app.render.error",
]);
const secretKeys = new Set([
  "access_token", "refresh_token", "id_token", "token", "token_hash", "code",
  "code_verifier", "code_challenge", "client_secret", "state", "nonce",
  "apikey", "api_key", "authorization", "password", "email",
]);
const timeline: string[] = [];
const secrets: string[] = [];

export function recordAuthDiagnostic(stage: string): void {
  if (!AUTH_DIAGNOSTICS_ENABLED || !stages.has(stage)) return;
  try {
    timeline.push(`${new Date().toISOString()} ${stage}`);
    if (timeline.length > 40) timeline.shift();
  } catch { /* Diagnostics must never change the authentication outcome. */ }
}

export function startAuthDiagnostic(): void {
  if (!AUTH_DIAGNOSTICS_ENABLED) return;
  timeline.length = 0;
  secrets.length = 0;
  recordAuthDiagnostic("google.start");
}

// Retain credential values only in memory to redact echoes in exception text.
export function rememberAuthSecrets(values: Record<string, unknown>): void {
  if (!AUTH_DIAGNOSTICS_ENABLED) return;
  try {
    for (const [key, input] of Object.entries(values)) {
      if (!secretKeys.has(key.toLowerCase())) continue;
      for (const value of Array.isArray(input) ? input : [input]) {
        if (typeof value !== "string" || value.length < 4 || value.length > 8192) continue;
        if (!secrets.includes(value)) secrets.push(value);
        if (secrets.length > 40) secrets.shift();
      }
    }
  } catch { /* Never throw while inspecting a callback. */ }
}

export function rememberAuthUrl(url: string): void {
  if (!AUTH_DIAGNOSTICS_ENABLED) return;
  try {
    const parsed = new URL(url);
    const values: Record<string, unknown> = {};
    const keep = (value: string, key: string) => {
      const previous = values[key];
      values[key] = [...(Array.isArray(previous) ? previous : []), value];
    };
    new URLSearchParams(parsed.search).forEach(keep);
    new URLSearchParams(parsed.hash.replace(/^#/, "")).forEach(keep);
    rememberAuthSecrets(values);
  } catch { /* The normal callback handler owns URL validation. */ }
}

export function redactAuthDiagnostic(value: string): string {
  let result = value;
  for (const secret of [...secrets].sort((a, b) => b.length - a.length)) {
    result = result.split(secret).join(HIDDEN);
    try { result = result.split(encodeURIComponent(secret)).join(HIDDEN); } catch { /* Invalid Unicode was already redacted verbatim. */ }
  }
  return result
    // Remove complete callback/network URLs; bundle:line:column frames survive.
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"'()]+/gi, "[URL OCULTA]")
    .replace(/\bBearer\s+[a-z0-9._~+\/-]+=*/gi, `Bearer ${HIDDEN}`)
    .replace(/\beyJ[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+\b/gi, HIDDEN)
    .replace(/\b(?:sbp|sbs|sb_secret|sb_publishable)_[a-z0-9_-]+\b/gi, HIDDEN)
    .replace(/((?:["']?)(?:access_token|refresh_token|id_token|token_hash|token|code_verifier|code_challenge|client_secret|state|nonce|apikey|api_key|authorization|password|email|code)(?:["']?)\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^,\s}\]&]+)/gi, `$1${HIDDEN}`)
    .replace(/[a-z0-9.!#$%&'*+\/=?^_`{|}~-]{1,64}@[a-z0-9.-]{1,255}\.[a-z]{2,63}/gi, HIDDEN);
}

function errorField(error: unknown, field: "name" | "message" | "stack"): string {
  try {
    const value = (error as Record<string, unknown> | null)?.[field];
    return typeof value === "string" ? value : "";
  } catch { return ""; }
}

export function formatAuthDiagnostic(error: unknown, componentStack: string, platform: string): string {
  const message = errorField(error, "message") || "Error sin mensaje";
  const report = [
    "TOKVID_AUTH_DIAGNOSTICS_V1", `Compilación: ${BUILD}`, `Dispositivo: ${platform}`,
    `Error: ${errorField(error, "name") || "Error"}: ${message}`,
    "", "Pila JavaScript:", errorField(error, "stack") || "No disponible",
    "", "Pantallas y componentes:", componentStack || "No disponible",
    "", "Pasos del regreso:", ...timeline,
  ].join("\n");
  const safe = redactAuthDiagnostic(report);
  return safe.length > 24000 ? `${safe.slice(0, 24000)}\n[Informe recortado]` : safe;
}
