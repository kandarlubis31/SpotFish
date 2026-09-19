// ============================================
// SpotFish! — TypeScript Types
// ============================================

export interface Profile {
  id: string;
  email: string;
  username: string;
  password_hash?: string;
  avatar_url?: string;
  bio?: string;
  specialization: 'laut' | 'air_tawar' | 'campuran' | 'all';
  spots_count: number;
  reviews_count: number;
  created_at: string;
  updated_at: string;
}

export interface Spot {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  spot_type: SpotType;
  fish_species: string[];
  conditions: SpotConditions;
  photos: string[];
  lat: number;
  lng: number;
  best_times?: string;
  facilities: string[];
  accessibility: 'mudah' | 'sedang' | 'sulit' | 'hanya_perahu';
  is_verified: boolean;
  rating_avg: number;
  review_count: number;
  favorites_count: number;
  legit_count?: number;
  reject_count?: number;
  my_vote?: -1 | 0 | 1;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
  distance_meters?: number;
  username?: string;
  avatar_url?: string;
  tags?: Tag[];
}

export type SpotType =
  | 'laut'
  | 'sungai'
  | 'danau'
  | 'kolam'
  | 'waduk'
  | 'dermaga'
  | 'muara'
  | 'rawa'
  | 'irigasi'
  | 'other';

export interface SpotConditions {
  arus?: 'kuat' | 'sedang' | 'lemah';
  kedalaman?: 'dangkal' | 'sedang' | 'dalam';
  substrat?: 'pasir' | 'batu' | 'lumpur' | 'terumbu';
}

export interface Review {
  id: string;
  spot_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  photos: string[];
  helpful_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
  username?: string;
  avatar_url?: string;
}

export interface FishSpecies {
  id: string;
  name: string;
  scientific_name?: string;
  category: 'laut' | 'air_tawar' | 'campuran';
  image_url?: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  icon?: string;
}

export interface Favorite {
  user_id: string;
  spot_id: string;
  created_at: string;
}

export interface Catch {
  id: string;
  user_id: string;
  spot_id: string;
  fish_species_id?: string;
  fish_name?: string;
  quantity: number;
  weight_kg?: number;
  length_cm?: number;
  bait_used?: string;
  technique?: string;
  caught_at: string;
  notes?: string;
  photo_url?: string;
  created_at: string;
  // Joined fields
  species_name?: string;
  spot_name?: string;
  username?: string;
}

// ============================================
// Constants
// ============================================

export const SPOT_TYPE_LABELS: Record<SpotType, string> = {
  laut: 'Laut',
  sungai: 'Sungai',
  danau: 'Danau',
  kolam: 'Kolam',
  waduk: 'Waduk',
  dermaga: 'Dermaga',
  muara: 'Muara',
  rawa: 'Rawa',
  irigasi: 'Irigasi',
  other: 'Lainnya',
};

// SPOT_TYPE_ICONS replaced by SpotTypeIcon component (colored SVG circles)

export const ACCESSIBILITY_LABELS: Record<string, string> = {
  mudah: 'Mudah',
  sedang: 'Sedang',
  sulit: 'Sulit',
  'hanya_perahu': 'Hanya Perahu',
};

export const FACILITY_LABELS: Record<string, string> = {
  parkir: 'Parkir',
  toilet: 'Toilet',
  warung: 'Warung',
  tempat_teduh: 'Tempat Teduh',
  perahu_sewa: 'Perahu Sewa',
};
