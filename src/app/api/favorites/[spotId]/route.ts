// ============================================
// SpotFish! — Toggle Favorite API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/favorites/[spotId] — Toggle favorite (add/remove)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ spotId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { spotId } = await params;

    // Validate UUID
    if (!UUID_REGEX.test(spotId)) {
      return NextResponse.json({ error: 'Invalid spot ID' }, { status: 400 });
    }

    // Check spot exists
    const spot = await queryOne('SELECT id FROM spots WHERE id = $1', [spotId]);
    if (!spot) {
      return NextResponse.json({ error: 'Spot not found' }, { status: 404 });
    }

    // Check if already favorited
    const existing = await queryOne(
      'SELECT user_id FROM favorites WHERE user_id = $1 AND spot_id = $2',
      [user.id, spotId]
    );

    if (existing) {
      // Remove favorite
      await query(
        'DELETE FROM favorites WHERE user_id = $1 AND spot_id = $2',
        [user.id, spotId]
      );
    } else {
      // Add favorite
      await query(
        'INSERT INTO favorites (user_id, spot_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [user.id, spotId]
      );
    }

    // Atomic count update — always re-count from source of truth
    await query(
      `UPDATE spots SET favorites_count = (SELECT COUNT(*) FROM favorites WHERE spot_id = $1) WHERE id = $1`,
      [spotId]
    );

    return NextResponse.json({ favorited: !existing });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json({ error: 'Failed to toggle favorite' }, { status: 500 });
  }
}
