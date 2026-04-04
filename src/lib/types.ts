export type WindDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'variable';
export type ReportType = 'observation' | 'forecast' | 'image_share';
export type ReactionType = 'like' | 'genius' | 'doubt';
export type BadgeLevel = 'beginner' | 'observer' | 'expert' | 'legend';
export type Gender = 'homme' | 'femme' | 'autre' | 'non_precise';
export type WingCategory = 'A' | 'B' | 'B+' | 'C' | 'D' | 'CCC' | 'biplace';
export type PilotLevel = 'debutant' | 'progression' | 'autonome' | 'confirme' | 'expert' | 'competition';

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
  likes_count: number;
  genius_count: number;
  doubt_count: number;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  // Joined fields
  profiles?: Profile;
  report_images?: ReportImage[];
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
