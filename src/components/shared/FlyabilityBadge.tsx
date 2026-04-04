'use client';

import { FLYABILITY_LABELS } from '@/utils/constants';

interface FlyabilityBadgeProps {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
}

const scoreColors: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-orange-400',
  3: 'bg-yellow-400',
  4: 'bg-green-400',
  5: 'bg-green-500',
};

export default function FlyabilityBadge({ score, size = 'md' }: FlyabilityBadgeProps) {
  if (!score) return null;

  const sizeClass = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full text-white font-semibold ${
        scoreColors[score] || 'bg-gray-400'
      } ${sizeClass}`}
    >
      <span>{score}/5</span>
      <span className="hidden sm:inline">
        {FLYABILITY_LABELS[score] || ''}
      </span>
    </span>
  );
}
