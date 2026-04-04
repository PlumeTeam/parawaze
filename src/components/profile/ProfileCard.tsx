'use client';

import { BADGE_LABELS, BADGE_COLORS } from '@/utils/constants';
import type { Profile } from '@/lib/types';

interface ProfileCardProps {
  profile: Profile;
  email?: string;
}

export default function ProfileCard({ profile, email }: ProfileCardProps) {
  const badgeLevel = profile.badge_level || 'beginner';
  const reliability =
    profile.total_reports > 0
      ? Math.round(
          ((profile.total_reactions_received - (profile.total_reports * 0.1)) /
            Math.max(1, profile.total_reactions_received)) *
            100
        )
      : 0;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      {/* Avatar + name */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-mountain-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg overflow-hidden">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            (profile.display_name?.[0] || 'P').toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-800">
            {profile.display_name || 'Pilote'}
          </h2>
          {profile.username && (
            <p className="text-sm text-gray-400">@{profile.username}</p>
          )}
          {email && <p className="text-xs text-gray-400 mt-0.5">{email}</p>}
        </div>
        <span
          className="px-3 py-1 rounded-full text-white text-xs font-bold"
          style={{ backgroundColor: BADGE_COLORS[badgeLevel] }}
        >
          {BADGE_LABELS[badgeLevel]}
        </span>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-sm text-gray-600 mb-4">{profile.bio}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center bg-sky-50 rounded-xl py-3">
          <div className="text-xl font-bold text-sky-600">{profile.total_reports}</div>
          <div className="text-[10px] text-gray-500 font-medium">Rapports</div>
        </div>
        <div className="text-center bg-sunset-50 rounded-xl py-3">
          <div className="text-xl font-bold text-sunset-600">
            {profile.total_reactions_received}
          </div>
          <div className="text-[10px] text-gray-500 font-medium">Reactions</div>
        </div>
        <div className="text-center bg-mountain-50 rounded-xl py-3">
          <div className="text-xl font-bold text-mountain-500">{profile.observer_score}</div>
          <div className="text-[10px] text-gray-500 font-medium">Score</div>
        </div>
      </div>
    </div>
  );
}
