export function publicationTileSize(containerWidth:number) {
 const width=Math.max(1,Math.floor((containerWidth-20-12)/3));
 return {width,height:Math.round(width/0.64)};
}
export function connectionIds(rows:{follower_id:string;following_id:string}[],actorId:string) {
 const following=new Set(rows.filter(r=>r.follower_id===actorId&&r.following_id!==actorId).map(r=>r.following_id));
 const followers=new Set(rows.filter(r=>r.following_id===actorId&&r.follower_id!==actorId).map(r=>r.follower_id));
 return {following:[...following],followers:[...followers],friends:[...following].filter(id=>followers.has(id))};
}
