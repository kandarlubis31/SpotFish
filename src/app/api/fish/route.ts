// ============================================
// SpotFish! — Fish Species API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/fish?category=laut
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let sql = 'SELECT * FROM fish_species';
    const params: any[] = [];

    if (category) {
      sql += ' WHERE category = $1';
      params.push(category);
    }

    sql += ' ORDER BY name ASC';

    const result = await query(sql, params);

    return NextResponse.json({ fish: result.rows });
  } catch (error) {
    console.error('Error fetching fish species:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fish species' },
      { status: 500 }
    );
  }
}
