/** Saved-video navigation is anchored to its immutable ID.
 * An outdated index must never silently open a different publication.
 */
export function savedVideoStartIndex<T extends {id:string}>(items:readonly T[],videoId?:string,fallback=0):number{
  if(videoId)return items.findIndex(item=>item.id===videoId);
  if(!items.length)return -1;
  return Math.min(Math.max(0,Number.isFinite(fallback)?Math.trunc(fallback):0),items.length-1);
}
