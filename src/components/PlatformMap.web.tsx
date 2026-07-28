import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { colors, spacing, typography } from '@/lib/theme';
import type { VenueRow } from '@/lib/database.types';

interface PlatformMapProps {
  region: { latitude: number; longitude: number };
  venues: VenueRow[];
  activeVenueId?: string;
  onMarkerPress: (venueId: string) => void;
  distanceLabel: (venue: VenueRow) => string;
}

/**
 * react-native-maps has no web renderer, so the web build lists venues instead of drawing pins.
 * Native (iOS/Android) uses PlatformMap.tsx with the real Google Map.
 */
export function PlatformMap({ venues, activeVenueId, onMarkerPress, distanceLabel }: PlatformMapProps) {
  return (
    <View style={styles.container}>
      <View style={styles.notice}>
        <Ionicons name="information-circle-outline" size={16} color={colors.secondaryText} />
        <Text style={styles.noticeText}>Map view is available on iOS/Android. Showing venues as a list here.</Text>
      </View>
      <FlatList
        data={venues}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}
        renderItem={({ item }) => (
          <Pressable onPress={() => onMarkerPress(item.id)}>
            <Card style={[styles.card, activeVenueId === item.id && styles.cardActive]}>
              <Text style={styles.name}>{item.venue_name}</Text>
              <Text style={styles.distance}>{distanceLabel(item)}</Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface },
  noticeText: { ...typography.caption },
  card: {},
  cardActive: { borderColor: colors.secondaryAccent },
  name: { ...typography.h3 },
  distance: { ...typography.caption, marginTop: 2 },
});
