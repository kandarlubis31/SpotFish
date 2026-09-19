'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating?: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function StarRating({
  rating = 0,
  onRate,
  readonly = false,
  size = 'md',
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hoverRating || rating);
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onRate?.(star)}
            onMouseEnter={() => !readonly && setHoverRating(star)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            className={cn(
              'transition-transform',
              sizeClasses[size],
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110',
              isFilled ? 'text-yellow-400 dark:text-yellow-400' : 'text-gray-300'
            )}
          >
            ★
          </button>
        );
      })}
      {!readonly && rating > 0 && (
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({rating}/5)</span>
      )}
    </div>
  );
}
