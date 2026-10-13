import React from 'react';
import {Image,Pressable,Text,View,useWindowDimensions} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
export default function ProfilePhoto(){
 const {uri}=useLocalSearchParams<{uri?:string}>(),insets=useSafeAreaInsets(),{width}=useWindowDimensions();
 const size=Math.min(300,width-40);
 return <View style={{flex:1,backgroundColor:'#000',paddingTop:insets.top,paddingBottom:insets.bottom}}><View style={{height:52,flexDirection:'row',alignItems:'center'}}><Pressable accessibilityLabel="Volver" onPress={()=>router.back()} style={{width:52,height:52,alignItems:'center',justifyContent:'center'}}><Feather name="arrow-left" size={24} color="#FFF"/></Pressable><Text style={{fontSize:18,fontWeight:'700',color:'#FFF'}}>Foto de perfil</Text></View><View style={{flex:1,alignItems:'center',justifyContent:'center'}}>{uri?<Image source={{uri}} resizeMode="contain" style={{width:size,height:size,borderRadius:20,backgroundColor:'#161823'}}/>:<Text style={{color:'#8A8B97'}}>Todavía no tienes foto de perfil</Text>}</View></View>;
}
