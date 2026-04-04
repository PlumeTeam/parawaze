'use client';

import { WIND_DIRECTION_DEGREES } from '@/utils/constants';
import type { WindDirection } from '@/lib/types';

interface WindIndicatorProps {
  direction: WindDirection | null;
  speed: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function WindIndicator({ direction, speed, size = 'md' }: WindIndicatorProps) {
  const sizeMap = { sm: 32, md: 48, lg: 64 };
  const s = sizeMap[size];

  if (!direction || direction === 'variable') {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-gray-100 text-gray-400"
        style={{ width: s, height: s }}
      >
        <span className="text-xs font-bold">VAR</span>
      </div>
    );
  }

  const deg = WIND_DIRECTION_DEGREES[direction];
  const color =
    (speed ?? 0) > 30
      ? '#ef4444'
      : (speed ?? 0) > 20
      ? '#F97316'
      : (speed ?? 0) > 10
      ? '#eab308'
      : '#22c55e';

  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{ width: s, height: s, backgroundColor: `${color}20` }}
    >
      <svg
        width={s * 0.6}
        height={s * 0.6}
        viewBox="0 0 24 24"
        style={{ transform: `rotate(${deg + 180}deg)` }}
      >
        <path
          d="M12 2L8 14h8L12 2z"
          fill={color}
          stroke={color}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="17" r="2" fill={color} />
      </svg>
    </div>
  );
}
