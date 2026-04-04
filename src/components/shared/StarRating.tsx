'use client';

import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: number;
  readonly?: boolean;
  label?: string;
}

export default function StarRating({
  value,
  onChange,
  max = 5,
  size = 24,
  readonly = false,
  label,
}: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      {label && <span className="text-sm text-gray-500 mr-2 min-w-[80px]">{label}</span>}
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`transition-transform ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'
          }`}
        >
          <Star
            size={size}
            className={
              star <= value
                ? 'fill-sunset-400 text-sunset-400'
                : 'fill-none text-gray-300'
            }
          />
        </button>
      ))}
    </div>
  );
}
