export type WallpaperFrame = {width:number;height:number};

/** A keyboard may occlude the canvas, but must not squeeze its composition.
 * A width change (rotation / split screen) starts a new measured frame.
 * This affects only the decorative layer, never the list or composer layout.
 */
export function nextWallpaperFrame(previous:WallpaperFrame, measured:WallpaperFrame, stable:boolean):WallpaperFrame {
  if(!Number.isFinite(measured.width)||!Number.isFinite(measured.height)||measured.width<=0||measured.height<=0)return previous;
  const sameWidth=Math.abs(previous.width-measured.width)<1;
  const height=stable&&sameWidth?Math.max(previous.height,measured.height):measured.height;
  if(previous.width===measured.width&&previous.height===height)return previous;
  return {width:measured.width,height};
}
