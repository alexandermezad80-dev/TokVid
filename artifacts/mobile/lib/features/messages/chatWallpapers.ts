import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImageSourcePropType } from 'react-native';

export const CHAT_WALLPAPERS: {id:string; name:string; source:ImageSourcePropType|null; colors?:readonly [string,string]; fill?:string}[] = [
  {id:'aurora',name:'Aurora',source:require('../../../assets/chat-backgrounds/01-aurora.jpg')},
  {id:'atardecer',name:'Atardecer',source:require('../../../assets/chat-backgrounds/02-atardecer.jpg')},
  {id:'menta',name:'Menta y olas',source:require('../../../assets/chat-backgrounds/03-menta-olas.jpg')},
  {id:'burbujas',name:'Burbujas',source:require('../../../assets/chat-backgrounds/04-burbujas.jpg')},
  {id:'ondas',name:'Ondas',source:require('../../../assets/chat-backgrounds/05-ondas.jpg')},
  {id:'confeti',name:'Confeti',source:require('../../../assets/chat-backgrounds/06-confeti.jpg')},
  {id:'doodles',name:'Doodles',source:require('../../../assets/chat-backgrounds/07-doodles.jpg')},
  {id:'cielo',name:'Cielo',source:require('../../../assets/chat-backgrounds/08-cielo.jpg')},
  {id:'gris',name:'Gris sereno',source:null,colors:['#E2E5E9','#B2BCC7']},
  {id:'azul',name:'Azul profundo',source:null,colors:['#D7E6F1','#8DA9C2']},
  {id:'none',name:'Sin fondo',source:null},
];
const key=(userId:string,conversationId:string)=>`tokvid:wallpaper:v1:${userId}:${conversationId}`;
export async function readChatWallpaper(userId:string,conversationId:string){
  const value=await AsyncStorage.getItem(key(userId,conversationId));
  return CHAT_WALLPAPERS.some(w=>w.id===value)?value!:'none';
}
export async function saveChatWallpaper(userId:string,conversationId:string,id:string){
  if(!CHAT_WALLPAPERS.some(w=>w.id===id))throw new Error('Fondo desconocido');
  await AsyncStorage.setItem(key(userId,conversationId),id);
}
export const chatPalette=(dark:boolean)=>dark
 ? {background:'#000000',card:'#161823',surface:'#1C1C1E',border:'#2C2C2E',text:'#FFFFFF',secondary:'#8A8B97',accent:'#25F4EE'}
 : {background:'#FFFFFF',card:'#F9F9F9',surface:'#F0F0F0',border:'#E5E5E5',text:'#0A0A0A',secondary:'#737373',accent:'#0AA9A4'};
