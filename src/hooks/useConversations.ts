import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { MatchRow, MessageRow, UserRow } from '@/lib/database.types';

export interface Conversation {
  match: MatchRow;
  otherUser: UserRow;
  lastMessage: MessageRow | null;
  unreadCount: number;
}

interface MatchWithProfiles extends MatchRow {
  user1_profile: UserRow;
  user2_profile: UserRow;
  messages: MessageRow[];
}

export function useConversations() {
  const { session } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user) {
      setConversations([]);
      setLoading(false);
      return;
    }
    const myId = session.user.id;

    const [{ data: matches }, { data: unreadNotifs }] = await Promise.all([
      supabase
        .from('matches')
        .select('*, user1_profile:users!matches_user1_fkey(*), user2_profile:users!matches_user2_fkey(*), messages(*)')
        .eq('active', true)
        .order('matched_at', { ascending: false }),
      supabase.from('notifications').select('payload').eq('type', 'new_message').eq('read', false),
    ]);

    const unreadByMatch = new Map<string, number>();
    for (const n of unreadNotifs ?? []) {
      const matchId = (n.payload as { match_id?: string })?.match_id;
      if (matchId) unreadByMatch.set(matchId, (unreadByMatch.get(matchId) ?? 0) + 1);
    }

    const list: Conversation[] = ((matches as unknown as MatchWithProfiles[]) ?? []).map((m) => {
      const otherUser = m.user1 === myId ? m.user2_profile : m.user1_profile;
      const visibleMessages = m.messages
        .filter((msg) => (msg.sender_id === myId ? !msg.deleted_by_sender : !msg.deleted_by_receiver))
        .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
      return {
        match: m,
        otherUser,
        lastMessage: visibleMessages[0] ?? null,
        unreadCount: unreadByMatch.get(m.id) ?? 0,
      };
    });

    list.sort((a, b) => {
      const aTime = a.lastMessage?.sent_at ?? a.match.matched_at;
      const bTime = b.lastMessage?.sent_at ?? b.match.matched_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setConversations(list);
    setLoading(false);
  }, [session?.user]);

  useEffect(() => {
    load();
    if (!session?.user) return;

    const channel = supabase
      .channel(`conversations:${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user, load]);

  return { conversations, loading, refresh: load };
}
