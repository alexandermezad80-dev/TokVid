export const MIN_TRIM_SECONDS=0.5;
export function clampTime(value:number,min:number,max:number){return Math.min(max,Math.max(min,Number.isFinite(value)?value:min));}
export function trimBoundary(first:boolean,value:number,start:number,end:number,duration:number){
 const rounded=Math.round(clampTime(value,0,duration)*100)/100;
 return first?clampTime(rounded,0,Math.max(0,end-MIN_TRIM_SECONDS)):clampTime(rounded,start+MIN_TRIM_SECONDS,duration);
}
export function editorTime(seconds:number){
 const cs=Math.round(Math.max(0,Number.isFinite(seconds)?seconds:0)*100);
 return `${Math.floor(cs/6000)}:${String(Math.floor(cs/100)%60).padStart(2,'0')}.${String(cs%100).padStart(2,'0')}`;
}
export function thumbnailTimes(duration:number,count=8){
 if(!Number.isFinite(duration)||duration<=0)return [];
 return Array.from({length:count},(_,i)=>Math.max(0,Math.min(duration-0.05,duration*(i+0.5)/count)));
}
