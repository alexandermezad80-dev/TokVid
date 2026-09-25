import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BubbleStyleVariant } from "./Bubble";
const KEY="tokvid.bubbles.variant";
export async function getBubbleStyleVariant():Promise<BubbleStyleVariant>{
  const value=await AsyncStorage.getItem(KEY);
  return value&&["classic","minimal","rounded","glass","gradient","neon","elegant","compact"].includes(value)?value as BubbleStyleVariant:"classic";
}
export async function setBubbleStyleVariant(value:BubbleStyleVariant){await AsyncStorage.setItem(KEY,value);}
