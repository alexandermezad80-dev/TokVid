import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import {createDatabaseChannel} from '../lib/realtimeSubscriptions';
export function useVideoSaveCount(id?:string){
 const [count,setCount]=useState(0);
 useEffect(()=>{let active=true;setCount(0);if(!id||!/^[0-9a-f-]{36}$/i.test(id))return;
 const refresh=()=>void supabase.from('videos').select('saves_count').eq('id',id).maybeSingle().then(({data,error})=>{if(active&&!error)setCount(data?.saves_count??0);});
 refresh();const channel=createDatabaseChannel(`saves-count:${id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'videos',filter:`id=eq.${id}`},refresh).subscribe(status=>{if(status==='SUBSCRIBED')refresh();});return()=>{active=false;void supabase.removeChannel(channel);};},[id]);return count;
}
