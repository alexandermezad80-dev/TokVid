import AsyncStorage from "@react-native-async-storage/async-storage";
const key = (userId: string) => `tokvid_demo_follows_${userId}`;
export async function readDemoFollows(userId: string): Promise<string[]> {
  try { return JSON.parse(await AsyncStorage.getItem(key(userId)) ?? "[]"); } catch { return []; }
}
export async function setDemoFollow(userId: string, creatorId: string, following: boolean) {
  const ids = new Set(await readDemoFollows(userId));
  following ? ids.add(creatorId) : ids.delete(creatorId);
  await AsyncStorage.setItem(key(userId), JSON.stringify([...ids]));
}
