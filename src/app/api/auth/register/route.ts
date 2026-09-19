// ============================================
// SpotFish! — Register API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth';
import { applyRateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  // Rate limit: 5 registrations per 15 min per IP
  const rl = applyRateLimit(request, 'auth', '/api/auth/register');
  if (!rl.allowed) return rl.response!;

  try {
    const body = await request.json();
    const { email, username, password } = body;

    // Validate
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if email or username already exists
    const existingEmail = await queryOne(
      'SELECT id FROM profiles WHERE email = $1',
      [email]
    );
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    const existingUsername = await queryOne(
      'SELECT id FROM profiles WHERE username = $1',
      [username]
    );
    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);

    const user = await queryOne(
      `INSERT INTO profiles (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, created_at`,
      [email, username, passwordHash]
    );

    // Generate token and set cookie
    const token = generateToken({
      userId: user!.id,
      email: user!.email,
      username: user!.username,
    });
    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user!.id,
        email: user!.email,
        username: user!.username,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error registering:', error);
    return NextResponse.json(
      { error: 'Failed to register' },
      { status: 500 }
    );
  }
}
