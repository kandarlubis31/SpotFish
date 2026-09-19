// ============================================
// SpotFish! — Leaderboard API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { applyRateLimit } from '@/lib/rateLimit';

// GET /api/leaderboard — Top anglers by contribution
export async function GET(request: NextRequest) {
  const rl = applyRateLimit(request, 'read', '/api/leaderboard');
  if (!rl.allowed) return rl.response!;

  try {
    // Top anglers: ranked by spots + reviews + catches weighted
    const anglers = await query(
      `SELECT p.id, p.username, p.avatar_url, p.specialization,
              (SELECT COUNT(*) FROM spots s WHERE s.user_id = p.id) AS spots_count,
              (SELECT COUNT(*) FROM reviews r WHERE r.user_id = p.id) AS reviews_count,
              (SELECT COUNT(*) FROM catches c WHERE c.user_id = p.id) AS catches_count,
              (SELECT COALESCE(SUM(c.quantity), 0) FROM catches c WHERE c.user_id = p.id) AS total_fish,
              (
                (SELECT COUNT(*) FROM spots s WHERE s.user_id = p.id) * 5 +
                (SELECT COUNT(*) FROM reviews r WHERE r.user_id = p.id) * 3 +
                (SELECT COUNT(*) FROM catches c WHERE c.user_id = p.id) * 2
              ) AS points
       FROM profiles p
       WHERE (
         (SELECT COUNT(*) FROM spots s WHERE s.user_id = p.id) +
         (SELECT COUNT(*) FROM reviews r WHERE r.user_id = p.id) +
         (SELECT COUNT(*) FROM catches c WHERE c.user_id = p.id)
       ) > 0
       ORDER BY points DESC
       LIMIT 50`
    );

    // Top spots by rating (min 2 reviews)
    const topSpots = await query(
      `SELECT s.id, s.name, s.spot_type, s.rating_avg, s.review_count, s.photos,
              p.username
       FROM spots s
       LEFT JOIN profiles p ON s.user_id = p.id
       WHERE s.review_count >= 2
       ORDER BY s.rating_avg DESC, s.review_count DESC
       LIMIT 10`
    );

    return NextResponse.json({
      anglers: anglers.rows,
      topSpots: topSpots.rows,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
