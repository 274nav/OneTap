import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { calculateAge, friendlyRpcError } from '@/lib/utils';
import { useSendLike } from '@/hooks/useSendLike';
import { colors, spacing, typography } from '@/lib/theme';
import type { LikeRow, ReportReason, UserRow } from '@/lib/database.types';

interface LikeWithProfile extends LikeRow {
  profile: UserRow;
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'fake_profile', label: 'Fake Profile' },
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'underage', label: 'Underage' },
  { value: 'other', label: 'Other' },
];

export default function MatchesScreen() {
  const { session } = useAuth();
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [received, setReceived] = useState<LikeWithProfile[]>([]);
  const [sent, setSent] = useState<LikeWithProfile[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const [receivedRes, sentRes] = await Promise.all([
      supabase.from('likes').select('*, profile:users!likes_from_user_fkey(*)').eq('to_user', session.user.id).eq('status', 'pending'),
      supabase.from('likes').select('*, profile:users!likes_to_user_fkey(*)').eq('from_user', session.user.id).eq('status', 'pending'),
    ]);
    setReceived((receivedRes.data as unknown as LikeWithProfile[]) ?? []);
    setSent((sentRes.data as unknown as LikeWithProfile[]) ?? []);
  }, [session?.user]);

  useEffect(() => {
    load();
    if (!session?.user) return;
    const channel = supabase
      .channel(`likes:${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user, load]);

  const sendLike = useSendLike(load);
  const likeBack = (like: LikeWithProfile) => sendLike(like.from_user);

  const reject = async (like: LikeWithProfile) => {
    const { error } = await supabase.from('likes').update({ status: 'rejected' }).eq('id', like.id);
    if (error) return Alert.alert('Error', friendlyRpcError(error));
    load();
  };

  const withdraw = async (like: LikeWithProfile) => {
    const { error } = await supabase.from('likes').update({ status: 'withdrawn' }).eq('id', like.id);
    if (error) return Alert.alert('Error', friendlyRpcError(error));
    load();
  };

  const block = (like: LikeWithProfile) => {
    Alert.alert(`Block ${like.profile.name}?`, 'They will disappear from your searches, matches, chats, and venue lists.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          if (!session?.user) return;
          await supabase.from('blocks').insert({ blocker: session.user.id, blocked: like.from_user });
          load();
        },
      },
    ]);
  };

  const report = (like: LikeWithProfile) => {
    Alert.alert(
      `Report ${like.profile.name}`,
      'Why are you reporting this profile?',
      REPORT_REASONS.map((r) => ({
        text: r.label,
        onPress: async () => {
          if (!session?.user) return;
          await supabase.from('reports').insert({ reporter: session.user.id, reported_user: like.from_user, reason: r.value });
          Alert.alert('Report submitted', "Thanks — we'll review this profile.");
        },
      })).concat([{ text: 'Cancel', onPress: async () => {} }])
    );
  };

  const data = tab === 'received' ? received : sent;

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <Chip label="Likes You" active={tab === 'received'} onPress={() => setTab('received')} />
        <Chip label="Sent" active={tab === 'sent'} onPress={() => setTab('sent')} />
      </View>

      <FlatList
        data={data}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title={tab === 'received' ? 'No likes yet' : 'No pending likes sent'}
            message={
              tab === 'received'
                ? 'Check into a venue and be visible — likes from people there will show up here.'
                : "Likes you've sent that haven't been answered yet will show up here."
            }
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardTop}>
              <Avatar uri={item.profile.photo_url} name={item.profile.name} size={56} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {item.profile.name}, {calculateAge(new Date(item.profile.dob))}
                </Text>
                {!!item.profile.bio && (
                  <Text style={styles.bio} numberOfLines={2}>
                    {item.profile.bio}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.actionRow}>
              {tab === 'received' ? (
                <>
                  <ActionButton icon="heart" color={colors.accent} onPress={() => likeBack(item)} />
                  <ActionButton icon="close" color={colors.secondaryText} onPress={() => reject(item)} />
                  <ActionButton icon="ban" color={colors.danger} onPress={() => block(item)} />
                  <ActionButton icon="flag" color={colors.secondaryText} onPress={() => report(item)} />
                </>
              ) : (
                <ActionButton icon="close-circle-outline" label="Unlike" color={colors.secondaryText} onPress={() => withdraw(item)} />
              )}
            </View>
          </Card>
        )}
      />
    </View>
  );
}

function ActionButton({
  icon,
  color,
  onPress,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  onPress: () => void;
  label?: string;
}) {
  return (
    <View style={styles.actionButton}>
      <Ionicons name={icon} size={22} color={color} onPress={onPress} />
      {label && <Text style={[styles.actionLabel, { color }]}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.xl, paddingBottom: 0 },
  card: { gap: spacing.md },
  cardTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  name: { ...typography.h3 },
  bio: { ...typography.caption, marginTop: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  actionButton: { alignItems: 'center', gap: 2 },
  actionLabel: { fontSize: 11, fontWeight: '600' },
});
