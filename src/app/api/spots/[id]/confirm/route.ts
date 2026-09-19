// ============================================
// SpotFish! — Community Legit Check API
// POST /api/spots/[id]/confirm
// Body: { value: 1 | -1 } — sending the same value
// again retracts the vote.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { applyRateLimit } from '@/lib/rateLimit';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = applyRateLimit(request, 'write', '/api/spots/confirm');
  if (!rl.allowed) return rl.response!;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: spotId } = await params;
    if (!UUID_REGEX.test(spotId)) {
      return NextResponse.json({ error: 'Invalid spot ID' }, { status: 400 });
    }

    const body = await request.json();
    const value = Number(body?.value);
    if (value !== 1 && value !== -1) {
      return NextResponse.json(
        { error: 'value must be 1 (legit) or -1 (not found)' },
        { status: 400 }
      );
    }

    const spot = await queryOne<{ id: string; user_id: string }>(
      'SELECT id, user_id FROM spots WHERE id = $1',
      [spotId]
    );
    if (!spot) {
      return NextResponse.json({ error: 'Spot not found' }, { status: 404 });
    }

    // Owner cannot confirm their own spot
    if (spot.user_id === user.id) {
      return NextResponse.json(
        { error: 'Tidak bisa mengonfirmasi spot sendiri' },
        { status: 403 }
      );
    }

    // Upsert or retract (same value sent again = retract)
    const existing = await queryOne<{ id: string; value: number }>(
      'SELECT id, value FROM spot_confirmations WHERE spot_id = $1 AND user_id = $2',
      [spotId, user.id]
    );

    let myVote: -1 | 0 | 1 = value as -1 | 1;
    if (existing && existing.value === value) {
      await queryOne('DELETE FROM spot_confirmations WHERE id = $1', [existing.id]);
      myVote = 0;
    } else if (existing) {
      await queryOne(
        'UPDATE spot_confirmations SET value = $1, updated_at = NOW() WHERE id = $2',
        [value, existing.id]
      );
    } else {
      await queryOne(
        'INSERT INTO spot_confirmations (spot_id, user_id, value) VALUES ($1, $2, $3)',
        [spotId, user.id, value]
      );
    }

    // Trigger keeps counts in sync; read them back
    const counts = await queryOne<{
      legit_count: number;
      reject_count: number;
    }>(
      'SELECT legit_count, reject_count FROM spot_confirmation_counts WHERE spot_id = $1',
      [spotId]
    );

    return NextResponse.json({
      my_vote: myVote,
      legit_count: counts?.legit_count ?? 0,
      reject_count: counts?.reject_count ?? 0,
      community_confirmed: (counts?.legit_count ?? 0) - (counts?.reject_count ?? 0) >= 3,
    });
  } catch (error) {
    console.error('Error confirming spot:', error);
    return NextResponse.json(
      { error: 'Failed to confirm spot' },
      { status: 500 }
    );
  }
}
