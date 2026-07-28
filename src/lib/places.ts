import type { VenueCategory } from './database.types';

// Google Places "type" values we map to our venue_category enum for nearby search + check-in.
export const CATEGORY_PLACE_TYPES: Record<VenueCategory, string> = {
  pub: 'bar',
  bar: 'bar',
  restaurant: 'restaurant',
  university: 'university',
  college: 'university',
  gym: 'gym',
  shopping_centre: 'shopping_mall',
  event_venue: 'event_venue',
  cafe: 'cafe',
  airport: 'airport',
};

export interface NearbyPlace {
  google_place_id: string;
  venue_name: string;
  latitude: number;
  longitude: number;
  category: VenueCategory;
  distance_m?: number;
}

/**
 * Queries the Google Places "Nearby Search (New)" API for venues around a point.
 * Requires EXPO_PUBLIC_GOOGLE_PLACES_API_KEY. Falls back to an empty list if it isn't configured,
 * so the Map screen degrades gracefully rather than crashing during setup.
 */
export async function fetchNearbyVenues(
  lat: number,
  lng: number,
  category: VenueCategory,
  radiusMeters = 1500
): Promise<NearbyPlace[]> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location',
    },
    body: JSON.stringify({
      includedTypes: [CATEGORY_PLACE_TYPES[category]],
      maxResultCount: 20,
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
      },
    }),
  });

  if (!response.ok) return [];
  const json = await response.json();

  return (json.places ?? []).map((p: any) => ({
    google_place_id: p.id,
    venue_name: p.displayName?.text ?? 'Unnamed venue',
    latitude: p.location?.latitude,
    longitude: p.location?.longitude,
    category,
  }));
}
