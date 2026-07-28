import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useCheckIn } from '@/contexts/CheckInContext';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { VENUE_CATEGORY_META } from '@/lib/utils';
import { useSendLike } from '@/hooks/useSendLike';
import { colors, spacing, typography } from '@/lib/theme';
import type { VenueActiveUser, VenueRow } from '@/lib/database.types';

export default function VenueDetailScreen() {
  const { venueId } = useLocalSearchParams<{ venueId: string }>();
  const { activeCheckIn, checkIn, checkOut } = useCheckIn();

  const [venue, setVenue] = useState<VenueRow | null>(null);
  const [members, setMembers] = useState<VenueActiveUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const isCheckedInHere = activeCheckIn?.venue_id === venueId;

  const loadMembers = useCallback(async () => {
    if (!venueId) return;
    const { data } = await supabase.rpc('venue_active_users', { p_venue_id: venueId });
    setMembers((data as VenueActiveUser[]) ?? []);
  }, [venueId]);

  useEffect(() => {
    if (!venueId) return;
    supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single()
      .then(({ data }) => setVenue(data as VenueRow));
  }, [venueId]);

  useEffect(() => {
    if (isCheckedInHere) loadMembers();
  }, [isCheckedInHere, loadMembers]);

  const handleCheckIn = async () => {
    if (!venue) return;
    setBusy(true);
    const result = await checkIn(venue);
    setBusy(false);
    if (!result.success) Alert.alert('Check-in failed', result.message);
  };

  const handleCheckOut = async () => {
    setBusy(true);
    await checkOut();
    setBusy(false);
  };

  const handleLike = useSendLike((toUser) => setLikedIds((prev) => new Set(prev).add(toUser)));

  if (!venue) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.venueCard}>
        <Text style={styles.venueName}>{venue.venue_name}</Text>
        <Text style={styles.venueCategory}>{VENUE_CATEGORY_META[venue.category]?.label ?? venue.category}</Text>
        {isCheckedInHere ? (
          <Button label="Check Out" variant="secondary" loading={busy} onPress={handleCheckOut} style={{ marginTop: spacing.md }} />
        ) : (
          <Button label="Check In" loading={busy} onPress={handleCheckIn} style={{ marginTop: spacing.md }} />
        )}
      </Card>

      {isCheckedInHere ? (
        <FlatList
          data={members}
          keyExtractor={(m) => m.user_id}
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}
          ListEmptyComponent={
            <EmptyState icon="people-outline" title="No one else here yet" message="You'll be notified if someone checks in and likes you." />
          }
          renderItem={({ item }) => (
            <Card style={styles.memberRow}>
              <Avatar uri={item.photo_url} name={item.name} size={52} />
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>
                  {item.name}, {item.age}
                </Text>
                {!!item.bio && (
                  <Text style={styles.memberBio} numberOfLines={2}>
                    {item.bio}
                  </Text>
                )}
              </View>
              <Ionicons
                name={likedIds.has(item.user_id) ? 'heart' : 'heart-outline'}
                size={26}
                color={colors.accent}
                onPress={() => !likedIds.has(item.user_id) && handleLike(item.user_id)}
              />
            </Card>
          )}
        />
      ) : (
        <EmptyState
          icon="navigate-outline"
          title="Check in to see who's here"
          message={`Get within 100m of ${venue.venue_name} and tap Check In to view its venue list.`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  venueCard: { margin: spacing.xl, marginBottom: 0 },
  venueName: { ...typography.h2 },
  venueCategory: { ...typography.caption, marginTop: 2 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  memberName: { ...typography.h3 },
  memberBio: { ...typography.caption, marginTop: 2 },
});
