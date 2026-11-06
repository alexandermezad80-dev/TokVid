/** 6 Nov: APK317 still felt too loose on every gesture-refresh surface.
 * Keep activation arbitration, two pointers, indicator and layout unchanged. */
export const OWN_PROFILE_PULL = {
  activationDistance: 12,
  verticalRatio: 1.45,
  dragGain: 0.28,
  triggerDistance: 360,
  holdDistance: 72,
  indicatorHeight: 40,
  indicatorGap: 8,
  spring: {stiffness: 620, damping: 42, mass: 0.8, overshootClamping: true},
} as const;

/** Firmer initial gain and earlier progressive tension. The square-root curve
 * retains the full viewport as a soft limit without a hard travel cap. */
export function profilePullOffset(distance: number, availableHeight: number): number {
  'worklet';
  if (!Number.isFinite(distance) || !Number.isFinite(availableHeight) || distance <= 0 || availableHeight <= 0) return 0;
  return -availableHeight * Math.expm1(-0.5 * Math.log1p(2 * OWN_PROFILE_PULL.dragGain * distance / availableHeight));
}

/** Resume a partially retracted pull at its current position without a jump. */
export function profilePullDistance(offset: number, availableHeight: number): number {
  'worklet';
  if (!Number.isFinite(offset) || !Number.isFinite(availableHeight) || offset <= 0 || availableHeight <= 0) return 0;
  return availableHeight / (2 * OWN_PROFILE_PULL.dragGain) * Math.expm1(-2 * Math.log1p(-Math.min(offset / availableHeight, 0.999999)));
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
