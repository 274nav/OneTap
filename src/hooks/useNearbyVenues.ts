import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchNearbyVenues } from '@/lib/places';
import type { VenueCategory, VenueRow } from '@/lib/database.types';

/**
 * Finds venues near a point for the given category: asks Google Places, registers any new ones in our
 * `venues` table (so they get a stable id + can be checked into), then reads back the canonical rows.
 */
export function useNearbyVenues() {
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (lat: number, lng: number, category: VenueCategory) => {
    setLoading(true);
    try {
      const places = await fetchNearbyVenues(lat, lng, category);

      if (places.length > 0) {
        await supabase
          .from('venues')
          .upsert(
            places.map((p) => ({
              google_place_id: p.google_place_id,
              venue_name: p.venue_name,
              latitude: p.latitude,
              longitude: p.longitude,
              category: p.category,
            })),
            { onConflict: 'google_place_id', ignoreDuplicates: true }
          );
      }

      const placeIds = places.map((p) => p.google_place_id);
      const { data } = await supabase
        .from('venues')
        .select('*')
        .in('google_place_id', placeIds.length > 0 ? placeIds : ['__none__']);

      setVenues((data as VenueRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  return { venues, loading, search };
}
