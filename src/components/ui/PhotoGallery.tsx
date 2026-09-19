'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PhotoGalleryProps {
  photos: string[];
  className?: string;
}

export default function PhotoGallery({ photos, className = '' }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className={`bg-gray-100 rounded-xl p-8 text-center dark:bg-gray-800 ${className}`}>
        <span className="text-4xl opacity-30">&#9633;</span>
        <p className="text-gray-500 text-sm mt-2 dark:text-gray-400">Belum ada foto</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((url, index) => (
          <button
            key={url}
            onClick={() => setSelectedIndex(index)}
            className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors group dark:border-gray-700"
          >
            <Image
              src={url}
              alt={`Foto spot ${index + 1}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 z-10"
          >
            ✕
          </button>

          {/* Navigation */}
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) =>
                    prev !== null ? (prev - 1 + photos.length) % photos.length : null
                  );
                }}
                className="absolute left-4 text-white text-4xl hover:text-gray-300 z-10 bg-white/10 w-12 h-12 rounded-full flex items-center justify-center"
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) =>
                    prev !== null ? (prev + 1) % photos.length : null
                  );
                }}
                className="absolute right-4 text-white text-4xl hover:text-gray-300 z-10 bg-white/10 w-12 h-12 rounded-full flex items-center justify-center"
              >
                ›
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="relative max-w-4xl max-h-[80vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[selectedIndex]}
              alt={`Foto spot ${selectedIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {selectedIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
