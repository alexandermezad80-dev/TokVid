import React, {useCallback, useState} from 'react';
import {useFocusEffect} from 'expo-router';
import {StyleSheet, View, type ViewProps} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {palette} from '../../constants/palette';

/** Colors an existing header without replacing its controls or dimensions.
 * safeTop belongs here only when this header touches the system status bar.
 */
export default function HeaderSurface({children, style, safeTop=false, ...props}:ViewProps & {safeTop?:boolean}) {
  const insets=useSafeAreaInsets();
  const [focused,setFocused]=useState(false);
  useFocusEffect(useCallback(()=>{setFocused(true);return()=>setFocused(false);},[]));
  const layout=StyleSheet.flatten(style) ?? {};
  const top=layout.paddingTop ?? layout.paddingVertical ?? layout.padding ?? 0;
  return <View {...props} style={[style,s.shell,safeTop&&{paddingTop:insets.top+(typeof top==='number'?top:0)}]}>
    {safeTop&&focused&&<StatusBar style="dark"/>}
    {children}
  </View>;
}
const s=StyleSheet.create({shell:{backgroundColor:palette.header[0],borderBottomLeftRadius:20,borderBottomRightRadius:20,overflow:'hidden',borderBottomWidth:0}});
