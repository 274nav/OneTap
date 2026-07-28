import React from 'react';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { StyleSheet } from 'react-native';
import { colors } from '@/lib/theme';
import type { VenueRow } from '@/lib/database.types';

interface PlatformMapProps {
  region: { latitude: number; longitude: number };
  venues: VenueRow[];
  activeVenueId?: string;
  onMarkerPress: (venueId: string) => void;
  distanceLabel: (venue: VenueRow) => string;
}

export function PlatformMap({ region, venues, activeVenueId, onMarkerPress, distanceLabel }: PlatformMapProps) {
  return (
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
          description={distanceLabel(v)}
          pinColor={activeVenueId === v.id ? colors.secondaryAccent : colors.accent}
          onPress={() => onMarkerPress(v.id)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
