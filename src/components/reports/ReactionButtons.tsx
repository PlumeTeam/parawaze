'use client';

import { useState, useEffect } from 'react';
import { useReactions } from '@/hooks/useReactions';
import type { ReactionType } from '@/lib/types';

interface ReactionButtonsProps {
  reportId: string;
  userId: string;
  likesCount: number;
  geniusCount: number;
  doubtCount: number;
  onUpdate?: () => void;
}

const reactions: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like', emoji: '👍', label: 'Utile' },
  { type: 'genius', emoji: '🧠', label: 'Genial' },
  { type: 'doubt', emoji: '🤔', label: 'Doute' },
];

export default function ReactionButtons({
  reportId,
  userId,
  likesCount,
  geniusCount,
  doubtCount,
  onUpdate,
}: ReactionButtonsProps) {
  const { toggleReaction, getUserReaction, loading } = useReactions();
  const [currentReaction, setCurrentReaction] = useState<ReactionType | null>(null);
  const [counts, setCounts] = useState({
    like: likesCount,
    genius: geniusCount,
    doubt: doubtCount,
  });

  useEffect(() => {
    getUserReaction(reportId, userId).then(setCurrentReaction);
  }, [reportId, userId, getUserReaction]);

  const handleClick = async (type: ReactionType) => {
    if (loading) return;

    const wasActive = currentReaction === type;
    const prevReaction = currentReaction;

    // Optimistic update
    if (wasActive) {
      setCurrentReaction(null);
      setCounts((c) => ({ ...c, [type]: Math.max(0, c[type] - 1) }));
    } else {
      setCurrentReaction(type);
      setCounts((c) => {
        const newCounts = { ...c, [type]: c[type] + 1 };
        if (prevReaction) {
          newCounts[prevReaction] = Math.max(0, newCounts[prevReaction] - 1);
        }
        return newCounts;
      });
    }

    try {
      await toggleReaction(reportId, userId, type);
      onUpdate?.();
    } catch {
      // Revert on error
      setCurrentReaction(prevReaction);
      setCounts({ like: likesCount, genius: geniusCount, doubt: doubtCount });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {reactions.map(({ type, emoji, label }) => {
        const isActive = currentReaction === type;
        const count = counts[type];

        return (
          <button
            key={type}
            onClick={() => handleClick(type)}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
              isActive
                ? 'bg-sky-100 text-sky-700 ring-2 ring-sky-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } ${loading ? 'opacity-50' : ''}`}
          >
            <span>{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
