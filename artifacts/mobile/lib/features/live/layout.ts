export type LiveLayout =
  | "host-grid"
  | "balanced"
  | "host-carousel"
  | "featured-guest"
  | "compact"
  | "dynamic";

export type LiveRole = "host" | "guest" | "spectator";

export interface LiveParticipantLayoutItem {
  userId: string;
  role: LiveRole;
  windowSlot: number | null;
}

export interface LiveLayoutInput {
  layout: LiveLayout;
  participants: LiveParticipantLayoutItem[];
}

export interface LiveLayoutResult {
  host: LiveParticipantLayoutItem | null;
  guests: LiveParticipantLayoutItem[];
  spectators: LiveParticipantLayoutItem[];
  audiovisualCount: number;
  guestCount: number;
}

export const LIVE_MAX_GUESTS = 11;
export const LIVE_MAX_AUDIOVISUAL = 12;

function byWindowSlot(
  a: LiveParticipantLayoutItem,
  b: LiveParticipantLayoutItem,
): number {
  const aSlot = a.windowSlot ?? Number.MAX_SAFE_INTEGER;
  const bSlot = b.windowSlot ?? Number.MAX_SAFE_INTEGER;
  return aSlot - bSlot;
}

/**
 * Derives presentation data from authoritative participant state.
 *
 * This helper does not grant permissions, allocate windows, or change room
 * state. The server remains authoritative for the 1 Host + 11 Guests limit.
 */
export function deriveLiveLayout(
  input: LiveLayoutInput,
): LiveLayoutResult {
  const host =
    input.participants.find((participant) => participant.role === "host") ??
    null;

  const guests = input.participants
    .filter((participant) => participant.role === "guest")
    .sort(byWindowSlot)
    .slice(0, LIVE_MAX_GUESTS);

  const spectators = input.participants.filter(
    (participant) => participant.role === "spectator",
  );

  return {
    host,
    guests,
    spectators,
    audiovisualCount: (host ? 1 : 0) + guests.length,
    guestCount: guests.length,
  };
}

/**
 * Returns the audiovisual window slots that are available for presentation.
 * Slot 0 is reserved for the Host; Guest slots are 1..11.
 *
 * This is presentation metadata only. It must not be used as a substitute
 * for the server-side capacity transaction.
 */
export function getAvailableGuestSlots(
  participants: LiveParticipantLayoutItem[],
): number[] {
  const occupied = new Set(
    participants
      .filter((participant) => participant.role === "guest")
      .map((participant) => participant.windowSlot)
      .filter((slot): slot is number => slot !== null && slot >= 1 && slot <= LIVE_MAX_GUESTS),
  );

  return Array.from(
    { length: LIVE_MAX_GUESTS },
    (_, index) => index + 1,
  ).filter((slot) => !occupied.has(slot));
}
