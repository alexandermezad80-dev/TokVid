import {supabase} from '../../supabase';
import {mapRowsToVideoItems} from '../../../hooks/useVideoFeed';
export type ProfileVisibility={show_likes:boolean;show_shares:boolean};
export async function readProfileVisibility(userId:string):Promise<ProfileVisibility>{
 const {data,error}=await supabase.from('profile_visibility').select('show_likes,show_shares').eq('user_id',userId).maybeSingle();
 if(error)throw new Error('No se pudo consultar la privacidad del perfil.');
 return data??{show_likes:false,show_shares:false};
}
export async function saveProfileVisibility(userId:string,value:ProfileVisibility){
 const {data,error}=await supabase.from('profile_visibility').upsert({user_id:userId,...value}).select('show_likes,show_shares').single();
 if(error||!data)throw new Error('No se guardó la privacidad. Inténtalo de nuevo.');return data as ProfileVisibility;
}
export async function readProfileActivity(userId:string,kind:'liked'|'shared',offset=0){
 if(kind==='shared')return readSharedContent(userId,offset);
 const {data,error}=await supabase.rpc('profile_activity_ids',{p_user:userId,p_kind:kind,p_offset:offset});
 if(error)throw new Error('No se pudieron cargar estas publicaciones.');
 const ids:string[]=(data??[]).map((r:{video_id:string})=>r.video_id).filter((id:string)=>/^[0-9a-f-]{36}$/i.test(id));
 if(!ids.length)return {items:[],hasMore:(data?.length??0)===60};
 // Reapply the caller's publication RLS: an interaction never grants access to a video.
 const result=await supabase.from('videos').select('*').in('id',ids);
 if(result.error)throw new Error('No se pudieron cargar estas publicaciones.');
 const items=await mapRowsToVideoItems(result.data??[]);
 return {items:ids.map((id:string)=>items.find(v=>v.id===id)).filter((v:typeof items[number]|undefined):v is typeof items[number]=>!!v),hasMore:(data?.length??0)===60};
}


/** References never grant access: read the content again using the caller's RLS. */
async function readSharedContent(userId:string,offset:number){
 const {data,error}=await supabase.rpc('profile_shared_content',{p_user:userId,p_offset:offset});
 if(error)throw new Error('No se pudieron cargar los compartidos.');
 const refs=(data??[]) as {content_id:string;kind:'video'|'story'}[];
 const videoIds=refs.filter(r=>r.kind==='video').map(r=>r.content_id);
 const storyIds=refs.filter(r=>r.kind==='story').map(r=>r.content_id);
 const [videos,stories]=await Promise.all([
  videoIds.length?supabase.from('videos').select('*').in('id',videoIds):Promise.resolve({data:[],error:null}),
  storyIds.length?supabase.from('stories').select('id,user_id,media_url,media_type,created_at,expires_at').in('id',storyIds).gt('expires_at',new Date().toISOString()):Promise.resolve({data:[],error:null}),
 ]);
 if(videos.error||stories.error)throw new Error('No se pudieron cargar los compartidos.');
 const items=await mapRowsToVideoItems(videos.data??[]);
 for(const story of stories.data??[])items.push({id:story.id,storyId:story.id,storyExpiresAt:story.expires_at,uri:story.media_url,
  mediaType:story.media_type,thumbnail:story.media_type==='image'?{uri:story.media_url}:undefined,
  creator:'',creatorHandle:'',creatorAvatar:'',creatorId:story.user_id,caption:'Historia compartida',song:'',likes:0,comments:0,shares:0,isFollowing:false,isReal:true});
 return {items:refs.map(r=>items.find(item=>item.id===r.content_id&&!!item.storyId===(r.kind==='story'))).filter((item):item is typeof items[number]=>!!item),hasMore:refs.length===60};
}
export async function removeSharedReference(item:{id:string;storyId?:string}){
 const {data,error}=await supabase.rpc('remove_shared_reference',{p_kind:item.storyId?'story':'video',p_content_id:item.id});
 if(error||data!==true)throw new Error('No se pudo quitar de Compartidos. Inténtalo de nuevo.');
}
