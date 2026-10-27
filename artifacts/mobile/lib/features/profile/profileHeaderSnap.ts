/** Only settle the transition between the full profile and its pinned filters.
 * Grid scrolling beyond that interval and horizontal gestures remain free. */
export function profileHeaderSnap(start: number, end: number, height: number): number | null {
  'worklet';
  if (![start, end, height].every(Number.isFinite) || height <= 0 || end <= 1 || end >= height - 1) return null;
  const travel = end - start;
  if (Math.abs(travel) < 12) return null;
  if (travel < 0) return 0;
  const threshold = Math.min(height * 0.5, Math.max(48, Math.min(88, height * 0.4)));
  return end >= threshold ? height : 0;
}
