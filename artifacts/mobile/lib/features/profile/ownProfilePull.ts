/** Owner-requested firmer pull (27 Oct): preserve the long travel and the
 * original indicator while reducing finger-to-content gain. */
export const OWN_PROFILE_PULL = {
  activationDistance: 12,
  verticalRatio: 1.45,
  dragGain: 0.6,
  triggerDistance: 140,
  holdDistance: 72,
  indicatorHeight: 40,
  indicatorGap: 8,
  spring: {stiffness: 420, damping: 38, mass: 0.8, overshootClamping: true},
} as const;

/** A smooth viewport-sized soft limit: positive, decreasing gain, no hard stop.
 * Split the expression to remain finite even for extreme input distances. */
export function profilePullOffset(distance: number, availableHeight: number): number {
  'worklet';
  if (!Number.isFinite(distance) || !Number.isFinite(availableHeight) || distance <= 0 || availableHeight <= 0) return 0;
  distance *= OWN_PROFILE_PULL.dragGain;
  const limit = availableHeight;
  return distance < limit
    ? distance / Math.pow(1 + Math.pow(distance / limit, 4), 0.25)
    : limit / Math.pow(1 + Math.pow(limit / distance, 4), 0.25);
}

/** Resume a partially retracted pull at its current position without a jump. */
export function profilePullDistance(offset: number, availableHeight: number): number {
  'worklet';
  if (!Number.isFinite(offset) || !Number.isFinite(availableHeight) || offset <= 0 || availableHeight <= 0) return 0;
  const ratio = Math.min(offset / availableHeight, 0.999999);
  return offset / Math.pow(1 - Math.pow(ratio, 4), 0.25) / OWN_PROFILE_PULL.dragGain;
}

/** Native pan stays undecided within touch slop and yields horizontal/upward
 * gestures and ordinary scrolling. This does not replace the existing swipe. */
export function profilePullIntent(dx: number, dy: number, scrollY: number, touches: number): 'wait' | 'pull' | 'yield' {
  'worklet';
  if (![dx, dy, scrollY].every(Number.isFinite) || (touches !== 1 && touches !== 2) || scrollY > 1) return 'yield';
  const slop = OWN_PROFILE_PULL.activationDistance;
  if (dy < -slop || (Math.abs(dx) >= slop && Math.abs(dx) > Math.abs(dy))) return 'yield';
  return dy > slop && dy > Math.abs(dx) * OWN_PROFILE_PULL.verticalRatio ? 'pull' : 'wait';
}
