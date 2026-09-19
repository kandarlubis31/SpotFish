// ============================================
// SpotFish! — Favorites API (list + check)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/favorites — Get user's favorites (optionally with spot details)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ favorites: [], count: 0 });
    }

    const { searchParams } = new URL(request.url);
    const includeSpots = searchParams.get('include') === 'spots';

    if (includeSpots) {
      // Single query — join favorites + spots to avoid N+1
      const result = await query(
        `SELECT f.spot_id, f.created_at,
                s.name, s.description, s.spot_type, s.lat, s.lng,
                s.rating_avg, s.review_count, s.photos, s.facilities,
                s.accessibility, s.best_times, s.fish_species,
                p.username, p.avatar_url
         FROM favorites f
         INNER JOIN spots s ON f.spot_id = s.id
         LEFT JOIN profiles p ON s.user_id = p.id
         WHERE f.user_id = $1
         ORDER BY f.created_at DESC`,
        [user.id]
      );

      return NextResponse.json({
        favorites: result.rows,
        count: result.rowCount,
      });
    }

    // Just IDs
    const result = await query(
      `SELECT f.spot_id, f.created_at
       FROM favorites f
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [user.id]
    );

    return NextResponse.json({
      favorites: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}
