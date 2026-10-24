import React from "react";
import {Platform,RefreshControl,ScrollView,StyleSheet,View} from "react-native";
/** Same centered empty/error/loading Inbox surfaces. Android must have a real
 * scrollable native refresh target even when there are no rows to drag.
 * The native spinner is invisible; PullRefreshUnderHeader owns the visible circle.
 */
export default function RefreshableInboxEmpty({children,refreshing,onRefresh}:{
  children:React.ReactNode;refreshing:boolean;onRefresh:()=>void|Promise<void>;
}){
  if(Platform.OS!=="android")return <View style={styles.fill}>{children}</View>;
  return <ScrollView style={styles.fill} contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}
      colors={["transparent"]} progressBackgroundColor="transparent" progressViewOffset={-1000}/>}>
    {children}
  </ScrollView>;
}
const styles=StyleSheet.create({fill:{flex:1},content:{flexGrow:1}});
