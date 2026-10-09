export type RegistrationKind = "register" | "like" | "follow" | "favorite" | "comment" | "profile";
export interface RegistrationIntent {
  kind: RegistrationKind;
  videoId?: string;
  creatorId?: string;
  isDemo?: boolean;
  position?: number;
  wasPaused?: boolean;
  requestId?: string;
}
let handler: ((intent: RegistrationIntent) => void) | null = null;
export function installRegistrationHandler(next: typeof handler) { handler = next; }
export function requestRegistration(intent: RegistrationIntent = { kind: "register" }) {
  handler?.(intent);
}
