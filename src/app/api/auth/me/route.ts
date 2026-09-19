// ============================================
// SpotFish! — Current User API
// ============================================

import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      // Return 200 with null user — avoids noisy 401 in console
      return NextResponse.json({ user: null });
    }

    // Don't return password_hash
    const { password_hash, ...safeUser } = user;
    return NextResponse.json({ user: safeUser, isAdmin: await isAdmin(user) });
  } catch (error) {
    console.error('Error getting current user:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
