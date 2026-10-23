/** Gesture changes at most one owner section, never a Feed or visited-profile route. */
export const OWN_PROFILE_TABS=["videos","stories","shared","liked","saved","drafts"] as const;
export type OwnProfileTab=typeof OWN_PROFILE_TABS[number];
export function isOwnProfileHorizontalMove(dx:number,dy:number):boolean{
  return Number.isFinite(dx)&&Number.isFinite(dy)&&Math.abs(dx)>=16&&Math.abs(dx)>Math.abs(dy)*1.6;
}
export function adjacentOwnProfileTab(tab:OwnProfileTab,dx:number,dy:number):OwnProfileTab{
  if(!isOwnProfileHorizontalMove(dx,dy)||Math.abs(dx)<54)return tab;
  const i=OWN_PROFILE_TABS.indexOf(tab);
  if(i<0)return tab;
  return OWN_PROFILE_TABS[Math.max(0,Math.min(OWN_PROFILE_TABS.length-1,i+(dx<0?1:-1)))];
}
