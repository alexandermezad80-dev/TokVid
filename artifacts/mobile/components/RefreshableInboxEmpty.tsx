import React from "react";
import {StyleSheet} from "react-native";
import {ResistantScrollView} from "./ResistantRefresh";
/** Same centered content and refresh callback, including an empty page. */
export default function RefreshableInboxEmpty({children,refreshing,onRefresh,enabled=true}:{
  children:React.ReactNode;refreshing:boolean;onRefresh:()=>void|Promise<void>;enabled?:boolean;
}){
  return <ResistantScrollView style={styles.fill} contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false} {...{refreshing,onRefresh,enabled}} color="#FE2C55" holdDistance={64}>
    {children}
  </ResistantScrollView>;
}
const styles=StyleSheet.create({fill:{flex:1},content:{flexGrow:1}});
