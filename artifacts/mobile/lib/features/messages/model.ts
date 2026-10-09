export interface PrivateMessage {
  id: string; conversation_id: string; sender_id: string; text: string;
  created_at: string; read_by_other: boolean; deleted_at?: string | null;
}
export interface PrivateConversation {
  id: string; user1_id: string; user2_id: string; other_id: string;
  other_username: string; other_avatar: string | null; last_message: string;
  last_message_at: string; unread_count: number;
}
export function mergePrivateMessages(previous: PrivateMessage[], incoming: PrivateMessage[]) {
  const rows = new Map(previous.map(row => [row.id, row]));
  for (const row of incoming) row.deleted_at ? rows.delete(row.id) : rows.set(row.id,row);
  return [...rows.values()].sort((a,b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}
export function canRemoveForEveryone(rows: PrivateMessage[], actorId: string) {
  return rows.length > 0 && rows.every(row => row.sender_id === actorId);
}
export function privateMessagePopover(anchor: { x:number; y:number; width:number; height:number }, width:number, height:number, safeTop:number, desiredHeight:number) {
  const margin=16, menuWidth=Math.max(0,Math.min(320,width-margin*2));
  const upper=Math.min(Math.max(safeTop,8),height-16), bottom=Math.max(upper,height-16);
  const above=Math.max(0,Math.min(anchor.y-8,bottom)-upper);
  const below=Math.max(0,bottom-Math.max(upper,anchor.y+anchor.height+8));
  const useAbove=above>=Math.min(desiredHeight,180)||above>=below;
  const maxHeight=Math.min(desiredHeight,Math.max(0,useAbove?above:below));
  return {width:menuWidth,left:Math.max(margin,Math.min(width-margin-menuWidth,anchor.x+anchor.width-menuWidth)),
    top:useAbove?Math.max(upper,Math.min(anchor.y-8,bottom)-maxHeight):Math.max(upper,anchor.y+anchor.height+8),maxHeight};
}
