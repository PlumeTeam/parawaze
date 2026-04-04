'use client';

import { BADGE_LABELS, BADGE_COLORS, PILOT_LEVEL_LABELS, PILOT_LEVEL_COLORS, GENDER_LABELS } from '@/utils/constants';
import type { Profile } from '@/lib/types';

interface ProfileCardProps {
  profile: Profile;
  email?: string;
}

function formatDateFR(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
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
    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
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
        <p className="text-sm text-gray-600">{profile.bio}</p>
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

      {/* Pilot info section */}
      {(profile.pilot_level || profile.date_of_birth || profile.gender) && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Informations pilote</h4>
          <div className="space-y-1.5">
            {profile.pilot_level && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Niveau</span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-white text-xs font-semibold"
                  style={{ backgroundColor: PILOT_LEVEL_COLORS[profile.pilot_level] }}
                >
                  {PILOT_LEVEL_LABELS[profile.pilot_level]}
                </span>
              </div>
            )}
            {profile.date_of_birth && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Date de naissance</span>
                <span className="text-sm text-gray-700">{formatDateFR(profile.date_of_birth)}</span>
              </div>
            )}
            {profile.gender && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Sexe</span>
                <span className="text-sm text-gray-700">{GENDER_LABELS[profile.gender]}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wing section */}
      {(profile.current_wing || (profile.past_wings && profile.past_wings.length > 0)) && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Voiles</h4>
          <div className="space-y-1.5">
            {profile.current_wing && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Voile actuelle</span>
                <span className="text-sm text-gray-700">
                  {profile.current_wing}
                  {profile.current_wing_category && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-sky-100 text-sky-700 text-[10px] font-bold rounded">
                      {profile.current_wing_category}
                    </span>
                  )}
                </span>
              </div>
            )}
            {profile.past_wings && profile.past_wings.length > 0 && (
              <div>
                <span className="text-sm text-gray-500">Voiles passées</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {profile.past_wings.map((wing, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {wing}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Certifications */}
      {profile.certifications && profile.certifications.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Diplômes &amp; Certifications</h4>
          <div className="flex flex-wrap gap-1.5">
            {profile.certifications.map((cert, i) => (
              <span key={i} className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                {cert}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
