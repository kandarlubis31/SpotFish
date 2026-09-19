// ============================================
// SpotFish! — Reviews API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sanitizeInput } from '@/lib/utils';
import { applyRateLimit } from '@/lib/rateLimit';
import { createNotification } from '@/app/api/notifications/route';

// GET /api/reviews?spot_id=X
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const spotId = searchParams.get('spot_id');

    if (!spotId) {
      return NextResponse.json(
        { error: 'spot_id is required' },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT r.*, p.username, p.avatar_url
       FROM reviews r
       LEFT JOIN profiles p ON r.user_id = p.id
       WHERE r.spot_id = $1
       ORDER BY r.created_at DESC`,
      [spotId]
    );

    return NextResponse.json({ reviews: result.rows });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/reviews
export async function POST(request: NextRequest) {
  const rl = applyRateLimit(request, 'write', '/api/reviews');
  if (!rl.allowed) return rl.response!;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { spot_id, rating, comment, photos } = body;

    if (!spot_id || !rating) {
      return NextResponse.json(
        { error: 'spot_id and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating harus antara 1-5' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const safeComment = sanitizeInput(String(comment || ''), 1000);
    const numRating = Number(rating);

    if (numRating < 1 || numRating > 5 || !Number.isInteger(numRating)) {
      return NextResponse.json(
        { error: 'Rating harus bilangan bulat 1-5' },
        { status: 400 }
      );
    }

    // Validate spot_id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(spot_id)) {
      return NextResponse.json(
        { error: 'spot_id tidak valid' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO reviews (spot_id, user_id, rating, comment, photos)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (spot_id, user_id) DO UPDATE
       SET rating = $3, comment = $4, photos = $5, updated_at = NOW()
       RETURNING *`,
      [spot_id, user.id, numRating, safeComment || null, photos || []]
    );

    // Notify spot owner (skip self-review)
    const owner = await queryOne(
      'SELECT user_id, name FROM spots WHERE id = $1',
      [spot_id]
    );
    if (owner && owner.user_id !== user.id) {
      await createNotification(
        owner.user_id,
        'review',
        `${user.username} memberi ulasan ${numRating} bintang`,
        safeComment ? safeComment.substring(0, 120) : 'Spot Anda mendapat ulasan baru',
        `/spots/${spot_id}`
      );
    }

    return NextResponse.json({ review: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
