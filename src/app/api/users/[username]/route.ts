// ============================================
// SpotFish! — Public User Profile API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/users/[username] — Public profile + spots + reviews
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    // Get profile (no password_hash)
    const profileResult = await query(
      `SELECT id, username, avatar_url, bio, specialization,
              spots_count, reviews_count, created_at
       FROM profiles
       WHERE username = $1`,
      [username]
    );

    if (profileResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = profileResult.rows[0];

    // Get user's spots + reviews in parallel
    const [spotsResult, reviewsResult] = await Promise.all([
      query(
        `SELECT id, name, description, spot_type, lat, lng,
                rating_avg, review_count, photos, facilities,
                accessibility, created_at
         FROM spots
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [profile.id]
      ),
      query(
        `SELECT r.id, r.rating, r.comment, r.created_at,
                s.id as spot_id, s.name as spot_name, s.spot_type
         FROM reviews r
         LEFT JOIN spots s ON r.spot_id = s.id
         WHERE r.user_id = $1
         ORDER BY r.created_at DESC
         LIMIT 50`,
        [profile.id]
      ),
    ]);

    return NextResponse.json({
      profile,
      spots: spotsResult.rows,
      reviews: reviewsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}
