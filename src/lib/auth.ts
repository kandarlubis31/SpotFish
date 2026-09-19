// ============================================
// SpotFish! — Auth Helpers
// ============================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { queryOne } from './db';
import { Profile } from './types';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: string = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Compare password
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify JWT token
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Get current user from cookie
export async function getCurrentUser(): Promise<Profile | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    const user = await queryOne<Profile>(
      'SELECT * FROM profiles WHERE id = $1',
      [payload.userId]
    );
    return user;
  } catch {
    return null;
  }
}

// Set auth cookie
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// Clear auth cookie
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
}

// Check if user is admin (DB-backed via admin_users table)
export async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const row = await queryOne(
      'SELECT 1 FROM admin_users WHERE user_id = $1',
      [userId]
    );
    return !!row;
  } catch {
    return false;
  }
}

// Sync helper: check admin from a loaded Profile object
export async function isAdmin(user: Profile | null): Promise<boolean> {
  if (!user) return false;
  return isAdminUser(user.id);
}
