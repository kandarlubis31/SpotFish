// ============================================
// SpotFish! — Profile Update API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PATCH /api/profile — Update own profile
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { bio, specialization } = body;

    const updated = await queryOne(
      `UPDATE profiles 
       SET bio = COALESCE($1, bio),
           specialization = COALESCE($2, specialization),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, username, avatar_url, bio, specialization, spots_count, reviews_count, created_at, updated_at`,
      [bio ?? null, specialization ?? null, user.id]
    );

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

// GET /api/profile — Get own profile
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { password_hash, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('Error getting profile:', error);
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 });
  }
}
