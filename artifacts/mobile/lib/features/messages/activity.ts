export type ActivityEvent={type:string;actor_id:string|null;data:Record<string,unknown>;read:boolean;event_count?:number;unread_count?:number};
const VIDEO_TYPES=new Set(['like','comment','share','comment_like','favorite']);
export function activityPublication(n:ActivityEvent){const video=n.data?.videoId??n.data?.video_id,comment=n.data?.commentId??n.data?.comment_id;return {videoId:typeof video==='string'?video:undefined,commentId:typeof comment==='string'?comment:undefined};}
export function activityHasGallery(n:ActivityEvent){return VIDEO_TYPES.has(n.type)&&!!n.actor_id;}
export function activityCounter(n:ActivityEvent){return n.type==='message'?Math.max(0,n.unread_count??(n.read?0:1)):Math.max(0,n.event_count??1);}
