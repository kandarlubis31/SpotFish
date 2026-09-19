// ============================================
// SpotFish! — Admin Spot Verification API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';

// POST /api/admin/verify — Verify or unverify a spot
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await isAdmin(user))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { spot_id, verified } = body;

    if (!spot_id) {
      return NextResponse.json({ error: 'spot_id is required' }, { status: 400 });
    }

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(spot_id)) {
      return NextResponse.json({ error: 'Invalid spot ID' }, { status: 400 });
    }

    const spot = await queryOne('SELECT id, is_verified FROM spots WHERE id = $1', [spot_id]);
    if (!spot) {
      return NextResponse.json({ error: 'Spot not found' }, { status: 404 });
    }

    const newStatus = verified !== undefined ? Boolean(verified) : !spot.is_verified;

    const updated = await queryOne(
      'UPDATE spots SET is_verified = $1, updated_at = NOW() WHERE id = $2 RETURNING id, is_verified',
      [newStatus, spot_id]
    );

    return NextResponse.json({
      spot_id: updated?.id,
      is_verified: updated?.is_verified,
    });
  } catch (error) {
    console.error('Error verifying spot:', error);
    return NextResponse.json({ error: 'Failed to verify spot' }, { status: 500 });
  }
}

// GET /api/admin/verify — List unverified spots (admin only)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !(await isAdmin(user))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { query } = await import('@/lib/db');
    const result = await query(
      `SELECT s.id, s.name, s.spot_type, s.lat, s.lng, s.is_verified, s.created_at,
              p.username
       FROM spots s
       LEFT JOIN profiles p ON s.user_id = p.id
       ORDER BY s.is_verified ASC, s.created_at DESC
       LIMIT 100`
    );

    return NextResponse.json({ spots: result.rows });
  } catch (error) {
    console.error('Error listing spots:', error);
    return NextResponse.json({ error: 'Failed to list spots' }, { status: 500 });
  }
}
