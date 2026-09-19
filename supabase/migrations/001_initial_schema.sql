-- ============================================
-- SpotFish! — Initial Database Schema
-- PostgreSQL 16 + PostGIS 3.4
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS / PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  specialization TEXT CHECK (specialization IN ('laut', 'air_tawar', 'campuran', 'all')) DEFAULT 'all',
  spots_count INT DEFAULT 0,
  reviews_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FISH SPECIES (Master Data)
-- ============================================
CREATE TABLE IF NOT EXISTS public.fish_species (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  scientific_name TEXT,
  category TEXT CHECK (category IN ('laut', 'air_tawar', 'campuran')),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TAGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  icon TEXT
);

-- ============================================
-- SPOTS (Core Table)
-- ============================================
CREATE TABLE IF NOT EXISTS public.spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  spot_type TEXT NOT NULL CHECK (spot_type IN (
    'laut', 'sungai', 'danau', 'kolam', 'waduk',
    'dermaga', 'muara', 'rawa', 'irigasi', 'other'
  )),
  fish_species UUID[] DEFAULT '{}',
  conditions JSONB DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  ) STORED,
  best_times TEXT,
  facilities JSONB DEFAULT '[]',
  accessibility TEXT CHECK (accessibility IN (
    'mudah', 'sedang', 'sulit', 'hanya_perahu'
  )) DEFAULT 'sedang',
  is_verified BOOLEAN DEFAULT FALSE,
  rating_avg DECIMAL(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  favorites_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for fast nearby queries
CREATE INDEX IF NOT EXISTS idx_spots_location ON public.spots USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_spots_user_id ON public.spots (user_id);
CREATE INDEX IF NOT EXISTS idx_spots_spot_type ON public.spots (spot_type);
CREATE INDEX IF NOT EXISTS idx_spots_rating ON public.spots (rating_avg DESC);

-- ============================================
-- REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  photos TEXT[] DEFAULT '{}',
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(spot_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_spot_id ON public.reviews (spot_id);

-- ============================================
-- FAVORITES
-- ============================================
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  spot_id UUID NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, spot_id)
);

-- ============================================
-- SPOT-TAGS Junction
-- ============================================
CREATE TABLE IF NOT EXISTS public.spot_tags (
  spot_id UUID NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (spot_id, tag_id)
);

-- ============================================
-- TRIGGER: Auto-update spot rating
-- ============================================
CREATE OR REPLACE FUNCTION update_spot_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.spots
  SET
    rating_avg = COALESCE((SELECT AVG(rating) FROM public.reviews WHERE spot_id = COALESCE(NEW.spot_id, OLD.spot_id)), 0),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE spot_id = COALESCE(NEW.spot_id, OLD.spot_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.spot_id, OLD.spot_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_review_change ON public.reviews;
CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_spot_rating();

-- ============================================
-- TRIGGER: Auto-update user stats
-- ============================================
CREATE OR REPLACE FUNCTION update_user_spot_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET spots_count = (SELECT COUNT(*) FROM public.spots WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)),
      updated_at = NOW()
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_spot_change ON public.spots;
CREATE TRIGGER on_spot_change
  AFTER INSERT OR DELETE ON public.spots
  FOR EACH ROW EXECUTE FUNCTION update_user_spot_count();

-- ============================================
-- FUNCTION: Find nearby spots (LBS)
-- ============================================
CREATE OR REPLACE FUNCTION nearby_spots(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters INT DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  spot_type TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  rating_avg DECIMAL,
  review_count INT,
  distance_meters DOUBLE PRECISION
) AS $$
  SELECT
    s.id, s.name, s.description, s.spot_type,
    s.lat, s.lng, s.rating_avg, s.review_count,
    ST_Distance(
      s.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS distance_meters
  FROM public.spots s
  WHERE ST_DWithin(
    s.location,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
    radius_meters
  )
  ORDER BY distance_meters;
$$ LANGUAGE sql;

-- ============================================
-- SEED: Fish Species Indonesia
-- ============================================
INSERT INTO public.fish_species (name, scientific_name, category) VALUES
('Kakap Putih', 'Lates calcarifer', 'laut'),
('Tongkol', 'Euthynnus affinis', 'laut'),
('Tuna', 'Thunnus albacares', 'laut'),
('Cakalang', 'Katsuwonus pelamis', 'laut'),
('Gurame', 'Osphronemus goramy', 'air_tawar'),
('Lele', 'Clarias batrachus', 'air_tawar'),
('Nila', 'Oreochromis niloticus', 'air_tawar'),
('Mas', 'Cyprinus carpio', 'air_tawar'),
('Patin', 'Pangasius pangasius', 'air_tawar'),
('Baung', 'Mystus nemurus', 'air_tawar'),
('Belut', 'Monopterus albus', 'air_tawar'),
('Toman', 'Channa micropeltes', 'air_tawar'),
('Haruan', 'Channa striata', 'air_tawar'),
('Bawal', 'Pampus argenteus', 'laut'),
('Kerapu', 'Epinephelus coioides', 'laut'),
('Baronang', 'Siganus canaliculatus', 'laut'),
('Senangin', 'Eleutheronema tetradactylum', 'laut'),
('Kuwe', 'Caranx sexfasciatus', 'laut')
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED: Tags
-- ============================================
INSERT INTO public.tags (name, icon) VALUES
('Spot Pemula', '🟢'),
('Spot Mahir', '🔴'),
('Pemancing Malam', '🌙'),
('Spot Keluarga', '👨‍👩‍👧‍👦'),
('Spot Romantis', '💑'),
('Pemandangan Indah', '🌅'),
('Akses Mudah', '🚗'),
('Butuh Perahu', '⛵'),
('Spot Sunrise', '🌄'),
('Spot Sunset', '🌇')
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED: Demo User
-- ============================================
INSERT INTO public.profiles (id, email, username, password_hash, bio, specialization) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@spotfish.local', 'admin', '$2b$10$placeholder_hash', 'Admin SpotFish! - Pecinta mancing', 'all')
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED: Demo Spots (Indonesia)
-- ============================================
INSERT INTO public.spots (user_id, name, description, spot_type, lat, lng, best_times, facilities, accessibility) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pantai Anyer', 'Spot mancing laut populer di Banten. Ikan kakap dan tongkol sering ditangkap di sini.', 'laut', -6.0725, 105.8921, 'Pagi (05:00-09:00), Sore (15:00-18:00)', '["parkir", "warung", "toilet"]', 'mudah'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Waduk Jatiluhur', 'Waduk terbesar di Jawa Barat. Spot favorit mancing gurame dan nila.', 'waduk', -6.5167, 107.4333, 'Pagi (04:00-08:00)', '["parkir", "perahu_sewa", "warung"]', 'mudah'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sungai Citarum', 'Sungai terpanjang di Jawa Barat. Spot mancing lele dan baung.', 'sungai', -6.9175, 107.6191, 'Malam (18:00-23:00)', '["parkir"]', 'sedang'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Danau Saguling', 'Danau buatan di Bandung Barat. Cocok untuk mancing air tawar.', 'danau', -6.8500, 107.3500, 'Pagi (05:00-10:00)', '["parkir", "warung", "tempat_teduh"]', 'mudah'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pelabuhan Muara Angke', 'Pelabuhan ikan terbesar di Jakarta. Spot mancing laut dan belanja ikan.', 'dermaga', -6.1050, 106.7480, 'Malam (20:00-04:00)', '["parkir", "warung", "toilet"]', 'mudah'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kolam Pemancingan Masjid Agung', 'Kolam pemancingan harian di Bandung. Ikan nila dan mas.', 'kolam', -6.9175, 107.6100, 'Sehari-hari (07:00-17:00)', '["parkir", "toilet", "warung", "tempat_teduh"]', 'mudah')
ON CONFLICT DO NOTHING;
