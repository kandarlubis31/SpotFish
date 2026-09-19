// ============================================
// SpotFish! — Activity Feed API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/activity — Recent activity (spots + reviews via UNION)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const result = await query(
      `(
        SELECT
          'spot' as type,
          s.id,
          p.username,
          p.avatar_url,
          s.name as spot_name,
          s.spot_type,
          s.id as spot_id,
          s.rating_avg,
          s.review_count,
          NULL::int as rating,
          NULL::text as comment,
          s.created_at
        FROM spots s
        LEFT JOIN profiles p ON s.user_id = p.id
        ORDER BY s.created_at DESC
        LIMIT $1
      )
      UNION ALL
      (
        SELECT
          'review' as type,
          r.id,
          p.username,
          p.avatar_url,
          sp.name as spot_name,
          sp.spot_type,
          r.spot_id,
          NULL::numeric as rating_avg,
          NULL::int as review_count,
          r.rating,
          r.comment,
          r.created_at
        FROM reviews r
        LEFT JOIN spots sp ON r.spot_id = sp.id
        LEFT JOIN profiles p ON r.user_id = p.id
        ORDER BY r.created_at DESC
        LIMIT $1
      )
      ORDER BY created_at DESC
      LIMIT $1`,
      [limit]
    );

    return NextResponse.json({ activities: result.rows });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
