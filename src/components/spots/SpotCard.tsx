'use client';

import Link from 'next/link';
import { Spot, SPOT_TYPE_LABELS, FACILITY_LABELS, ACCESSIBILITY_LABELS } from '@/lib/types';
import SpotTypeIcon from '@/components/ui/SpotTypeIcon';
import { formatDistance, formatRating } from '@/lib/utils';

export const CONFIRM_THRESHOLD = 3;

interface SpotCardProps {
  spot: Spot;
  showDistance?: boolean;
}

export default function SpotCard({ spot, showDistance = false }: SpotCardProps) {
  const netVotes =
    (spot.legit_count ?? 0) - (spot.reject_count ?? 0);
  const communityConfirmed = netVotes >= CONFIRM_THRESHOLD;

  return (
    <Link href={`/spots/${spot.id}`}>
      <div className="hover-lift bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-500">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <SpotTypeIcon type={spot.spot_type} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">{spot.name}</h3>
              {(spot as any).is_verified && (
                <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0">
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Terverifikasi
                </span>
              )}
              {communityConfirmed && (
                <span className="inline-flex items-center gap-0.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21h19v-2H2v2zM20 8l-8.5-5L3 8l1 2 1-.6V15h2v-6l4-2.35L15 9v6h2V9.4l1 .6 1-2z"/></svg>
                  Legit ×{netVotes}
                </span>
              )}
            </div>
            <span className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400">
              {SPOT_TYPE_LABELS[spot.spot_type]}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
            <svg className="w-3.5 h-3.5 text-yellow-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span className="font-semibold text-sm">{formatRating(spot.rating_avg)}</span>
            <span className="text-gray-400 dark:text-gray-500 text-xs">({spot.review_count})</span>
          </div>
        </div>

        {/* Photo preview */}
        {spot.photos && spot.photos.length > 0 && (
          <div className="relative mb-3 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 h-36">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={spot.photos[0]}
              alt={spot.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {spot.photos.length > 1 && (
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                {spot.photos.length}
              </span>
            )}
          </div>
        )}

        {/* Description */}
        {spot.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">{spot.description}</p>
        )}

        {/* Distance */}
        {showDistance && spot.distance_meters !== undefined && (
          <div className="flex items-center gap-1 text-blue-600 text-sm mb-3">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            {formatDistance(spot.distance_meters)} dari Anda
          </div>
        )}

        {/* Facilities */}
        {spot.facilities && spot.facilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {spot.facilities.slice(0, 4).map((f) => (
              <span
                key={f}
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full"
              >
                {FACILITY_LABELS[f] || f}
              </span>
            ))}
            {spot.facilities.length > 4 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                +{spot.facilities.length - 4} lagi
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            oleh{' '}
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/users/${spot.username}`;
              }}
              className="hover:text-blue-600 cursor-pointer"
            >
              {spot.username || 'Anonymous'}
            </span>
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {ACCESSIBILITY_LABELS[spot.accessibility]}
          </span>
        </div>
      </div>
    </Link>
  );
}
