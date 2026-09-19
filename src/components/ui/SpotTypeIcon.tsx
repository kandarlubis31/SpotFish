'use client';

import { SpotType } from '@/lib/types';

const COLORS: Record<SpotType, string> = {
  laut: '#0ea5e9',
  sungai: '#06b6d4',
  danau: '#8b5cf6',
  kolam: '#22c55e',
  waduk: '#0ea5e9',
  dermaga: '#f59e0b',
  muara: '#6366f1',
  rawa: '#16a34a',
  irigasi: '#06b6d4',
  other: '#6b7280',
};

const INITIALS: Record<SpotType, string> = {
  laut: 'L',
  sungai: 'S',
  danau: 'D',
  kolam: 'K',
  waduk: 'W',
  dermaga: 'Dg',
  muara: 'M',
  rawa: 'R',
  irigasi: 'I',
  other: '•',
};

interface SpotTypeIconProps {
  type: SpotType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function SpotTypeIcon({ type, size = 'md', className = '' }: SpotTypeIconProps) {
  const color = COLORS[type] || COLORS.other;
  const initials = INITIALS[type] || '•';

  const sizes = {
    sm: 'w-6 h-6 text-[9px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
  };

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 ${sizes[size]} ${className}`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
