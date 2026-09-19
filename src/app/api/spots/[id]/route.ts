// ============================================
// SpotFish! — Spot Detail API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sanitizeInput, isValidCoordinate, isValidSpotName } from '@/lib/utils';

// GET /api/spots/[id] — Get spot detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await getCurrentUser();

    const spot = await queryOne(
      `SELECT s.*, p.username, p.avatar_url, p.bio as user_bio,
              COALESCE(cc.legit_count, 0) AS legit_count,
              COALESCE(cc.reject_count, 0) AS reject_count${
                user ? `,
              COALESCE((
                SELECT sc.value FROM spot_confirmations sc
                WHERE sc.spot_id = s.id AND sc.user_id = $2
              ), 0) AS my_vote` : ''}
       FROM spots s
       LEFT JOIN profiles p ON s.user_id = p.id
       LEFT JOIN spot_confirmation_counts cc ON cc.spot_id = s.id
       WHERE s.id = $1`,
      user ? [id, user.id] : [id]
    );

    if (!spot) {
      return NextResponse.json(
        { error: 'Spot not found' },
        { status: 404 }
      );
    }

    // Get reviews for this spot
    const reviews = await query(
      `SELECT r.*, p.username, p.avatar_url
       FROM reviews r
       LEFT JOIN profiles p ON r.user_id = p.id
       WHERE r.spot_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    // Get tags for this spot
    const tagsResult = await query(
      `SELECT t.id, t.name, t.icon
       FROM spot_tags st
       JOIN tags t ON st.tag_id = t.id
       WHERE st.spot_id = $1
       ORDER BY t.name`,
      [id]
    );

    return NextResponse.json({
      spot,
      reviews: reviews.rows,
      tags: tagsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching spot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spot' },
      { status: 500 }
    );
  }
}

// PATCH /api/spots/[id] — Update spot (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check ownership
    const existing = await queryOne(
      'SELECT user_id FROM spots WHERE id = $1',
      [id]
    );

    if (!existing) {
      return NextResponse.json(
        { error: 'Spot not found' },
        { status: 404 }
      );
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to update this spot' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'description', 'spot_type', 'lat', 'lng',
      'fish_species', 'conditions', 'best_times', 'facilities',
      'accessibility', 'photos'
    ];

    const validSpotTypes = ['laut', 'sungai', 'danau', 'kolam', 'waduk', 'dermaga', 'muara', 'rawa', 'irigasi', 'other'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Validate specific fields
        if (field === 'name' && !isValidSpotName(sanitizeInput(String(body[field]), 100))) {
          return NextResponse.json({ error: 'Nama spot harus 2-100 karakter' }, { status: 400 });
        }
        if (field === 'spot_type' && !validSpotTypes.includes(body[field])) {
          return NextResponse.json({ error: 'Tipe spot tidak valid' }, { status: 400 });
        }
        if (field === 'lat' && !isValidCoordinate(Number(body[field]), 0)) {
          return NextResponse.json({ error: 'Latitude tidak valid' }, { status: 400 });
        }
        if (field === 'lng' && !isValidCoordinate(0, Number(body[field]))) {
          return NextResponse.json({ error: 'Longitude tidak valid' }, { status: 400 });
        }

        fields.push(`${field} = $${paramIndex}`);
        values.push(
          ['fish_species', 'photos'].includes(field)
            ? body[field]
            : ['conditions', 'facilities'].includes(field)
              ? JSON.stringify(body[field])
              : body[field]
        );
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await queryOne(
      `UPDATE spots SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    // Handle tag updates
    if (Array.isArray(body.tags)) {
      await query('DELETE FROM spot_tags WHERE spot_id = $1', [id]);
      for (const tagId of body.tags) {
        await query(
          `INSERT INTO spot_tags (spot_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, tagId]
        );
      }
    }

    return NextResponse.json({ spot: result });
  } catch (error) {
    console.error('Error updating spot:', error);
    return NextResponse.json(
      { error: 'Failed to update spot' },
      { status: 500 }
    );
  }
}

// DELETE /api/spots/[id] — Delete spot (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existing = await queryOne(
      'SELECT user_id FROM spots WHERE id = $1',
      [id]
    );

    if (!existing) {
      return NextResponse.json(
        { error: 'Spot not found' },
        { status: 404 }
      );
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this spot' },
        { status: 403 }
      );
    }

    await query('DELETE FROM spot_tags WHERE spot_id = $1', [id]);
    await query('DELETE FROM spots WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting spot:', error);
    return NextResponse.json(
      { error: 'Failed to delete spot' },
      { status: 500 }
    );
  }
}
