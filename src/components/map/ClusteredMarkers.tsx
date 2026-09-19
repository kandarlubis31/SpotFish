'use client';

import { useEffect, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Spot, SPOT_TYPE_LABELS } from '@/lib/types';

// Must mirror createSpotIcon in MapView (kept in sync)
const ICON_COLORS: Record<string, string> = {
  laut: '#0ea5e9',
  sungai: '#06b6d4',
  danau: '#8b5cf6',
  kolam: '#22c55e',
  waduk: '#3b82f6',
  dermaga: '#f59e0b',
  muara: '#6366f1',
  rawa: '#84cc16',
  irigasi: '#14b8a6',
  other: '#6b7280',
  lainnya: '#6b7280',
};

function createSpotIcon(spotType: string) {
  const color = ICON_COLORS[spotType] || '#6b7280';
  const letter = (spotType === 'other' ? 'L' : spotType.charAt(0)).toUpperCase();
  return L.divIcon({
    html: `
      <svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 0C8.06 0 0 8.06 0 18C0 31.5 18 44 18 44C18 44 36 31.5 36 18C36 8.06 27.94 0 18 0Z" fill="${color}"/>
        <circle cx="18" cy="18" r="12" fill="white" opacity="0.95"/>
        <text x="18" y="23" text-anchor="middle" font-size="13" font-weight="600" fill="${color}" font-family="system-ui,sans-serif">${letter}</text>
        <path d="M18 0C8.06 0 0 8.06 0 18C0 31.5 18 44 18 44C18 44 36 31.5 36 18C36 8.06 27.94 0 18 0Z" fill="none" stroke="white" stroke-width="2"/>
      </svg>`,
    className: 'custom-marker',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });
}

interface ClusteredMarkersProps {
  spots: Spot[];
  onSpotClick?: (spot: Spot) => void;
  /** Clustering aktif di atas zoom ini; di bawahnya marker lepas satu-satu */
  maxClusterZoom?: number;
}

export default function ClusteredMarkers({
  spots,
  onSpotClick,
  maxClusterZoom = 12,
}: ClusteredMarkersProps) {
  const map = useMap();

  const clusterGroup = useMemo(() => {
    const group = (L as any).markerClusterGroup({
      maxClusterRadius: 45,
      disableClusteringAtZoom: maxClusterZoom + 1,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      animateAddingMarkers: true,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        let sizeClass = 'sm';
        if (count >= 50) sizeClass = 'xl';
        else if (count >= 20) sizeClass = 'lg';
        const size = sizeClass === 'xl' ? 46 : sizeClass === 'lg' ? 40 : 34;
        return L.divIcon({
          html: `<div class="spotfish-cluster spotfish-cluster-${sizeClass}"><span>${count}</span></div>`,
          className: 'spotfish-cluster-wrapper',
          iconSize: L.point(size, size),
        });
      },
    });
    return group;
  }, [maxClusterZoom]);

  // Add/remove markers when spots change
  useEffect(() => {
    clusterGroup.clearLayers();

    const markers = spots.map((spot) => {
      const marker = L.marker([spot.lat, spot.lng], {
        icon: createSpotIcon(spot.spot_type),
      });
      const popupHtml = buildPopupHtml(spot);
      marker.bindPopup(popupHtml, { maxWidth: 300, minWidth: 250 });
      if (onSpotClick) {
        marker.on('click', () => onSpotClick(spot));
      }
      return marker;
    });

    clusterGroup.addLayers(markers);
    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, spots, clusterGroup, onSpotClick]);

  return null;
}

// Popup rendered as HTML string (cluster markers are plain Leaflet, not React)
function buildPopupHtml(spot: Spot): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const photo = spot.photos && spot.photos.length > 0
    ? `<div style="margin:-12px -12px 8px;height:110px;overflow:hidden;"><img src="${escape(spot.photos[0])}" alt="" style="width:100%;height:100%;object-fit:cover;" loading="lazy"/></div>`
    : '';

  const rating = Number(spot.rating_avg || 0).toFixed(1);
  const distance =
    spot.distance_meters !== undefined
      ? `<span style="color:#2563eb;white-space:nowrap;">${spot.distance_meters < 1000 ? Math.round(spot.distance_meters) + ' m' : (spot.distance_meters / 1000).toFixed(1) + ' km'}</span>`
      : '';

  return `
    <div style="font-family:inherit;">
      ${photo}
      <h3 style="font-weight:700;font-size:1.05rem;line-height:1.2;margin:0 0 2px;">${escape(spot.name)}</h3>
      <div style="color:#6b7280;font-size:0.85rem;margin-bottom:6px;">${escape(SPOT_TYPE_LABELS[spot.spot_type] || spot.spot_type)}</div>
      <div style="font-size:0.85rem;display:flex;gap:10px;margin-bottom:8px;align-items:center;">
        <span>${rating} (${spot.review_count})</span>
        ${distance}
      </div>
      <a href="/spots/${spot.id}" style="display:block;width:100%;text-align:center;background:#2563eb;color:#fff;padding:8px 0;border-radius:8px;font-size:0.85rem;font-weight:500;text-decoration:none;">Lihat Detail</a>
    </div>
  `;
}
