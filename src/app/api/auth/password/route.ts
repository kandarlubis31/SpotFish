// ============================================
// SpotFish! — Change Password API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import {
  getCurrentUser,
  comparePassword,
  hashPassword,
} from '@/lib/auth';
import { applyRateLimit } from '@/lib/rateLimit';

// POST /api/auth/password — change current user's password
export async function POST(request: NextRequest) {
  const rl = applyRateLimit(request, 'auth', '/api/auth/password');
  if (!rl.allowed) return rl.response!;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { current_password, new_password } = body;

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: 'Password lama dan baru wajib diisi' },
        { status: 400 }
      );
    }

    if (typeof new_password !== 'string' || new_password.length < 6) {
      return NextResponse.json(
        { error: 'Password baru minimal 6 karakter' },
        { status: 400 }
      );
    }

    // Verify current password
    const valid = await comparePassword(current_password, user.password_hash || '');
    if (!valid) {
      return NextResponse.json({ error: 'Password lama salah' }, { status: 401 });
    }

    // Update
    const newHash = await hashPassword(new_password);
    await queryOne(
      `UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [newHash, user.id]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
