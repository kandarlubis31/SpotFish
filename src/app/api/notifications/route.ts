// ============================================
// SpotFish! — Notifications API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { applyRateLimit } from '@/lib/rateLimit';

// Helper: create a notification (used by other routes)
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body?: string,
  link?: string
) {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, body || null, link || null]
    );
  } catch (error) {
    console.warn('Failed to create notification:', error);
  }
}

// GET /api/notifications — list current user's notifications
export async function GET(request: NextRequest) {
  const rl = applyRateLimit(request, 'read', '/api/notifications');
  if (!rl.allowed) return rl.response!;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ notifications: [], unread: 0 });
    }

    const result = await query(
      `SELECT id, type, title, body, link, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [user.id]
    );

    const unreadRow = await queryOne(
      `SELECT COUNT(*)::int AS unread FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [user.id]
    );

    return NextResponse.json({
      notifications: result.rows,
      unread: unreadRow?.unread || 0,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST /api/notifications — mark all as read (or specific id)
export async function POST(request: NextRequest) {
  const rl = applyRateLimit(request, 'write', '/api/notifications');
  if (!rl.allowed) return rl.response!;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id } = body;

    if (id) {
      await query(
        `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
        [id, user.id]
      );
    } else {
      await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, [user.id]);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error marking notifications read:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
