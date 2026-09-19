-- ============================================
-- SpotFish! — Catches Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.catches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  spot_id UUID NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  fish_species_id UUID REFERENCES public.fish_species(id),
  fish_name TEXT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  weight_kg DECIMAL(6,2),
  length_cm DECIMAL(6,1),
  bait_used TEXT,
  technique TEXT CHECK (technique IN ('pancing', 'jaring', 'tombak', 'pukat', 'trawal', 'lainnya')),
  caught_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catches_user_id ON public.catches (user_id);
CREATE INDEX IF NOT EXISTS idx_catches_spot_id ON public.catches (spot_id);
CREATE INDEX IF NOT EXISTS idx_catches_fish_species ON public.catches (fish_species_id);
CREATE INDEX IF NOT EXISTS idx_catches_caught_at ON public.catches (caught_at DESC);

-- TRIGGER: Auto-update spot catch_count (new column)
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS catch_count INT DEFAULT 0;

CREATE OR REPLACE FUNCTION update_spot_catch_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.spots
  SET catch_count = (SELECT COUNT(*) FROM public.catches WHERE spot_id = COALESCE(NEW.spot_id, OLD.spot_id))
  WHERE id = COALESCE(NEW.spot_id, OLD.spot_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_catch_change ON public.catches;
CREATE TRIGGER on_catch_change
  AFTER INSERT OR DELETE ON public.catches
  FOR EACH ROW EXECUTE FUNCTION update_spot_catch_count();
