-- ============================================
-- SpotFish! — 003: Community Legit Check
-- Two-way spot confirmations (legit / not found)
-- Badge threshold: net votes (legit - reject) >= 3
--
-- NOTE: aggregate counters live in a dedicated table
-- (not columns on spots) because the application DB
-- role does not own the legacy tables created by
-- 'postgres' and cannot ALTER them.
-- ============================================

CREATE TABLE IF NOT EXISTS public.spot_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(spot_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_spot_confirmations_spot_id ON public.spot_confirmations (spot_id);
CREATE INDEX IF NOT EXISTS idx_spot_confirmations_user_id ON public.spot_confirmations (user_id);

CREATE TABLE IF NOT EXISTS public.spot_confirmation_counts (
  spot_id UUID PRIMARY KEY REFERENCES public.spots(id) ON DELETE CASCADE,
  legit_count INT NOT NULL DEFAULT 0,
  reject_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_spot_confirmation_counts()
RETURNS TRIGGER AS $$
DECLARE
  sid UUID := COALESCE(NEW.spot_id, OLD.spot_id);
BEGIN
  -- If the last confirmation was removed, drop the counters row entirely
  IF NOT EXISTS (SELECT 1 FROM public.spot_confirmations WHERE spot_id = sid) THEN
    DELETE FROM public.spot_confirmation_counts WHERE spot_id = sid;
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.spot_confirmation_counts AS scc (spot_id, legit_count, reject_count)
  SELECT sid,
         COUNT(*) FILTER (WHERE value = 1),
         COUNT(*) FILTER (WHERE value = -1)
  FROM public.spot_confirmations
  WHERE spot_id = sid
  GROUP BY spot_id
  ON CONFLICT (spot_id) DO UPDATE
    SET legit_count = EXCLUDED.legit_count,
        reject_count = EXCLUDED.reject_count,
        updated_at = NOW();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_confirmation_change ON public.spot_confirmations;
CREATE TRIGGER on_confirmation_change
  AFTER INSERT OR UPDATE OR DELETE ON public.spot_confirmations
  FOR EACH ROW EXECUTE FUNCTION update_spot_confirmation_counts();

-- Backfill for any pre-existing rows (idempotent re-run safety)
INSERT INTO public.spot_confirmation_counts (spot_id, legit_count, reject_count)
SELECT
  spot_id,
  COUNT(*) FILTER (WHERE value = 1),
  COUNT(*) FILTER (WHERE value = -1)
FROM public.spot_confirmations
GROUP BY spot_id
ON CONFLICT (spot_id) DO UPDATE
  SET legit_count = EXCLUDED.legit_count,
      reject_count = EXCLUDED.reject_count,
      updated_at = NOW();
