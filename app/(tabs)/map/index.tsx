import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNearbyVenues } from '@/hooks/useNearbyVenues';
import { useCheckIn } from '@/contexts/CheckInContext';
import { Chip } from '@/components/Chip';
import { VENUE_CATEGORY_META, haversineMeters } from '@/lib/utils';
import { colors, radius, spacing, typography } from '@/lib/theme';
import type { VenueCategory } from '@/lib/database.types';

const CATEGORIES = Object.keys(VENUE_CATEGORY_META) as VenueCategory[];

export default function MapScreen() {
  const router = useRouter();
  const { activeCheckIn, requestLocationPermission } = useCheckIn();
  const { venues, loading, search } = useNearbyVenues();

  const [region, setRegion] = useState<{ latitude: number; longitude: number } | null>(null);
  const [category, setCategory] = useState<VenueCategory>('pub');

  useEffect(() => {
    (async () => {
      const granted = await requestLocationPermission();
      if (!granted) return;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setRegion({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    })();
  }, [requestLocationPermission]);

  useEffect(() => {
    if (region) search(region.latitude, region.longitude, category);
  }, [region, category, search]);

  if (!region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.centeredText}>Finding your location…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {activeCheckIn && (
        <View style={styles.banner}>
          <Ionicons name="location" size={16} color={colors.white} />
          <Text style={styles.bannerText}>Checked into {activeCheckIn.venue.venue_name}</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {CATEGORIES.map((c) => (
          <Chip key={c} label={VENUE_CATEGORY_META[c].label} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{ ...region, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        showsUserLocation
      >
        {venues.map((v) => (
          <Marker
            key={v.id}
            coordinate={{ latitude: v.latitude, longitude: v.longitude }}
            title={v.venue_name}
            description={`${Math.round(haversineMeters(region.latitude, region.longitude, v.latitude, v.longitude))}m away`}
            pinColor={activeCheckIn?.venue_id === v.id ? colors.secondaryAccent : colors.accent}
            onPress={() => router.push(`/(tabs)/map/venue/${v.id}`)}
          />
        ))}
      </MapView>

      {loading && (
        <View style={styles.loadingPill}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>Searching nearby…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: spacing.sm },
  centeredText: { ...typography.caption },
  map: { flex: 1 },
  chipScroll: { flexGrow: 0, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  chipRow: { padding: spacing.md, gap: spacing.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  bannerText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  loadingPill: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: { ...typography.caption },
});
