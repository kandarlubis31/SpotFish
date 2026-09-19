// ============================================
// SpotFish! — Nearby Spots API (LBS)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/nearby?lat=X&lng=Y&r=5000
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseInt(searchParams.get('r') || '5000'); // default 5km

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'lat and lng parameters are required' },
        { status: 400 }
      );
    }

    // Use PostGIS spatial query
    const result = await query(
      `SELECT
        s.id, s.name, s.description, s.spot_type,
        s.lat, s.lng, s.rating_avg, s.review_count,
        s.photos, s.best_times, s.facilities, s.accessibility,
        p.username, p.avatar_url,
        ST_Distance(
          s.location,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        ) AS distance_meters
      FROM spots s
      LEFT JOIN profiles p ON s.user_id = p.id
      WHERE ST_DWithin(
        s.location,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        $3
      )
      ORDER BY distance_meters
      LIMIT 50`,
      [lat, lng, radius]
    );

    return NextResponse.json({
      spots: result.rows,
      total: result.rowCount,
      center: { lat, lng },
      radius,
    });
  } catch (error) {
    console.error('Error finding nearby spots:', error);
    return NextResponse.json(
      { error: 'Failed to find nearby spots' },
      { status: 500 }
    );
  }
}
