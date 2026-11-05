/** Approved 1 Nov scope: coherent resistance on every gesture-refresh surface.
 * Keep activation arbitration, two pointers, indicator and layout unchanged. */
export const OWN_PROFILE_PULL = {
  activationDistance: 12,
  verticalRatio: 1.45,
  dragGain: 0.45,
  triggerDistance: 200,
  holdDistance: 72,
  indicatorHeight: 40,
  indicatorGap: 8,
  spring: {stiffness: 520, damping: 38, mass: 0.8, overshootClamping: true},
} as const;

/** Progressive tension from the first movement; the viewport remains a soft
 * limit, never a hard stop. Both functions also run on the native UI thread. */
export function profilePullOffset(distance: number, availableHeight: number): number {
  'worklet';
  if (!Number.isFinite(distance) || !Number.isFinite(availableHeight) || distance <= 0 || availableHeight <= 0) return 0;
  return -availableHeight * Math.expm1(-OWN_PROFILE_PULL.dragGain * distance / availableHeight);
}

/** Resume a partially retracted pull at its current position without a jump. */
export function profilePullDistance(offset: number, availableHeight: number): number {
  'worklet';
  if (!Number.isFinite(offset) || !Number.isFinite(availableHeight) || offset <= 0 || availableHeight <= 0) return 0;
  return -availableHeight / OWN_PROFILE_PULL.dragGain * Math.log1p(-Math.min(offset / availableHeight, 0.999999));
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
