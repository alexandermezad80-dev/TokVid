import {connectionIds} from './presentation';

export type ConnectionKind = 'friends' | 'followers' | 'following';
export type ConnectionPerson = {id: string; username: string; avatar_url: string | null};
export const connectionTabs = [
  {key: 'friends', label: 'Amigos', icon: 'users'},
  {key: 'followers', label: 'Seguidores', icon: 'user-plus'},
  {key: 'following', label: 'Siguiendo', icon: 'user-check'},
] as const;
export const connectionLabel = (kind: ConnectionKind) => connectionTabs.find(tab => tab.key === kind)!.label;

// Reuse the existing public, authenticated RPC and mutual-follow definition.
// Read every page: intersecting only the first 60 people can omit real friends.
export async function readProfileFriends(
  userId: string,
  readPage: (kind: 'followers' | 'following', offset: number) => Promise<ConnectionPerson[]>,
  isActive: () => boolean = () => true,
): Promise<ConnectionPerson[]> {
  async function readAll(kind: 'followers' | 'following') {
    const people: ConnectionPerson[] = [];
    for (let offset = 0; isActive(); offset += 60) {
      const page = await readPage(kind, offset);
      people.push(...page);
      if (page.length < 60) break;
    }
    return people;
  }
  const [followers, following] = await Promise.all([readAll('followers'), readAll('following')]);
  const ids = new Set(connectionIds([
    ...followers.map(person => ({follower_id: person.id, following_id: userId})),
    ...following.map(person => ({follower_id: userId, following_id: person.id})),
  ], userId).friends);
  return [...new Map(following.filter(person => ids.has(person.id)).map(person => [person.id, person])).values()];
}
