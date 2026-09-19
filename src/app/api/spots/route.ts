// ============================================
// SpotFish! — Spots API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Spot } from '@/lib/types';
import { sanitizeInput, isValidCoordinate, isValidSpotName } from '@/lib/utils';
import { applyRateLimit } from '@/lib/rateLimit';

// GET /api/spots — List all spots with optional filters & sorting
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const spotType = searchParams.get('type');
    const search = searchParams.get('q');
    const tag = searchParams.get('tag');
    const sort = searchParams.get('sort') || 'newest'; // newest | rating | name
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    let sql = `
      SELECT DISTINCT s.*, p.username, p.avatar_url,
             COALESCE(cc.legit_count, 0) AS legit_count,
             COALESCE(cc.reject_count, 0) AS reject_count
      FROM spots s
      LEFT JOIN profiles p ON s.user_id = p.id
      LEFT JOIN spot_tags st ON s.id = st.spot_id
      LEFT JOIN tags t ON st.tag_id = t.id
      LEFT JOIN spot_confirmation_counts cc ON cc.spot_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (spotType) {
      params.push(spotType);
      sql += ` AND s.spot_type = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (s.name ILIKE $${params.length} OR s.description ILIKE $${params.length})`;
    }

    if (tag) {
      params.push(tag);
      sql += ` AND t.name = $${params.length}`;
    }

    // Sort
    switch (sort) {
      case 'rating':
        sql += ` ORDER BY s.rating_avg DESC, s.review_count DESC`;
        break;
      case 'name':
        sql += ` ORDER BY s.name ASC`;
        break;
      case 'newest':
      default:
        sql += ` ORDER BY s.created_at DESC`;
        break;
    }

    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    return NextResponse.json({
      spots: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching spots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spots' },
      { status: 500 }
    );
  }
}

// POST /api/spots — Create a new spot (auth required)
export async function POST(request: NextRequest) {
  const rl = applyRateLimit(request, 'write', '/api/spots');
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
    const {
      name,
      description,
      spot_type,
      lat,
      lng,
      fish_species,
      conditions,
      best_times,
      facilities,
      accessibility,
      photos,
      tags,
    } = body;

    // Validate required fields
    if (!name || !spot_type || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, spot_type, lat, lng' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const safeName = sanitizeInput(String(name), 100);
    const safeDesc = sanitizeInput(String(description || ''), 2000);
    const safeBestTimes = sanitizeInput(String(best_times || ''), 200);
    const numLat = Number(lat);
    const numLng = Number(lng);

    if (!isValidSpotName(safeName)) {
      return NextResponse.json(
        { error: 'Nama spot harus 2-100 karakter' },
        { status: 400 }
      );
    }

    if (!isValidCoordinate(numLat, numLng)) {
      return NextResponse.json(
        { error: 'Koordinat tidak valid' },
        { status: 400 }
      );
    }

    const validSpotTypes = ['laut', 'sungai', 'danau', 'kolam', 'waduk', 'dermaga', 'muara', 'rawa', 'irigasi', 'other'];
    if (!validSpotTypes.includes(spot_type)) {
      return NextResponse.json(
        { error: 'Tipe spot tidak valid' },
        { status: 400 }
      );
    }

    const result = await queryOne<Spot>(
      `INSERT INTO spots (
        user_id, name, description, spot_type, lat, lng,
        fish_species, conditions, best_times, facilities, accessibility, photos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        user.id,
        safeName,
        safeDesc || null,
        spot_type,
        numLat,
        numLng,
        fish_species || [],
        JSON.stringify(conditions || {}),
        safeBestTimes || null,
        JSON.stringify(facilities || []),
        accessibility || 'sedang',
        photos || [],
      ]
    );

    // Link tags
    if (Array.isArray(tags) && tags.length > 0 && result) {
      for (const tagId of tags) {
        await query(
          `INSERT INTO spot_tags (spot_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [result.id, tagId]
        );
      }
    }

    return NextResponse.json({ spot: result }, { status: 201 });
  } catch (error) {
    console.error('Error creating spot:', error);
    return NextResponse.json(
      { error: 'Failed to create spot' },
      { status: 500 }
    );
  }
}
