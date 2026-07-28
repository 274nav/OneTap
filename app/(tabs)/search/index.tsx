import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckIn } from '@/contexts/CheckInContext';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { AdBanner } from '@/components/AdBanner';
import { friendlyRpcError } from '@/lib/utils';
import { useSendLike } from '@/hooks/useSendLike';
import { colors, spacing, typography } from '@/lib/theme';
import type { VenueActiveUser } from '@/lib/database.types';

type FilterKey = 'everyone' | 'male' | 'female' | 'lgbtq';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'everyone', label: 'Everyone' },
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'lgbtq', label: 'LGBTQ+' },
];

export default function SearchScreen() {
  const { session, profile } = useAuth();
  const { activeCheckIn } = useCheckIn();
  const [members, setMembers] = useState<VenueActiveUser[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('everyone');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session?.user || !profile?.premium) return;
    supabase
      .from('watched_users')
      .select('watched_id')
      .eq('watcher_id', session.user.id)
      .then(({ data }) => setWatchedIds(new Set((data ?? []).map((w) => w.watched_id))));
  }, [session?.user, profile?.premium]);

  useEffect(() => {
    if (!activeCheckIn) {
      setMembers([]);
      return;
    }
    supabase
      .rpc('venue_active_users', { p_venue_id: activeCheckIn.venue_id })
      .then(({ data }) => setMembers((data as VenueActiveUser[]) ?? []));
  }, [activeCheckIn?.venue_id]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (query && !m.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (filter === 'everyone') return true;
      if (filter === 'male') return m.sex === 'male';
      if (filter === 'female') return m.sex === 'female';
      if (filter === 'lgbtq') return m.orientation !== 'straight';
      return true;
    });
  }, [members, query, filter]);

  const handleLike = useSendLike((toUser) => setLikedIds((prev) => new Set(prev).add(toUser)));

  const toggleWatch = async (watchedId: string) => {
    if (!session?.user || !profile?.premium) {
      Alert.alert('Premium feature', 'Upgrade to Premium to get notified when someone checks in.');
      return;
    }
    if (watchedIds.has(watchedId)) {
      await supabase.from('watched_users').delete().eq('watcher_id', session.user.id).eq('watched_id', watchedId);
      setWatchedIds((prev) => {
        const next = new Set(prev);
        next.delete(watchedId);
        return next;
      });
    } else {
      const { error } = await supabase.from('watched_users').insert({ watcher_id: session.user.id, watched_id: watchedId });
      if (error) return Alert.alert('Error', friendlyRpcError(error));
      setWatchedIds((prev) => new Set(prev).add(watchedId));
    }
  };

  if (!activeCheckIn) {
    return (
      <View style={styles.container}>
        <EmptyState icon="search-outline" title="Check into a venue first" message="Search only shows people currently checked into the same venue as you." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.secondaryText} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name…"
          value={query}
          onChangeText={setQuery}
          placeholderTextColor={colors.secondaryText}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chipRow}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(m) => m.user_id}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}
        ListEmptyComponent={<EmptyState icon="people-outline" title="No matches" message="Try a different search or filter." />}
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <Avatar uri={item.photo_url} name={item.name} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {item.name}, {item.age}
              </Text>
              {!!item.bio && (
                <Text style={styles.bio} numberOfLines={2}>
                  {item.bio}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <Ionicons
                name={watchedIds.has(item.user_id) ? 'notifications' : 'notifications-outline'}
                size={22}
                color={watchedIds.has(item.user_id) ? colors.secondaryAccent : colors.secondaryText}
                onPress={() => toggleWatch(item.user_id)}
              />
              <Ionicons
                name={likedIds.has(item.user_id) ? 'heart' : 'heart-outline'}
                size={26}
                color={colors.accent}
                onPress={() => !likedIds.has(item.user_id) && handleLike(item.user_id)}
              />
            </View>
          </Card>
        )}
      />
      <AdBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  chipRow: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { ...typography.h3 },
  bio: { ...typography.caption, marginTop: 2 },
});
