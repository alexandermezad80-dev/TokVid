import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import {createDatabaseChannel} from '../lib/realtimeSubscriptions';
import {subscribeFavoriteChanges} from '../lib/features/favorites/changes';
export function useVideoSaveCount(id?:string){
 const [count,setCount]=useState<{saves:number;shares:number|null}>({saves:0,shares:null});
 useEffect(()=>{
  let active=true,sequence=0,pending=false,before=0;
  setCount({saves:0,shares:null});if(!id||!/^[0-9a-f-]{36}$/i.test(id))return;
  const refresh=()=>{
   if(pending)return;const request=++sequence;
   void supabase.from('videos').select('saves_count,shares_count').eq('id',id).maybeSingle().then(({data,error})=>{
    if(active&&request===sequence&&!pending&&!error)setCount({saves:data?.saves_count??0,shares:data?.shares_count??null});
   });
  };
  const unsubscribe=subscribeFavoriteChanges(change=>{
   if(change.videoId!==id)return;
   if(change.phase==='pending'){
    pending=true;++sequence;
    setCount(previous=>{before=previous.saves;return {...previous,saves:Math.max(0,previous.saves+(change.saved?1:-1))};});
   }else{
    pending=false;
    if(change.phase==='failed')setCount(previous=>({...previous,saves:before}));
    refresh();
   }
  });
  refresh();const channel=createDatabaseChannel(`saves-count:${id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'videos',filter:`id=eq.${id}`},refresh).subscribe(status=>{if(status==='SUBSCRIBED')refresh();});
  return()=>{active=false;++sequence;unsubscribe();void supabase.removeChannel(channel);};
 },[id]);return count;
}
