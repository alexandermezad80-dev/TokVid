import {useEffect,useRef} from 'react';
import {Keyboard,Platform,useWindowDimensions} from 'react-native';
import {AndroidSoftInputModes,KeyboardController} from 'react-native-keyboard-controller';
import {useKeyboardSheetViewport} from './useKeyboardSheetViewport';

// The scene keeps its height. Only the editor follows the measured IME overlap.
// Scoped to messaging: registration and other forms retain their resize policy.
export function useOverlayKeyboard(active:boolean){
 const window=useWindowDimensions();
 const full=useRef({width:window.width,height:window.height});
 const viewport=useKeyboardSheetViewport(active);
 if(!viewport.keyboardVisible&&!Keyboard.isVisible())full.current={width:window.width,height:window.height};
 if(window.width!==full.current.width)full.current={width:window.width,height:window.height};
 useEffect(()=>{
  if(!active||Platform.OS!=='android')return;
  KeyboardController.setInputMode(AndroidSoftInputModes.SOFT_INPUT_ADJUST_NOTHING);
  return()=>KeyboardController.setDefaultMode();
 },[active]);
 return {...viewport,fullHeight:full.current.height};
}
