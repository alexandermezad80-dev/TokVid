import {referenceVisual as v} from '../../constants/referenceVisual';
import React from 'react';
import {Image,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Feather} from '@expo/vector-icons';
export default function BrandAvatar({uri,size=88,radius=16,reference=false}:{uri?:string|null;size?:number;radius?:number;reference?:boolean}){
 return <LinearGradient colors={reference?v.outline:['#25DAD6','#D64A7F']} start={{x:0,y:0}} end={{x:1,y:1}} style={{width:size,height:size,borderRadius:radius,padding:1}}>
  {uri?<Image source={{uri}} style={{width:'100%',height:'100%',borderRadius:radius-1,backgroundColor:'#DDE2E6'}}/>:<View style={{flex:1,borderRadius:radius-1,backgroundColor:'#E6E8EB',justifyContent:'center',alignItems:'center'}}><Feather name="user" size={size*.4} color="#7E8790"/></View>}
 </LinearGradient>;
}
