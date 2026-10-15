import AsyncStorage from "@react-native-async-storage/async-storage";
import {normalizeBubbleStyle,type BubbleStyleVariant} from "../bubbleStyles";

const KEY = "tokvid.bubbles.variant";

export async function getBubbleStyleVariant(): Promise<BubbleStyleVariant> {
  const value = await AsyncStorage.getItem(KEY);
  return normalizeBubbleStyle(value);
}

export async function setBubbleStyleVariant(value: BubbleStyleVariant) {
  await AsyncStorage.setItem(KEY, value);
}
