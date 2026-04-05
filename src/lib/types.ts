// POI types
export type PoiType = 'landing' | 'takeoff' | 'weather_station' | 'webcam';
export type PoiDifficulty = 'easy' | 'moderate' | 'difficult' | 'expert';

export interface Poi {
  id: string;
  author_id: string;
  poi_type: PoiType;
  location: { type: 'Point'; coordinates: [number, number] } | null;
  location_name: string;
  altitude_m: number | null;
  description: string | null;
  wind_orientations: string[];
  difficulty: PoiDifficulty | null;
  ffvl_approved: boolean;
  station_url: string | null;
  station_provider: string | null;
  webcam_url: string | null;
  webcam_orientation: string | null;
  total_rating_sum: number;
  total_votes: number;
  is_active: boolean;
  average_rating: number;
  profiles?: Profile;
}

export interface PoiVote {
  poi_id: string;
  user_id: string;
  rating: number;
}

export interface CreatePoiInput {
  poi_type: PoiType;
  location_name: string;
  latitude?: number;
  longitude?: number;
  altitude_m?: number;
  description?: string;
  wind_orientations?: string[];
  difficulty?: PoiDifficulty;
  ffvl_approved?: boolean;
  station_url?: string;
  station_provider?: string;
  webcam_url?: string;
  webcam_orientation?: string;
}

export type WindDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'variable';
export type ReportType = 'observation' | 'forecast' | 'image_share';
export type ReactionType = 'like' | 'genius' | 'doubt';
export type BadgeLevel = 'beginner' | 'observer' | 'expert' | 'legend';
export type Gender = 'homme' | 'femme' | 'autre' | 'non_precise';
export type WingCategory = 'A' | 'B' | 'B+' | 'C' | 'D' | 'CCC' | 'biplace';
export type PilotLevel = 'debutant' | 'progression' | 'autonome' | 'confirme' | 'expert' | 'competition';

export interface ForecastScenario {
  id: string;
  report_id: string;
  hour_slot: string; // "10:00", "11:00", etc.
  wind_speed_kmh: number | null;
  wind_gust_kmh: number | null;
  wind_direction: WindDirection | null;
  turbulence_level: number | null;
  thermal_quality: number | null;
  flyability_score: number | null;
  description: string | null;
}

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  observer_score: number;
  total_reports: number;
  total_reactions_received: number;
  badge_level: BadgeLevel;
  preferred_sites: string[] | null;
  date_of_birth: string | null;
  gender: Gender | null;
  current_wing: string | null;
  current_wing_category: WingCategory | null;
  past_wings: string[];
  pilot_level: PilotLevel | null;
  certifications: string[];
  flying_since: number | null;
}

export interface WeatherReport {
  id: string;
  author_id: string;
  report_type: ReportType;
  location: { type: 'Point'; coordinates: [number, number] } | null;
  location_name: string | null;
  altitude_m: number | null;
  share_location: boolean;
  title: string | null;
  description: string | null;
  wind_speed_kmh: number | null;
  wind_gust_kmh: number | null;
  wind_direction: WindDirection | null;
  temperature_c: number | null;
  cloud_ceiling_m: number | null;
  visibility_km: number | null;
  thermal_quality: number | null;
  turbulence_level: number | null;
  flyability_score: number | null;
  tags: string[] | null;
  forecast_date: string | null;
  likes_count: number;
  genius_count: number;
  doubt_count: number;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  // Joined fields
  profiles?: Profile;
  report_images?: ReportImage[];
  forecast_scenarios?: ForecastScenario[];
}

export interface ReportImage {
  id: string;
  report_id: string;
  storage_path: string;
  url: string;
  caption: string | null;
  sort_order: number;
}

export interface ReportReaction {
  id: string;
  report_id: string;
  user_id: string;
  reaction: ReactionType;
}

export interface CreateReportInput {
  report_type: ReportType;
  location_name: string;
  share_location: boolean;
  latitude?: number;
  longitude?: number;
  altitude_m?: number;
  title?: string;
  description?: string;
  wind_speed_kmh?: number;
  wind_gust_kmh?: number;
  wind_direction?: WindDirection;
  temperature_c?: number;
  cloud_ceiling_m?: number;
  visibility_km?: number;
  thermal_quality?: number;
  turbulence_level?: number;
  flyability_score?: number;
  tags?: string[];
  forecast_date?: string;
  forecast_scenarios?: Omit<ForecastScenario, 'id' | 'report_id'>[];
}

// Wing types
export interface Wing {
  id: string;
  owner_id: string;
  brand: string;
  model: string;
  size: string | null;
  category: WingCategory | null;
  color: string | null;
  year: number | null;
  is_current: boolean;
  serial_number: string | null;
  notes: string | null;
}

// Vehicle types
export interface Vehicle {
  id: string;
  owner_id: string;
  name: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  license_plate: string | null;
  seats: number;
  photo_url: string | null;
  is_default: boolean;
}

// Shuttle types
export type ShuttleType = 'offer' | 'request';

export interface Shuttle {
  id: string;
  author_id: string;
  shuttle_type: ShuttleType;
  meeting_point: { type: 'Point'; coordinates: [number, number] } | null;
  meeting_point_name: string | null;
  meeting_point_alt: number | null;
  destination: { type: 'Point'; coordinates: [number, number] } | null;
  destination_name: string | null;
  destination_alt: number | null;
  departure_time: string;
  total_seats: number;
  taken_seats: number;
  price_per_person: number | null;
  return_requested: boolean;
  return_time: string | null;
  description: string | null;
  is_active: boolean;
  expires_at: string;
  vehicle_id: string | null;
  created_at: string;
  profiles?: Profile;
  passengers?: ShuttlePassenger[];
  vehicles?: Vehicle;
}

export interface UpdateShuttleInput {
  departure_time?: string;
  total_seats?: number;
  price_per_person?: number | null;
  description?: string | null;
  return_requested?: boolean;
  return_time?: string | null;
}

export type PassengerStatus = 'pending' | 'accepted' | 'rejected';

export interface ShuttlePassenger {
  id: string;
  shuttle_id: string;
  user_id: string;
  seats_taken: number;
  status: PassengerStatus;
  profiles?: Profile;
}

export interface CreateShuttleInput {
  shuttle_type: ShuttleType;
  meeting_point_name: string;
  destination_name: string;
  departure_time: string;
  total_seats: number;
  price_per_person?: number | null;
  return_requested: boolean;
  return_time?: string | null;
  description?: string | null;
  latitude?: number;
  longitude?: number;
  altitude_m?: number;
  // Two-pin location picker fields
  meeting_lat?: number;
  meeting_lng?: number;
  meeting_alt?: number;
  dest_lat?: number;
  dest_lng?: number;
  dest_alt?: number;
  vehicle_id?: string | null;
}

// Database type for supabase-js generics
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      weather_reports: {
        Row: WeatherReport;
        Insert: Omit<WeatherReport, 'id' | 'created_at' | 'likes_count' | 'genius_count' | 'doubt_count'>;
        Update: Partial<WeatherReport>;
      };
      report_images: {
        Row: ReportImage;
        Insert: Omit<ReportImage, 'id'>;
        Update: Partial<ReportImage>;
      };
      report_reactions: {
        Row: ReportReaction;
        Insert: Omit<ReportReaction, 'id'>;
        Update: Partial<ReportReaction>;
      };
    };
    Functions: {
      get_reports_in_radius: {
        Args: { lat: number; lng: number; radius_km: number };
        Returns: WeatherReport[]; 
      }; 
    }; 
  }; 
} 