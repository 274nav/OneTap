import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/Avatar';
import { friendlyRpcError } from '@/lib/utils';
import { colors, radius, spacing, typography } from '@/lib/theme';
import type { MatchRow, MessageRow, ReportReason, UserRow } from '@/lib/database.types';

const FREE_MAX_MESSAGES_PER_PERSON = 10;

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'fake_profile', label: 'Fake Profile' },
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'underage', label: 'Underage' },
  { value: 'other', label: 'Other' },
];

export default function ChatThreadScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { session, profile } = useAuth();
  const navigation = useNavigation();
  const router = useRouter();

  const [match, setMatch] = useState<MatchRow | null>(null);
  const [otherUser, setOtherUser] = useState<UserRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const myId = session?.user.id;
  const mySentCount = useMemo(() => messages.filter((m) => m.sender_id === myId).length, [messages, myId]);

  const loadThread = useCallback(async () => {
    if (!matchId || !myId) return;
    const { data: matchData } = await supabase.from('matches').select('*').eq('id', matchId).single();
    if (!matchData) return;
    setMatch(matchData as MatchRow);

    const otherId = matchData.user1 === myId ? matchData.user2 : matchData.user1;
    const { data: otherProfile } = await supabase.from('users').select('*').eq('id', otherId).single();
    setOtherUser(otherProfile as UserRow);

    const { data: msgs } = await supabase.from('messages').select('*').eq('match_id', matchId).order('sent_at', { ascending: true });
    setMessages((msgs as MessageRow[]) ?? []);

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('type', 'new_message')
      .eq('read', false)
      .contains('payload', { match_id: matchId });
  }, [matchId, myId]);

  useEffect(() => {
    loadThread();
    if (!matchId) return;
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` }, loadThread)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, loadThread]);

  const handleUnmatch = useCallback(() => {
    Alert.alert('Unmatch?', `You'll no longer be able to chat with ${otherUser?.name}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unmatch',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('matches').update({ active: false }).eq('id', matchId);
          router.back();
        },
      },
    ]);
  }, [matchId, otherUser?.name, router]);

  const handleDeleteConversation = useCallback(() => {
    Alert.alert('Delete this conversation?', 'This clears the message history on your side. It stays visible to the other person.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!myId) return;
          const mine = messages.filter((m) => m.sender_id === myId);
          const theirs = messages.filter((m) => m.sender_id !== myId);
          await Promise.all([
            ...mine.map((m) => supabase.from('messages').update({ deleted_by_sender: true }).eq('id', m.id)),
            ...theirs.map((m) => supabase.from('messages').update({ deleted_by_receiver: true }).eq('id', m.id)),
          ]);
          router.back();
        },
      },
    ]);
  }, [messages, myId, router]);

  const handleBlock = useCallback(() => {
    Alert.alert(`Block ${otherUser?.name}?`, 'They will disappear from your searches, matches, chats, and venue lists.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          if (!myId || !otherUser) return;
          await supabase.from('blocks').insert({ blocker: myId, blocked: otherUser.id });
          router.back();
        },
      },
    ]);
  }, [myId, otherUser, router]);

  const handleReport = useCallback(() => {
    Alert.alert(
      `Report ${otherUser?.name}`,
      'Why are you reporting this profile?',
      REPORT_REASONS.map((r) => ({
        text: r.label,
        onPress: async () => {
          if (!myId || !otherUser) return;
          await supabase.from('reports').insert({ reporter: myId, reported_user: otherUser.id, reason: r.value });
          Alert.alert('Report submitted', "Thanks — we'll review this profile.");
        },
      })).concat([{ text: 'Cancel', onPress: async () => {} }])
    );
  }, [myId, otherUser]);

  const showMenu = useCallback(() => {
    Alert.alert(otherUser?.name ?? '', undefined, [
      { text: 'Delete Conversation', onPress: handleDeleteConversation },
      { text: 'Unmatch', style: 'destructive', onPress: handleUnmatch },
      { text: 'Block', style: 'destructive', onPress: handleBlock },
      { text: 'Report', onPress: handleReport },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [otherUser?.name, handleDeleteConversation, handleUnmatch, handleBlock, handleReport]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: otherUser?.name ?? '',
      headerRight: () => <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} onPress={showMenu} style={{ marginRight: spacing.md }} />,
    });
  }, [navigation, otherUser?.name, showMenu]);

  const handleSend = async () => {
    if (!draft.trim() || !matchId || sending) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({ match_id: matchId, message: draft.trim() });
    setSending(false);
    if (error) return Alert.alert("Message not sent", friendlyRpcError(error));
    setDraft('');
  };

  const handleDeleteMessage = (msg: MessageRow) => {
    Alert.alert('Delete message?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const field = msg.sender_id === myId ? 'deleted_by_sender' : 'deleted_by_receiver';
          await supabase.from('messages').update({ [field]: true }).eq('id', msg.id);
        },
      },
    ]);
  };

  const visibleMessages = messages.filter((m) => (m.sender_id === myId ? !m.deleted_by_sender : !m.deleted_by_receiver));

  if (!match || !otherUser) return null;

  const atMessageLimit = !profile?.premium && mySentCount >= FREE_MAX_MESSAGES_PER_PERSON;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        data={visibleMessages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        renderItem={({ item }) => {
          const isMe = item.sender_id === myId;
          return (
            <Pressable onLongPress={() => handleDeleteMessage(item)} style={[styles.bubbleWrap, isMe && styles.bubbleWrapMe]}>
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={isMe ? styles.bubbleTextMe : styles.bubbleTextThem}>{item.message}</Text>
              </View>
            </Pressable>
          );
        }}
        ListHeaderComponent={
          <View style={styles.matchHeader}>
            <Avatar uri={otherUser.photo_url} name={otherUser.name} size={64} />
            <Text style={styles.matchHeaderText}>You matched with {otherUser.name}</Text>
          </View>
        }
      />

      {atMessageLimit ? (
        <View style={styles.limitBar}>
          <Text style={styles.limitText}>You've hit the free 10-message limit with {otherUser.name}. Upgrade to Premium for unlimited messages.</Text>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Message…"
            placeholderTextColor={colors.secondaryText}
            multiline
          />
          <Ionicons name="send" size={22} color={draft.trim() ? colors.accent : colors.border} onPress={handleSend} style={{ padding: spacing.sm }} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  matchHeader: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  matchHeaderText: { ...typography.caption },
  bubbleWrap: { alignSelf: 'flex-start', maxWidth: '78%' },
  bubbleWrapMe: { alignSelf: 'flex-end' },
  bubble: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.lg },
  bubbleThem: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleTextThem: { color: colors.text, fontSize: 15 },
  bubbleTextMe: { color: colors.white, fontSize: 15 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    maxHeight: 100,
    color: colors.text,
  },
  limitBar: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#FBEAE7' },
  limitText: { ...typography.caption, color: colors.accent, textAlign: 'center' },
});
