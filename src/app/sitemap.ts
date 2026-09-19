import { MetadataRoute } from 'next';
import { query } from '@/lib/db';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fishpot.paklubis.my.id';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/spots`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/community`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/leaderboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
    { url: `${BASE_URL}/spots/new`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  try {
    // Dynamic spot pages
    const spots = await query(
      `SELECT id, updated_at FROM spots ORDER BY updated_at DESC LIMIT 500`
    );

    const spotPages: MetadataRoute.Sitemap = spots.rows.map((spot: any) => ({
      url: `${BASE_URL}/spots/${spot.id}`,
      lastModified: new Date(spot.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // Dynamic user pages
    const users = await query(
      `SELECT username, updated_at FROM profiles WHERE spots_count > 0 OR reviews_count > 0 ORDER BY updated_at DESC LIMIT 200`
    );

    const userPages: MetadataRoute.Sitemap = users.rows.map((user: any) => ({
      url: `${BASE_URL}/users/${user.username}`,
      lastModified: new Date(user.updated_at || new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));

    return [...staticPages, ...spotPages, ...userPages];
  } catch {
    return staticPages;
  }
}
