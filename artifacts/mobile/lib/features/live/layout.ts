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
  cameraState?: "on" | "off";
  micState?: "on" | "off";
}

export interface LiveLayoutInput {
  layout: LiveLayout;
  participants: LiveParticipantLayoutItem[];
}

export interface LiveLayoutFrame {
  left: `${number}%`;
  top: `${number}%`;
  width: `${number}%`;
  height: `${number}%`;
  zIndex: number;
}

export interface LiveParticipantLayout extends LiveParticipantLayoutItem {
  frame: LiveLayoutFrame;
}

export interface LiveLayoutResult {
  host: LiveParticipantLayout | null;
  guests: LiveParticipantLayout[];
  spectators: LiveParticipantLayoutItem[];
  audiovisualCount: number;
  guestCount: number;
}

export const LIVE_MAX_GUESTS = 11;
export const LIVE_MAX_AUDIOVISUAL = 12;

const GAP = 1.5;

function byWindowSlot(
  a: LiveParticipantLayoutItem,
  b: LiveParticipantLayoutItem,
): number {
  const aSlot = a.windowSlot ?? Number.MAX_SAFE_INTEGER;
  const bSlot = b.windowSlot ?? Number.MAX_SAFE_INTEGER;
  return aSlot - bSlot;
}

function pct(value: number): `${number}%` {
  return `${Math.max(0, Math.min(100, Number(value.toFixed(3))))}%`;
}

function frame(
  left: number,
  top: number,
  width: number,
  height: number,
  zIndex: number,
): LiveLayoutFrame {
  return {
    left: pct(left),
    top: pct(top),
    width: pct(width),
    height: pct(height),
    zIndex,
  };
}

function gridFrame(
  index: number,
  count: number,
  area: { left: number; top: number; width: number; height: number },
  columns: number,
): LiveLayoutFrame {
  const rows = Math.max(1, Math.ceil(count / columns));
  const width = (area.width - GAP * (columns - 1)) / columns;
  const height = (area.height - GAP * (rows - 1)) / rows;
  const column = index % columns;
  const row = Math.floor(index / columns);

  return frame(
    area.left + column * (width + GAP),
    area.top + row * (height + GAP),
    width,
    height,
    10 + index,
  );
}

function columnsForGrid(count: number): number {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  return 4;
}

function hostGrid(
  host: LiveParticipantLayoutItem | null,
  guests: LiveParticipantLayoutItem[],
): LiveLayoutResult {
  const hostLayout = host
    ? { ...host, frame: frame(0, 0, 62, 100, 1) }
    : null;

  const guestArea = { left: 64, top: 0, width: 36, height: 100 };
  const guestLayouts = guests.map((guest, index) => ({
    ...guest,
    frame: gridFrame(index, guests.length, guestArea, guests.length > 4 ? 2 : 1),
  }));

  return {
    host: hostLayout,
    guests: guestLayouts,
    spectators: [],
    audiovisualCount: (host ? 1 : 0) + guests.length,
    guestCount: guests.length,
  };
}

function balanced(
  host: LiveParticipantLayoutItem | null,
  guests: LiveParticipantLayoutItem[],
): LiveLayoutResult {
  const audiovisual = host ? [host, ...guests] : guests;
  const columns = columnsForGrid(audiovisual.length);
  const layouts = audiovisual.map((participant, index) => ({
    ...participant,
    frame: gridFrame(
      index,
      audiovisual.length,
      { left: 0, top: 0, width: 100, height: 100 },
      columns,
    ),
  }));

  const hostLayout = layouts.find((participant) => participant.role === "host") ?? null;
  const guestLayouts = layouts.filter((participant) => participant.role === "guest");

  return {
    host: hostLayout,
    guests: guestLayouts,
    spectators: [],
    audiovisualCount: layouts.length,
    guestCount: guestLayouts.length,
  };
}

function hostCarousel(
  host: LiveParticipantLayoutItem | null,
  guests: LiveParticipantLayoutItem[],
): LiveLayoutResult {
  const hostLayout = host
    ? { ...host, frame: frame(0, 0, 67, 100, 1) }
    : null;

  const featuredGuest = guests[0];
  const remainingGuests = guests.slice(1);

  const featured = featuredGuest
    ? [{ ...featuredGuest, frame: frame(69, 0, 31, 45, 20) }]
    : [];

  const secondaryArea = { left: 69, top: 47, width: 31, height: 53 };
  const secondary = remainingGuests.map((guest, index) => ({
    ...guest,
    frame: gridFrame(
      index,
      remainingGuests.length,
      secondaryArea,
      remainingGuests.length > 4 ? 2 : 1,
    ),
  }));

  return {
    host: hostLayout,
    guests: [...featured, ...secondary],
    spectators: [],
    audiovisualCount: (host ? 1 : 0) + guests.length,
    guestCount: guests.length,
  };
}

function featuredGuest(
  host: LiveParticipantLayoutItem | null,
  guests: LiveParticipantLayoutItem[],
): LiveLayoutResult {
  const hostLayout = host
    ? { ...host, frame: frame(0, 0, 50, 100, 1) }
    : null;

  const featured = guests[0];
  const rest = guests.slice(1);
  const featuredLayout = featured
    ? [{ ...featured, frame: frame(51.5, 0, 48.5, 55, 20) }]
    : [];
  const restLayouts = rest.map((guest, index) => ({
    ...guest,
    frame: gridFrame(
      index,
      rest.length,
      { left: 51.5, top: 56.5, width: 48.5, height: 43.5 },
      rest.length > 4 ? 2 : 1,
    ),
  }));

  return {
    host: hostLayout,
    guests: [...featuredLayout, ...restLayouts],
    spectators: [],
    audiovisualCount: (host ? 1 : 0) + guests.length,
    guestCount: guests.length,
  };
}

function compact(
  host: LiveParticipantLayoutItem | null,
  guests: LiveParticipantLayoutItem[],
): LiveLayoutResult {
  return balanced(host, guests);
}

function dynamic(
  host: LiveParticipantLayoutItem | null,
  guests: LiveParticipantLayoutItem[],
): LiveLayoutResult {
  if (!host || guests.length === 0) return balanced(host, guests);
  if (guests.length <= 2) return hostGrid(host, guests);
  if (guests.length <= 5) return featuredGuest(host, guests);
  return compact(host, guests);
}

/**
 * Derives presentation data from authoritative participant state.
 *
 * This helper does not grant permissions, allocate windows, or change room
 * state. The server remains authoritative for the 1 Host + 11 Guests limit.
 * Layout frames are presentation-only and never change participant state.
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

  let result: LiveLayoutResult;
  switch (input.layout) {
    case "host-grid":
      result = hostGrid(host, guests);
      break;
    case "balanced":
      result = balanced(host, guests);
      break;
    case "host-carousel":
      result = hostCarousel(host, guests);
      break;
    case "featured-guest":
      result = featuredGuest(host, guests);
      break;
    case "compact":
      result = compact(host, guests);
      break;
    case "dynamic":
    default:
      result = dynamic(host, guests);
      break;
  }

  return {
    ...result,
    spectators,
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
      .filter(
        (slot): slot is number =>
          slot !== null && slot >= 1 && slot <= LIVE_MAX_GUESTS,
      ),
  );

  return Array.from(
    { length: LIVE_MAX_GUESTS },
    (_, index) => index + 1,
  ).filter((slot) => !occupied.has(slot));
}
