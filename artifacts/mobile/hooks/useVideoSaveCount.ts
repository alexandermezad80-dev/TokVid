import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import {createDatabaseChannel} from '../lib/realtimeSubscriptions';
export function useVideoSaveCount(id?:string){
 const [count,setCount]=useState<{saves:number;shares:number|null}>({saves:0,shares:null});
 useEffect(()=>{let active=true;setCount({saves:0,shares:null});if(!id||!/^[0-9a-f-]{36}$/i.test(id))return;
 const refresh=()=>void supabase.from('videos').select('saves_count,shares_count').eq('id',id).maybeSingle().then(({data,error})=>{if(active&&!error)setCount({saves:data?.saves_count??0,shares:data?.shares_count??null});});
 refresh();const channel=createDatabaseChannel(`saves-count:${id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'videos',filter:`id=eq.${id}`},refresh).subscribe(status=>{if(status==='SUBSCRIBED')refresh();});return()=>{active=false;void supabase.removeChannel(channel);};},[id]);return count;
}
