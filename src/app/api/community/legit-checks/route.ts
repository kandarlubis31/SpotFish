// ============================================
// SpotFish! — Community Legit Check listing
// GET /api/community/legit-checks
//
// Returns spots grouped by confirmation progress:
//  - confirmed : net votes >= 3 (badge earned)
//  - pending   : has votes, badge not yet reached
//                (sorted by closest to threshold)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const CONFIRM_THRESHOLD = 3;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const result = await query(
      `SELECT s.id, s.name, s.spot_type, s.lat, s.lng,
              s.is_verified, s.rating_avg, s.review_count, s.created_at,
              COALESCE(cc.legit_count, 0) AS legit_count,
              COALESCE(cc.reject_count, 0) AS reject_count,
              p.username
       FROM spots s
       LEFT JOIN spot_confirmation_counts cc ON cc.spot_id = s.id
       LEFT JOIN profiles p ON s.user_id = p.id
       WHERE COALESCE(cc.legit_count, 0) + COALESCE(cc.reject_count, 0) > 0
       ORDER BY (COALESCE(cc.legit_count, 0) - COALESCE(cc.reject_count, 0)) DESC,
                s.created_at DESC
       LIMIT $1`,
      [limit]
    );

    const spots = result.rows.map((row: Record<string, unknown>) => {
      const legit = Number(row.legit_count);
      const reject = Number(row.reject_count);
      return {
        ...row,
        legit_count: legit,
        reject_count: reject,
        net_votes: legit - reject,
        confirmed: legit - reject >= CONFIRM_THRESHOLD,
      };
    });

    return NextResponse.json({
      threshold: CONFIRM_THRESHOLD,
      confirmed: spots.filter((s) => s.confirmed),
      pending: spots.filter((s) => !s.confirmed),
    });
  } catch (error) {
    console.error('Error fetching legit checks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch legit checks' },
      { status: 500 }
    );
  }
}
