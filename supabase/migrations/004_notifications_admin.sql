-- ============================================
-- SpotFish! Migration 004
-- Notifications + DB-backed admin
-- ============================================

-- In-app notifications (triggered by reviews on your spots)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON public.notifications(user_id, is_read, created_at DESC);

-- DB-backed admin roles (replaces hardcoded ADMIN_USERNAMES)
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed existing admins
INSERT INTO public.admin_users (user_id)
SELECT id FROM public.profiles WHERE username IN ('admin', 'admin2')
ON CONFLICT DO NOTHING;
