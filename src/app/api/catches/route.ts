// ============================================
// SpotFish! — Catches API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sanitizeInput } from '@/lib/utils';
import { applyRateLimit } from '@/lib/rateLimit';

// GET /api/catches?spot_id=X or /api/catches?user_id=X
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const spotId = searchParams.get('spot_id');
    const userId = searchParams.get('user_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    let sql = `
      SELECT c.*, fs.name as species_name, s.name as spot_name, p.username
      FROM catches c
      LEFT JOIN fish_species fs ON c.fish_species_id = fs.id
      LEFT JOIN spots s ON c.spot_id = s.id
      LEFT JOIN profiles p ON c.user_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (spotId) {
      params.push(spotId);
      sql += ` AND c.spot_id = $${params.length}`;
    }
    if (userId) {
      params.push(userId);
      sql += ` AND c.user_id = $${params.length}`;
    }

    sql += ` ORDER BY c.caught_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    return NextResponse.json({ catches: result.rows });
  } catch (error) {
    console.error('Error fetching catches:', error);
    return NextResponse.json({ error: 'Failed to fetch catches' }, { status: 500 });
  }
}

// POST /api/catches — Log a catch
export async function POST(request: NextRequest) {
  const rl = applyRateLimit(request, 'write', '/api/catches');
  if (!rl.allowed) return rl.response!;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      spot_id,
      fish_species_id,
      fish_name,
      quantity,
      weight_kg,
      length_cm,
      bait_used,
      technique,
      caught_at,
      notes,
      photo_url,
    } = body;

    // Validate required fields
    if (!spot_id) {
      return NextResponse.json({ error: 'spot_id is required' }, { status: 400 });
    }

    const safeBait = sanitizeInput(String(bait_used || ''), 200);
    const safeNotes = sanitizeInput(String(notes || ''), 500);
    const safeFishName = sanitizeInput(String(fish_name || ''), 100);
    const numQuantity = Math.max(1, Math.min(1000, Number(quantity) || 1));
    const numWeight = weight_kg ? Math.max(0, Number(weight_kg)) : null;
    const numLength = length_cm ? Math.max(0, Number(length_cm)) : null;

    const validTechniques = ['pancing', 'jaring', 'tombak', 'pukat', 'trawal', 'lainnya'];
    const safeTechnique = validTechniques.includes(technique) ? technique : null;

    const result = await query(
      `INSERT INTO catches (
        user_id, spot_id, fish_species_id, fish_name, quantity,
        weight_kg, length_cm, bait_used, technique, caught_at, notes, photo_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        user.id,
        spot_id,
        fish_species_id || null,
        safeFishName || null,
        numQuantity,
        numWeight,
        numLength,
        safeBait || null,
        safeTechnique,
        caught_at || new Date().toISOString(),
        safeNotes || null,
        photo_url || null,
      ]
    );

    return NextResponse.json({ catch: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating catch:', error);
    return NextResponse.json({ error: 'Failed to log catch' }, { status: 500 });
  }
}
