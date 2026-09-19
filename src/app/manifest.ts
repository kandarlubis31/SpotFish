import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SpotFish! — Peta Komunitas Spot Mancing',
    short_name: 'SpotFish!',
    description:
      'Temukan dan berbagi lokasi spot mancing terbaik di Indonesia. Platform community-driven berbasis peta interaktif.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#2563eb',
    orientation: 'portrait-primary',
    lang: 'id',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
