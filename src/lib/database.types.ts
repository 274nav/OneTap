export type SexType = 'male' | 'female' | 'other';
export type OrientationType = 'straight' | 'gay' | 'lesbian' | 'bisexual' | 'pansexual' | 'asexual' | 'other';
export type LikeStatus = 'pending' | 'matched' | 'rejected' | 'withdrawn';
export type VenueCategory =
  | 'pub'
  | 'bar'
  | 'restaurant'
  | 'university'
  | 'college'
  | 'gym'
  | 'shopping_centre'
  | 'event_venue'
  | 'cafe'
  | 'airport';
export type ReportReason =
  | 'fake_profile'
  | 'spam'
  | 'harassment'
  | 'inappropriate_content'
  | 'underage'
  | 'other';
export type NotificationType =
  | 'like_received'
  | 'match_created'
  | 'new_message'
  | 'match_removed'
  | 'checked_out'
  | 'venue_alert';

export interface UserRow {
  id: string;
  name: string;
  dob: string;
  sex: SexType;
  orientation: OrientationType;
  bio: string;
  photo_url: string | null;
  verified: boolean;
  premium: boolean;
  premium_expires_at: string | null;
  invisible_mode: boolean;
  free_likes_used: number;
  privacy_accepted_at: string;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  name: string;
  age: number;
  sex: SexType;
  orientation: OrientationType;
  bio: string;
  photo_url: string | null;
  verified: boolean;
  premium: boolean;
  invisible_mode: boolean;
  created_at: string;
}

export interface VenueRow {
  id: string;
  google_place_id: string;
  venue_name: string;
  latitude: number;
  longitude: number;
  category: VenueCategory;
  created_at: string;
}

export interface CheckInRow {
  id: string;
  user_id: string;
  venue_id: string;
  checked_in_at: string;
  active: boolean;
  last_verified_at: string;
  out_of_range_since: string | null;
  auto_checked_out_at: string | null;
  created_at: string;
}

export interface VenueActiveUser {
  user_id: string;
  name: string;
  age: number;
  bio: string;
  photo_url: string | null;
  verified: boolean;
  premium: boolean;
  checked_in_at: string;
}

export interface LikeRow {
  id: string;
  from_user: string;
  to_user: string;
  status: LikeStatus;
  created_at: string;
  updated_at: string;
}

export interface MatchRow {
  id: string;
  user1: string;
  user2: string;
  matched_at: string;
  active: boolean;
}

export interface MessageRow {
  id: string;
  match_id: string;
  sender_id: string;
  message: string;
  sent_at: string;
  deleted_by_sender: boolean;
  deleted_by_receiver: boolean;
}

export interface ReportRow {
  id: string;
  reporter: string;
  reported_user: string;
  reason: ReportReason;
  details: string | null;
  created_at: string;
}

export interface BlockRow {
  blocker: string;
  blocked: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
}
