import React from "react";
import {RefreshControl,ScrollView,StyleSheet} from "react-native";
/** Pull-to-refresh for Inbox loading/empty/error panels, below the existing fixed tabs. */
export default function RefreshableInboxEmpty({children,refreshing,onRefresh}:{
 children:React.ReactNode;refreshing:boolean;onRefresh:()=>void|Promise<void>;
}){
 return <ScrollView
  style={styles.fill}
  contentContainerStyle={styles.fillContent}
  showsVerticalScrollIndicator={false}
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FE2C55" colors={["#FE2C55"]}/>}
 >{children}</ScrollView>;
}
const styles=StyleSheet.create({fill:{flex:1},fillContent:{flexGrow:1}});
