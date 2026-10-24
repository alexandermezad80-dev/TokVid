/** Continuous, bidirectional position of one touch along a horizontal tab strip. */
export function clampSwipePosition(index:number,dx:number,width:number,last:number):number{
 if(!Number.isFinite(index)||!Number.isFinite(dx)||!Number.isFinite(width)||width<=0)return Math.max(0,Math.min(last,index||0));
 return Math.max(0,Math.min(last,index-dx/width));
}
/** Snap based on displacement and momentum, without skipping pages on a quick flick. */
export function settleSwipePosition(start:number,dx:number,vx:number,width:number,last:number):number{
 const current=clampSwipePosition(start,dx,width,last);
 const projected=Number.isFinite(vx)?current-vx*0.22:current;
 // Start responding to intentional 22%-width pulls, even at low release velocity.
 const move=current-start;
 if(Math.abs(move)>=0.22&&Math.abs(move)<0.5&&Math.abs(vx||0)<0.35)
   return Math.max(0,Math.min(last,start+(move>0?1:-1)));
 return Math.max(0,Math.min(last,Math.round(projected)));
}
