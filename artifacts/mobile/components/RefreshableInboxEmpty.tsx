import React from "react";
import {StyleSheet,View} from "react-native";
/** Preserve the approved centered empty/loading/error Inbox content.
 * Parent PullRefreshUnderHeader now owns the single refresh gesture and indicator.
 */
export default function RefreshableInboxEmpty({children}:{
 children:React.ReactNode;refreshing:boolean;onRefresh:()=>void|Promise<void>;
}){
 return <View style={styles.fill}>{children}</View>;
}
const styles=StyleSheet.create({fill:{flex:1}});
