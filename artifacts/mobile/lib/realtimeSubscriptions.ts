import { supabase } from "./supabase";

let subscriptionSequence = 0;

// Allocate inside each effect setup, including React's reconnect/replay.
// A late cleanup must never remove another effect's database subscription.
export function createDatabaseChannel(scope: string) {
  return supabase.channel(`${scope}:subscription:${++subscriptionSequence}`);
}
