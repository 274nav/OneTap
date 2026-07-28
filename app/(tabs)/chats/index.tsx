import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { AdBanner } from '@/components/AdBanner';
import { colors, spacing, typography } from '@/lib/theme';

const FREE_MAX_CONVERSATIONS = 3;

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function ChatsScreen() {
  const { profile } = useAuth();
  const { conversations } = useConversations();
  const router = useRouter();

  return (
    <View style={styles.container}>
      {!profile?.premium && (
        <View style={styles.limitBanner}>
          <Text style={styles.limitText}>
            {conversations.length}/{FREE_MAX_CONVERSATIONS} free conversations active
          </Text>
        </View>
      )}

      <FlatList
        data={conversations}
        keyExtractor={(c) => c.match.id}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}
        ListEmptyComponent={
          <EmptyState icon="chatbubbles-outline" title="No conversations yet" message="Once you and someone else like each other, your chat unlocks here." />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(tabs)/chats/${item.match.id}`)}>
            <Card style={styles.row}>
              <Avatar uri={item.otherUser.photo_url} name={item.otherUser.name} size={52} />
              <View style={{ flex: 1 }}>
                <View style={styles.topLine}>
                  <Text style={styles.name}>{item.otherUser.name}</Text>
                  {item.lastMessage && <Text style={styles.time}>{timeAgo(item.lastMessage.sent_at)}</Text>}
                </View>
                <Text style={styles.snippet} numberOfLines={1}>
                  {item.lastMessage ? item.lastMessage.message : 'You matched — say hi!'}
                </Text>
              </View>
              {item.unreadCount > 0 && <View style={styles.unreadDot} />}
            </Card>
          </Pressable>
        )}
      />
      <AdBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  limitBanner: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, padding: spacing.md, alignItems: 'center' },
  limitText: { ...typography.caption },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  topLine: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { ...typography.h3 },
  time: { ...typography.caption },
  snippet: { ...typography.caption, marginTop: 2 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
});
