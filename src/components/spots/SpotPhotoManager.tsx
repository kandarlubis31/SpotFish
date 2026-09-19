'use client';

import { useState } from 'react';
import PhotoUpload from '@/components/ui/PhotoUpload';
import PhotoGallery from '@/components/ui/PhotoGallery';

interface SpotPhotoManagerProps {
  spotId: string;
  photos: string[];
  isOwner: boolean;
  onPhotosUpdate: (photos: string[]) => void;
}

export default function SpotPhotoManager({
  spotId,
  photos: initialPhotos,
  isOwner,
  onPhotosUpdate,
}: SpotPhotoManagerProps) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [showUpload, setShowUpload] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleUpload(url: string) {
    const newPhotos = [...photos, url];
    setPhotos(newPhotos);
    savePhotos(newPhotos);
  }

  function handleRemove(url: string) {
    const newPhotos = photos.filter((p) => p !== url);
    setPhotos(newPhotos);
    savePhotos(newPhotos);
  }

  async function savePhotos(newPhotos: string[]) {
    setSaving(true);
    try {
      await fetch(`/api/spots/${spotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: newPhotos }),
      });
      onPhotosUpdate(newPhotos);
    } catch (err) {
      console.error('Failed to save photos:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg">Foto Spot</h2>
        {isOwner && (
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
          >
            {showUpload ? 'Tutup' : '+ Tambah Foto'}
          </button>
        )}
      </div>

      {/* Photo Gallery */}
      <PhotoGallery photos={photos} />

      {/* Upload Section */}
      {isOwner && showUpload && (
        <div className="mt-4">
          <PhotoUpload
            spotId={spotId}
            onUpload={handleUpload}
            onRemove={handleRemove}
            existingPhotos={photos}
            maxPhotos={10}
          />
        </div>
      )}

      {/* Saving indicator */}
      {saving && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <div className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full inline-block" /> Menyimpan...
        </div>
      )}
    </div>
  );
}
