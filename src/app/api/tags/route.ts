// ============================================
// SpotFish! — Tags API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sanitizeInput } from '@/lib/utils';

// GET /api/tags — List all tags
export async function GET() {
  try {
    const result = await query(
      `SELECT t.id, t.name, t.icon,
              COUNT(st.spot_id) as spot_count
       FROM tags t
       LEFT JOIN spot_tags st ON t.id = st.tag_id
       GROUP BY t.id, t.name, t.icon
       ORDER BY t.name`
    );
    return NextResponse.json({ tags: result.rows });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST /api/tags — Tag a spot (or create tag + tag spot)
// Body: { spot_id: string, tag_ids?: string[], tag_name?: string }
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { spot_id, tag_ids, tag_name } = body;

    if (!spot_id) {
      return NextResponse.json({ error: 'spot_id is required' }, { status: 400 });
    }

    // Verify ownership
    const spot = await queryOne('SELECT user_id FROM spots WHERE id = $1', [spot_id]);
    if (!spot) {
      return NextResponse.json({ error: 'Spot not found' }, { status: 404 });
    }
    if (spot.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // If tag_name provided, create new tag
    if (tag_name && !tag_ids) {
      const safeName = sanitizeInput(String(tag_name), 50);
      if (!safeName) {
        return NextResponse.json({ error: 'Tag name required' }, { status: 400 });
      }

      // Find or create tag
      let tag = await queryOne('SELECT id FROM tags WHERE name = $1', [safeName]);
      if (!tag) {
        tag = await queryOne(
          'INSERT INTO tags (name) VALUES ($1) RETURNING id',
          [safeName]
        );
      }

      if (tag) {
        await query(
          'INSERT INTO spot_tags (spot_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [spot_id, tag.id]
        );
      }

      return NextResponse.json({ success: true });
    }

    // If tag_ids provided, replace all tags for this spot
    if (tag_ids && Array.isArray(tag_ids)) {
      // Remove existing tags
      await query('DELETE FROM spot_tags WHERE spot_id = $1', [spot_id]);

      // Add new tags
      for (const tagId of tag_ids) {
        await query(
          'INSERT INTO spot_tags (spot_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [spot_id, tagId]
        );
      }

      return NextResponse.json({ success: true, count: tag_ids.length });
    }

    return NextResponse.json({ error: 'tag_ids or tag_name required' }, { status: 400 });
  } catch (error) {
    console.error('Error tagging spot:', error);
    return NextResponse.json({ error: 'Failed to tag spot' }, { status: 500 });
  }
}
