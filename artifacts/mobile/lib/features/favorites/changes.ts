/** Only favorite mutations use this channel. Shares and likes never change it. */
export type FavoriteChange={userId:string;videoId:string;saved:boolean;phase:'pending'|'confirmed'|'failed'};
const listeners=new Set<(event:FavoriteChange)=>void>();
const active=new Set<string>();
const key=(userId:string,videoId:string)=>`${userId}:${videoId}`;
export function subscribeFavoriteChanges(listener:(event:FavoriteChange)=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
export function beginFavoriteChange(event:Omit<FavoriteChange,'phase'>){
 const id=key(event.userId,event.videoId);if(active.has(id))return false;active.add(id);
 for(const listener of listeners)listener({...event,phase:'pending'});return true;
}
export function finishFavoriteChange(event:Omit<FavoriteChange,'phase'>,confirmed:boolean){
 const id=key(event.userId,event.videoId);if(!active.delete(id))return;
 for(const listener of listeners)listener({...event,phase:confirmed?'confirmed':'failed'});
}
