/** Client-side estimate only, for display before check-in — the server RPC is the source of truth. */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function formatDob(dob: Date): string {
  return dob.toISOString().slice(0, 10);
}

export const VENUE_CATEGORY_META: Record<string, { label: string; icon: string }> = {
  pub: { label: 'Pub', icon: 'beer-outline' },
  bar: { label: 'Bar', icon: 'wine-outline' },
  restaurant: { label: 'Restaurant', icon: 'restaurant-outline' },
  university: { label: 'University', icon: 'school-outline' },
  college: { label: 'College', icon: 'school-outline' },
  gym: { label: 'Gym', icon: 'barbell-outline' },
  shopping_centre: { label: 'Shopping Centre', icon: 'cart-outline' },
  event_venue: { label: 'Event Venue', icon: 'calendar-outline' },
  cafe: { label: 'Café', icon: 'cafe-outline' },
  airport: { label: 'Airport', icon: 'airplane-outline' },
};

/** Maps the exception codes raised by Supabase RPCs/triggers to copy a user should see. */
export const RPC_ERROR_MESSAGES: Record<string, string> = {
  AD_REQUIRED: "You've used your free likes. Watch a quick ad to get 8 more.",
  BLOCKED: "You can't do that with this user.",
  OUT_OF_RANGE: "You're too far from this venue to check in. Get within 100m and try again.",
  VENUE_NOT_FOUND: 'This venue could not be found.',
  NOT_CHECKED_IN: "You're not checked into a venue right now.",
  MESSAGE_LIMIT_REACHED: "You've hit the free 10-message limit with this person. Upgrade to Premium for unlimited messages.",
  CONVERSATION_LIMIT_REACHED: 'Free accounts can have 3 active conversations. End one or upgrade to Premium.',
  MATCH_NOT_ACTIVE: "This match is no longer active.",
  NOT_ALLOWED: "You can't do that.",
  PREMIUM_REQUIRED: 'This is a Premium feature.',
};

export function friendlyRpcError(error: { message?: string } | null | undefined): string {
  if (!error?.message) return 'Something went wrong. Please try again.';
  for (const code of Object.keys(RPC_ERROR_MESSAGES)) {
    if (error.message.includes(code)) return RPC_ERROR_MESSAGES[code];
  }
  return 'Something went wrong. Please try again.';
}
