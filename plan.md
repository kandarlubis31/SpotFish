# SpotFish! — Peta Komunitas Spot Mancing

## Project Overview
Interactive map-based fishing spot sharing platform for Indonesian anglers. Community-driven, mobile-first, with real-time GPS features.

**Tech Stack:** Next.js 16.3.1 + React 19 + Tailwind CSS 4 + PostgreSQL (pg) + Leaflet/React-Leaflet + JWT auth + bcryptjs

**Deploy:** PM2 on production server. Build: `npm run build`. Dev: `npm run dev` on port 4000.

**Admin accounts:** `admin`, `admin2` (hardcoded in `src/lib/auth.ts` ADMIN_USERNAMES set)

---

## Pages (11)

| Route | Auth | Description |
|-------|------|-------------|
| `/` | No | Full-screen interactive map + sidebar with spot list (sorted by distance) |
| `/spots` | No | Browse all spots with search, type filter, tag filter, sort |
| `/spots/new` | Yes | Create new spot — map picker, form, fish species, tags, photos |
| `/spots/[id]` | No | Spot detail — map, photos, weather, catch log, reviews, tags, edit/delete (owner), verify (admin) |
| `/spots/[id]/edit` | Yes | Edit spot form — pre-filled from existing data |
| `/users/[username]` | No | Public user profile — spots tab + reviews tab |
| `/community` | No | Stats dashboard — total spots/reviews/catches, contributors, rating distribution, activity feed |
| `/favorites` | Yes | Saved spots list |
| `/profile` | Yes | Edit profile — username, bio, specialization |
| `/login` | No | Login with redirect support |
| `/register` | No | Register with redirect support |

## API Routes (20)

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/auth/login` | POST | Login (rate-limited: 10/15min) |
| `/api/auth/register` | POST | Register (rate-limited: 10/15min) |
| `/api/auth/logout` | POST | Clear cookie |
| `/api/auth/me` | GET | Current user + isAdmin flag |
| `/api/spots` | GET, POST | List (search, filter, sort, tag filter) + Create (rate-limited: 30/min) |
| `/api/spots/[id]` | GET, PATCH, DELETE | Detail (with tags + reviews) + Update + Delete |
| `/api/reviews` | GET, POST | List by spot + Create (rate-limited: 30/min) |
| `/api/catches` | GET, POST | List by spot/user + Create (rate-limited: 30/min) |
| `/api/favorites` | GET | List user favorites with spot data |
| `/api/favorites/[spotId]` | POST | Toggle favorite |
| `/api/fish` | GET | All fish species |
| `/api/tags` | GET, POST | All tags + Link tags to spot |
| `/api/upload` | POST, DELETE | File upload/delete (images) |
| `/api/weather` | GET | Open-Meteo weather (30-min cache, no API key) |
| `/api/activity` | GET | Recent activity feed (SQL UNION) |
| `/api/nearby` | GET | Nearby spots by coordinates |
| `/api/stats` | GET | Community statistics |
| `/api/profile` | GET, PUT | User profile |
| `/api/users/[username]` | GET | Public profile + spots + reviews |
| `/api/admin/verify` | POST, GET | Spot verification (admin only) |

## Components (17)

### Layout
- `Navbar.tsx` — Responsive nav with SVG icons, auth dropdown, mobile sidebar
- `ErrorBoundary.tsx` — React error boundary with fallback UI

### Map
- `MapView.tsx` (405 lines) — Interactive Leaflet map, 3 layer modes (Clean/Satellite/Hybrid), custom pin markers (colored letter), popups, GPS location, WaterLayer, GPSTracker, LingerDetector. **zoomControl={false}** (scroll/pinch zoom only)
- `GPSTracker.tsx` — GPS tracking with route polyline, distance calc (haversine), pause/resume/stop
- `LingerDetector.tsx` — Detects 15min stay in 50m radius, suggests adding new spot with pre-filled coords
- `WaterLayer.tsx` — OSM Overpass water body polygons (blue overlay), localStorage cache 24h, fallback for Java-Sumatra-Bali

### Spots
- `SpotCard.tsx` — Spot card with SpotTypeIcon, SVG star rating, distance, facilities, verified badge, author link
- `SpotPhotoManager.tsx` — Photo gallery + upload for spot owners
- `CatchLog.tsx` — Catch log form + list + stats (fish species, quantity, weight, bait, technique)

### Reviews
- `StarRating.tsx` — 1-5 star rating (interactive or readonly)

### UI
- `ThemeToggle.tsx` — Dark/light mode toggle with animated SVG sun/moon + hydration-safe mounting
- `SpotTypeIcon.tsx` — Colored circle with first letter per spot type
- `WeatherCard.tsx` — Current weather + 3-day forecast (SVG weather icons), fishing condition badge
- `ShareMenu.tsx` — WhatsApp/Telegram/copy link (SVG icons)
- `PhotoUpload.tsx` — Drag-drop image upload with preview
- `PhotoGallery.tsx` — Image gallery with lightbox
- `Skeleton.tsx` — Loading skeletons for map, cards

## Database

### Tables
- `profiles` — id, username, email, password_hash, bio, avatar_url, specialization, created_at
- `spots` — id, user_id, name, description, spot_type, lat, lng, fish_species (uuid[]), conditions (jsonb), best_times, facilities (text[]), accessibility, is_verified, rating_avg, review_count, favorites_count, photos (text[]), created_at, updated_at
- `reviews` — id, spot_id, user_id, rating, comment, photos, helpful_count, created_at, updated_at
- `catches` — id, user_id, spot_id, fish_species_id, fish_name, quantity, weight_kg, length_cm, bait_used, technique, caught_at, notes, photo_url, created_at
- `fish_species` — id, name, category, description
- `tags` — id, name, icon, description
- `spot_tags` — spot_id, tag_id (junction table)
- `favorites` — user_id, spot_id, created_at
- `fish_spots` — fish_id, spot_id (junction table)
- `spot_confirmations` — id, spot_id, user_id, value (SMALLINT: 1=legit, -1=belum ketemu), UNIQUE(spot_id, user_id) *(migration 003)*
- `spot_confirmation_counts` — spot_id (PK, FK→spots CASCADE), legit_count, reject_count *(migration 003; tabel agregat terpisah karena role aplikasi bukan owner tabel legacy milik `postgres` — tidak bisa ALTER spots)*

### Community Legit Check
- Dua arah: ✅ Legit (+1) / ❌ Belum Ketemu (-1); kirim vote sama = retract
- 1 user 1 suara per spot, wajib login, owner tidak bisa vote spot sendiri
- Trigger `on_confirmation_change` menjaga `spot_confirmation_counts` sinkron (baris dihapus otomatis saat semua vote diretrak)
- Badge 👍 "Dikonfirmasi Komunitas" / "Legit ×N": net votes ≥ **3** (`CONFIRM_THRESHOLD`)
- Warning amber di detail spot jika mayoritas reject (≥2 total vote & net < 0)
- API: `POST /api/spots/[id]/confirm`, `GET /api/community/legit-checks`, `/api/stats.totalConfirmed`
- UI: tombol konfirmasi + badge di detail spot, badge mini di SpotCard, section "Cek Legit" + kartu stat di halaman Komunitas

### Simplifikasi Form Spot (spots/new + edit)
- Blok "Wajib": peta picker + Nama + Jenis Spot → cukup untuk submit
- Tombol "📍 Pakai Lokasiku" (GPS autofill) di halaman new
- Detail opsional dalam `<details>` collapsed; auto-open jika ada isi (draft/data existing)
- Draft autosave localStorage (`spotfish-spot-draft`) di halaman new, clear saat submit sukses
- Submit bar sticky di mobile dengan hint validasi inline

### Spot Types
`laut`, `sungai`, `danau`, `kolam`, `waduk`, `dermaga`, `muara`, `rawa`, `irigasi`, `other`

### Accessibility Levels
`mudah`, `sedang`, `sulit`, `hanya_perahu`

## Design Conventions

### Icons
- **All SVG** — zero emoji in UI (dark mode toggle, nav, weather, stars, share, map markers, favorites, accessibility)
- `SpotTypeIcon` — colored circles (laut=#0ea5e9, sungai=#06b6d4, danau=#8b5cf6, kolam=#22c55e, waduk=#3b82f6, dermaga=#f59e0b, muara=#6366f1, rawa=#84cc16, irigasi=#14b8a6, other=#6b7280)
- Map markers — colored pin SVG with first letter of spot type label

### Dark Mode
- Toggle: animated sun/moon SVG with rotation transition
- CSS: `.dark` class on html, Tailwind dark: variants
- Leaflet: Dark Matter tiles in dark mode (Clean mode)

### Map Tiles
- **Clean (Light):** CartoDB Positron
- **Clean (Dark):** CartoDB Dark Matter
- **Satellite:** Esri WorldImagery
- **Hybrid:** Esri Satellite + Esri Reference Labels
- **Water overlay:** Semi-transparent blue polygons from OSM Overpass API

### Rate Limiting
- Auth endpoints: 10 requests / 15 min per IP
- Write endpoints: 30 requests / min per IP
- In-memory store with auto-cleanup (src/lib/rateLimit.ts)

### Auth
- JWT tokens in httpOnly cookies (7-day expiry)
- bcryptjs password hashing (10 rounds)
- Admin check: hardcoded usernames in ADMIN_USERNAMES Set
- Redirect flow: `/login?redirect=/path` → after login, redirect back

### Formatting
- Ratings: `formatRating()` from utils (handles PostgreSQL DECIMAL strings)
- Distances: `haversineDistance()` for client-side, PostGIS `ST_Distance` preferred
- Coordinates: 6 decimal places display
- Input sanitization: `sanitizeInput()` XSS prevention

## Known Technical Debt
1. **568-line spot detail page** — god component, should be split
2. **No AbortController** on fetch calls — memory leak on unmount
3. **`console.warn/error`** in production code — should use proper logging
4. **ADMIN_USERNAMES hardcoded** — should be DB-backed
5. **No PWA** — can't install on phone
6. **Weather API emoji** in response data (not displayed in UI)
7. **DB role `spotmancing` bukan owner tabel legacy** (owner: `postgres`) — ALTER TABLE tidak bisa; perubahan schema baru dibuat sebagai tabel baru (pola: tabel agregat terpisah). Migrasi dijalankan via node script pg dengan DATABASE_URL dari .env.local

## Roadmap / Future Plans
- **Partnership toko pancing terdekat** — kerja sama B2B (listing/promosi toko di sekitar spot). Masih rencana jauh, belum didesain.
- Quick-add modal langsung dari peta utama (input minimal tanpa pindah halaman)

## Environment Variables (from .env.local)
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret
- `NEXT_PUBLIC_APP_URL` — Public app URL

## Brand
- **Name:** SpotFish! (with exclamation mark, like a map pin)
- **Tagline:** Peta Komunitas Spot Mancing
- **Language:** Bahasa Indonesia
