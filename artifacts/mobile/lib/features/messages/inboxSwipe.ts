/** Only Inbox content can switch sections by one-finger horizontal gesture.
 * Never intercept vertical scrolling, refresh or normal taps.
 */
export type InboxSection="activity"|"messages";
export function isInboxHorizontalGesture(dx:number,dy:number):boolean{
  return Number.isFinite(dx)&&Number.isFinite(dy)&&Math.abs(dx)>=16&&Math.abs(dx)>Math.abs(dy)*1.6;
}
export function nextInboxTab(current:InboxSection,dx:number,dy:number):InboxSection{
  if(!isInboxHorizontalGesture(dx,dy)||Math.abs(dx)<54)return current;
  return dx<0?"messages":"activity";
}
