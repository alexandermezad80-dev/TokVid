import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

const INTERESTS = ["Música","Humor","Deportes","Cocina","Arte","Gaming","Viajes","Moda","Belleza","Tecnología","Educación","Fitness","Noticias","Baile","Comedia","Cine"];

export default function InterestsScreen() {
  const insets=useSafeAreaInsets();
  const [selected,setSelected]=useState<string[]>([]);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const toggle=(item:string)=>setSelected(v=>v.includes(item)?v.filter(x=>x!==item):[...v,item]);
  const finish=async()=>{
    if(selected.length<3){setError("Elegí al menos 3 intereses.");return;}
    setSaving(true);setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if(!user){setSaving(false);setError("No hay una sesión activa.");return;}
    const { error:profileError }=await supabase.from("profiles").update({interests:selected}).eq("id",user.id);
    if(profileError){setSaving(false);setError(profileError.message);return;}
    const {error:e}=await supabase.auth.updateUser({data:{interests:selected,onboarding_completed:true}});
    setSaving(false);
    if(e){setError(e.message);return;}
    router.replace("/(tabs)");
  };
  return <View style={styles.root}><ScrollView contentContainerStyle={[styles.container,{paddingTop:insets.top+28,paddingBottom:insets.bottom+28}]}>
    <Text style={styles.step}>PASO 2 DE 2</Text><Text style={styles.title}>¿Qué te interesa?</Text>
    <Text style={styles.subtitle}>Elegí al menos 3. Los usaremos para personalizar tu experiencia.</Text>
    <View style={styles.grid}>{INTERESTS.map(item=><Pressable key={item} onPress={()=>toggle(item)} style={[styles.chip,selected.includes(item)&&styles.active]}><Text style={[styles.chipText,selected.includes(item)&&styles.activeText]}>{item}</Text></Pressable>)}</View>
    {error&&<Text style={styles.error}>{error}</Text>}
    <Text style={styles.count}>{selected.length} seleccionados</Text>
    <Pressable onPress={finish} disabled={saving} style={[styles.button,saving&&styles.disabled]}>{saving?<ActivityIndicator color="#000"/>:<Text style={styles.buttonText}>Entrar a TokVid</Text>}</Pressable>
  </ScrollView></View>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:"#000"},container:{paddingHorizontal:24},step:{color:"#00F2EA",fontSize:11,fontWeight:"800",letterSpacing:1.4,marginBottom:8},title:{color:"#fff",fontSize:30,fontWeight:"900"},subtitle:{color:"#999",fontSize:15,lineHeight:22,marginTop:8,marginBottom:24},grid:{flexDirection:"row",flexWrap:"wrap",gap:10},chip:{paddingHorizontal:17,paddingVertical:13,borderRadius:22,borderWidth:1,borderColor:"#333",backgroundColor:"#14141C"},active:{backgroundColor:"#00F2EA",borderColor:"#00F2EA"},chipText:{color:"#ddd",fontSize:14,fontWeight:"700"},activeText:{color:"#000"},error:{color:"#FE2C55",fontSize:13,marginTop:16},count:{color:"#777",fontSize:12,textAlign:"center",marginTop:18},button:{height:56,borderRadius:16,backgroundColor:"#00F2EA",alignItems:"center",justifyContent:"center",marginTop:16},disabled:{opacity:.6},buttonText:{color:"#000",fontSize:16,fontWeight:"900"}});
