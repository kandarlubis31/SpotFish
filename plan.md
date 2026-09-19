# SpotFish! — Peta Komunitas Spot Mancing

## Project Overview
Interactive map-based fishing spot sharing platform for Indonesian anglers. Community-driven, mobile-first, with real-time GPS features, PWA support, and in-app notifications.

**Tech Stack:** Next.js 16.3.1 + React 19 + Tailwind CSS 4 + PostgreSQL (pg) + Leaflet/React-Leaflet + JWT auth + bcryptjs

**Deploy:** PM2 on production server (`pm2 start spotfish`, jangan lupa `pm2 save`). Build: `npm run build`. Dev: `npm run dev` on port 4000.

**Admin accounts:** DB-backed via tabel `admin_users` (seeded: `admin`, `admin2`). Cek via `isAdminUser(userId)` di `src/lib/auth.ts`.

---

## Pages (13)

| Route | Auth | Description |
|-------|------|-------------|
| `/` | No | Full-screen interactive map + desktop sidebar / **mobile bottom sheet** (drag 3 snap points) + first-visit onboarding tour |
| `/spots` | No | Browse all spots with search, type filter, tag filter, sort |
| `/spots/new` | Yes | Create new spot — map picker, form, fish species, tags, photos, draft autosave |
| `/spots/[id]` | No | Spot detail — map, photos, weather, catch log, reviews, tags, edit/delete (owner), verify (admin), legit check |
| `/spots/[id]/edit` | Yes | Edit spot form — pre-filled, tags included |
| `/users/[username]` | No | Public user profile — spots tab + reviews tab |
| `/community` | No | Stats dashboard, contributors, rating distribution, activity feed, legit checks |
| `/leaderboard` | No | Papan peringkat — top anglers (poin: spot 5 + ulasan 3 + tangkapan 2), top spots by rating |
| `/favorites` | Yes | Saved spots list |
| `/profile` | Yes | Edit profile (bio, specialization) + **ganti password** (section Keamanan) |
| `/login` | No | Login with redirect support |
| `/register` | No | Register with redirect support |
| `/offline` | No | Branded offline fallback (PWA service worker target) |

## API Routes (23)

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/auth/login` | POST | Login (rate-limited: 10/15min) |
| `/api/auth/register` | POST | Register (rate-limited: 10/15min) |
| `/api/auth/logout` | POST | Clear cookie |
| `/api/auth/me` | GET | Current user + isAdmin flag (await DB check) |
| `/api/auth/password` | POST | Ganti password (verifikasi password lama, rate-limited: auth tier) |
| `/api/spots` | GET, POST | List (search, filter, sort, tag filter) + Create (rate-limited: 30/min) |
| `/api/spots/[id]` | GET, PATCH, DELETE | Detail (tags + reviews) + Update (tags included) + Delete (cleans spot_tags) |
| `/api/reviews` | GET, POST | List by spot + Create (notif ke owner spot, skip self-review) |
| `/api/catches` | GET, POST | List by spot/user + Create |
| `/api/favorites` | GET | List user favorites with spot data |
| `/api/favorites/[spotId]` | POST | Toggle favorite |
| `/api/fish` | GET | All fish species |
| `/api/tags` | GET, POST | All tags + Link tags to spot |
| `/api/upload` | POST, DELETE | File upload/delete (images, auto-mkdir) |
| `/api/weather` | GET | Open-Meteo weather (30-min cache, no API key) |
| `/api/activity` | GET | Recent activity feed (SQL UNION) |
| `/api/nearby` | GET | Nearby spots by coordinates |
| `/api/stats` | GET | Community statistics |
| `/api/profile` | GET, PUT | User profile |
| `/api/users/[username]` | GET | Public profile + spots + reviews |
| `/api/admin/verify` | POST, GET | Spot verification (admin only, DB-backed) |
| `/api/leaderboard` | GET | Top anglers (weighted points) + top spots (min 2 reviews) |
| `/api/notifications` | GET, POST | List + unread count; POST = mark read (all or by id) |

## Components (24)

### Layout
- `Navbar.tsx` — Responsive nav with SVG icons, auth dropdown, **NotificationBell**, mobile bottom nav (termasuk link Peringkat)
- `ErrorBoundary.tsx` — React error boundary with fallback UI

### Map
- `MapView.tsx` — Interactive Leaflet map, 3 layer modes, custom pin markers, popups (dengan photo preview), WaterLayer, GPSTracker, LingerDetector. **zoomControl={false}**
- `GPSTracker.tsx` — GPS tracking, route polyline, pause/resume/stop + **card "Session Selesai" dengan Ekspor GPX**
- `SpotBottomSheet.tsx` — **Mobile spot list sebagai draggable bottom sheet**: 3 snap points (peek 88px / half 45vh / full 90vh), touch + mouse drag, momentum snap, radius filter accessible di peek, `data-no-drag` isolation
- `LingerDetector.tsx` — Detects 15min stay in 50m radius, suggests adding new spot
- `WaterLayer.tsx` — OSM Overpass water body polygons, localStorage cache 24h

### Spots
- `SpotCard.tsx` — Card dengan **photo thumbnail preview** (+ badge jumlah foto), SpotTypeIcon, SVG star, distance, verified badge, legit badge
- `SpotPhotoManager.tsx` — Photo gallery + upload for spot owners
- `CatchLog.tsx` — Catch log form + list + stats + **Ekspor CSV** (UTF-8 BOM, Excel-friendly)
- `SpotInfoGrid.tsx` — Detail info spot (diekstrak dari page detail)
- `ReviewSection.tsx` — Review form + list (self-contained, diekstrak dari page detail)

### Reviews
- `StarRating.tsx` — 1-5 star rating (interactive or readonly)

### UI
- `ThemeToggle.tsx` — Dark/light toggle, animated SVG sun/moon, hydration-safe
- `SpotTypeIcon.tsx` — Colored circle per spot type
- `WeatherCard.tsx` — Current + 3-day forecast (SVG weather icons), fishing condition badge
- `ShareMenu.tsx` — WhatsApp/Telegram/copy link (SVG icons)
- `PhotoUpload.tsx` — Drag-drop upload with preview
- `PhotoGallery.tsx` — Gallery with lightbox
- `Skeleton.tsx` — Loading skeletons (+ `SpotCardSkeleton`)
- `NotificationBell.tsx` — Bell + badge unread, dropdown list, mark-all-read, poll 60s (render hanya jika login)
- `OnboardingTour.tsx` — **First-visit tour 3 langkah** (peta → daftar spot → bagikan spot), localStorage `spotfish-onboarding-v1`, mobile-aware positioning
- `ServiceWorkerRegistrar.tsx` — SW registration (production only)

## PWA
- `src/app/manifest.ts` — Web manifest (standalone, theme #2563eb, ikon favicon.svg)
- `public/sw.js` — Service worker: tile cache-first (max 200, trim), `/_next/static` SWR, halaman network-first → cache → `/offline`
- `/offline` — Halaman fallback branded
- SW hanya register di production (`ServiceWorkerRegistrar`)

## Database

### Tables
- `profiles` — id, username, email, password_hash, bio, avatar_url, specialization, created_at *(owner: postgres — jangan ALTER)*
- `spots`, `reviews`, `catches`, `fish_species`, `tags`, `spot_tags`, `favorites`, `fish_spots` *(owner: postgres)*
- `spot_confirmations`, `spot_confirmation_counts` *(migration 003)*
- `notifications` — id, user_id, type, title, body, link, is_read, created_at + index (user_id, is_read, created_at DESC) *(migration 004)*
- `admin_users` — user_id PK/FK→profiles, granted_at *(migration 004, replaces hardcoded admin)*

### Migrations (supabase/migrations/)
1. `001_initial_schema.sql` — profiles, fish_species, tags, spots, reviews, favorites, spot_tags
2. `002_catches.sql` — catches
3. `003_confirmations.sql` — legit check system
4. `004_notifications_admin.sql` — notifications + admin_users
5. `005_performance_indexes.sql` — idx created_at (spots, reviews), favorites(spot_id), partial unread index. **Status: file ada, belum ter-apply (owner tabel = postgres). Jalankan via Supabase SQL Editor saat data membesar — saat ini <100 rows, non-urgent.**

### Community Legit Check
- Dua arah: Legit (+1) / Belum Ketemu (−1); vote sama = retract
- 1 user 1 suara, wajib login, owner tidak bisa vote spot sendiri
- Badge "Legit ×N" jika net votes ≥ 3 (`CONFIRM_THRESHOLD` di SpotCard)
- API: `POST /api/spots/[id]/confirm`, stats.totalConfirmed

### Simplifikasi Form Spot (spots/new + edit)
- Blok "Wajib": peta picker + Nama + Jenis Spot
- Tombol "Pakai Lokasiku" (GPS autofill)
- Detail opsional dalam `<details>`; auto-open jika ada isi
- Draft autosave localStorage (`spotfish-spot-draft`)
- Submit bar sticky + validasi inline

### Spot Types
`laut`, `sungai`, `danau`, `kolam`, `waduk`, `dermaga`, `muara`, `rawa`, `irigasi`, `other`

### Accessibility Levels
`mudah`, `sedang`, `sulit`, `hanya_perahu`

## Design Conventions

### Icons
- **All SVG — zero emoji** (termasuk error alerts: ⚠️ sudah dihapus; ✕/✓ dipertahankan sebagai glyph tipografi)
- `SpotTypeIcon` — colored circles per type
- Map markers — colored pin SVG with letter

### Visual Tokens (hasil audit konsistensi)
| Elemen | Token |
|--------|-------|
| Card | `rounded-xl` |
| Button/input | `rounded-lg` |
| Chip/badge/avatar | `rounded-full` |
| CTA besar (page-level) | `px-6 py-3` |
| Submit form inline | `px-5 py-2.5` |
| Toolbar action | `px-4 py-2 text-sm` |
| Page header | `text-3xl font-bold` + container `py-8` |
| Container widths | `max-w-md` (auth), `max-w-2xl` (profile), `max-w-4xl` (form/detail), `max-w-7xl` (browse/community) |

### Empty States
Semua empty state wajib: icon SVG + judul kontekstual + penjelasan + CTA guiding (contoh: leaderboard → "Bagikan Spot Pertama"). Sudah diterapkan di: favorites, spots, leaderboard (2x), user profile (2 tab), community, bottom sheet.

### UX Patterns
- **Optimistic UI:** toggle favorite & verify langsung flip, rollback saat gagal/401
- **Mobile bottom sheet** menggantikan sidebar di peta (sidebar desktop-only `hidden md:block`)
- Loading skeletons di semua route segment (`loading.tsx` × 7)
- Custom 404 + halaman offline

### Dark Mode
- Toggle: animated sun/moon SVG
- `.dark` class + Tailwind dark: variants; Leaflet Dark Matter tiles

### Map Tiles
- Clean: CartoDB Positron / Dark Matter (dark)
- Satellite: Esri WorldImagery; Hybrid: + Esri Reference Labels
- Water overlay: OSM Overpass polygons

### Rate Limiting (src/lib/rateLimit.ts)
- `auth` 10/15min, `write` 30/min, `read` 100/min, `upload` 10/min
- In-memory + auto-cleanup; headers: Retry-After, X-RateLimit-*

### Auth
- JWT httpOnly cookies (7 hari), bcryptjs 10 rounds
- Admin: DB-backed `admin_users` (async `isAdminUser()`)
- Redirect flow: `/login?redirect=/path`

### Formatting
- `formatRating()` (handles DECIMAL strings), `haversineDistance()` shared util (single source — GPSTracker/LingerDetector import dari utils)
- Coordinates 6 desimal; `sanitizeInput()` XSS prevention

## Known Technical Debt (updated)
1. **Migration 005 belum ter-apply** — butuh Supabase SQL Editor (owner tabel legacy = postgres). Non-urgent (<100 rows)
2. **console.warn/error di production** — belum ada proper logging
3. **~30 `useEffect` fetch tanpa AbortController** di komponen minor (7 file utama sudah ber-AC)
4. **NotificationBell poll 60s** — idealnya SSE/WebSocket jika skala membesar
5. **Rate limiter in-memory** — reset saat restart; perlu Redis jika multi-instance
6. **Weather API emoji** di response data (tidak ditampilkan di UI)

## Roadmap / Future Plans
- Push notification (web-push + VAPID) — bell in-app sudah ada
- Tide/solunar calendar (butuh API eksternal akurat untuk Indonesia)
- Partnership toko pancing (B2B listing) — rencana jauh
- Quick-add modal langsung dari peta
- Eksport "data saya" (GDPR-style)

## Environment Variables (from .env.local)
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret
- `NEXT_PUBLIC_APP_URL` — Public app URL

## Git Notes
- `.gitignore`: `/backups` (SQL dump), `/public/uploads` (runtime), `.freebuff/`, `.env*` (kecuali `.env.example`)
- Migrations di-commit ke repo; jangan commit dump SQL berisi data user

## Brand
- **Name:** SpotFish! (with exclamation mark, like a map pin)
- **Tagline:** Peta Komunitas Spot Mancing
- **Language:** Bahasa Indonesia
