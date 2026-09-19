// ============================================
// SpotFish! — Stats API (aggregates only)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/stats — Aggregate stats for community page
export async function GET() {
  try {
    const [spotStats, reviewStats, typeStats, topContributors, confirmedStats] = await Promise.all([
      // Total spots + avg rating
      query(`SELECT COUNT(*) as total_spots, COALESCE(AVG(rating_avg), 0) as avg_rating FROM spots`),
      // Total reviews
      query(`SELECT COUNT(*) as total_reviews FROM reviews`),
      // Spot type distribution
      query(`SELECT spot_type, COUNT(*) as count FROM spots GROUP BY spot_type ORDER BY count DESC`),
      // Top contributors (users with most spots)
      query(
        `SELECT p.username, p.avatar_url, COUNT(s.id) as spot_count
         FROM profiles p
         INNER JOIN spots s ON p.id = s.user_id
         GROUP BY p.id, p.username, p.avatar_url
         ORDER BY spot_count DESC
         LIMIT 10`
      ),
      // Community-confirmed spots (net legit votes >= 3)
      query(
        `SELECT COUNT(*) as total_confirmed
         FROM spot_confirmation_counts
         WHERE legit_count - reject_count >= 3`
      ),
    ]);

    // Rating distribution
    const ratingRows = await query(
      `SELECT ROUND(rating_avg)::int as rating_bucket, COUNT(*) as count
       FROM spots
       WHERE rating_avg > 0
       GROUP BY rating_bucket
       ORDER BY rating_bucket DESC`
    );

    return NextResponse.json({
      totalSpots: Number(spotStats.rows[0]?.total_spots || 0),
      avgRating: Number(spotStats.rows[0]?.avg_rating || 0),
      totalReviews: Number(reviewStats.rows[0]?.total_reviews || 0),
      spotTypes: typeStats.rows,
      ratingDistribution: ratingRows.rows,
      topContributors: topContributors.rows,
      totalConfirmed: Number(confirmedStats.rows[0]?.total_confirmed || 0),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
