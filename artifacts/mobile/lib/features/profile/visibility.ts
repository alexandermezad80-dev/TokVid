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
 const {data,error}=await supabase.rpc('profile_activity_ids',{p_user:userId,p_kind:kind,p_offset:offset});
 if(error)throw new Error('No se pudieron cargar estas publicaciones.');
 const ids=(data??[]).map((r:{video_id:string})=>r.video_id).filter((id:string)=>/^[0-9a-f-]{36}$/i.test(id));
 if(!ids.length)return {items:[],hasMore:(data?.length??0)===60};
 // Reapply the caller's publication RLS: an interaction never grants access to a video.
 const result=await supabase.from('videos').select('*').in('id',ids);
 if(result.error)throw new Error('No se pudieron cargar estas publicaciones.');
 const items=await mapRowsToVideoItems(result.data??[]);
 return {items:ids.map((id:string)=>items.find(v=>v.id===id)).filter((v:typeof items[number]|undefined):v is typeof items[number]=>!!v),hasMore:(data?.length??0)===60};
}
