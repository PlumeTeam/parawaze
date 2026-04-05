'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Mountain, Eye, Wind, Thermometer, Cloud, MapPin } from 'lucide-react';
import type { WeatherReport } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import {
  REPORT_TYPE_LABELS,
  REPORT_TYPE_ICONS,
  WIND_DIRECTION_LABELS,
  BADGE_LABELS,
  BADGE_COLORS,
  THERMAL_LABELS,
  TURBULENCE_LABELS,
  FLYABILITY_LABELS,
} from '@/utils/constants';
import {
  timeAgo,
  expiresIn,
  formatWind,
  formatTemperature,
  formatAltitude,
  formatVisibility,
  formatCloudCeiling,
} from '@/utils/formatters';
import FlyabilityBadge from '@/components/shared/FlyabilityBadge';
import WindIndicator from '@/components/shared/WindIndicator';
import ReactionButtons from '@/components/reports/ReactionButtons';

interface ReportDetailProps {
  report: WeatherReport;
  onBack: () => void;
  onRefresh?: () => void;
}

export default function ReportDetail({ report, onBack, onRefresh }: ReportDetailProps) {
  const { user } = useAuth();
  const [imageIdx, setImageIdx] = useState(0);
  const images = report.report_images || [];

  const authorName = report.profiles?.display_name || report.profiles?.username || 'Anonyme';
  const badgeLevel = report.profiles?.badge_level || 'beginner';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3 px-4 py-3 safe-area-top">
          <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span>{REPORT_TYPE_ICONS[report.report_type]}</span>
              <span className="font-semibold text-gray-800 truncate">
                {report.location_name || (report.location?.coordinates ? `${Math.abs(report.location.coordinates[1]).toFixed(4)}\u00B0 ${report.location.coordinates[1] >= 0 ? 'N' : 'S'}, ${Math.abs(report.location.coordinates[0]).toFixed(4)}\u00B0 ${report.location.coordinates[0] >= 0 ? 'E' : 'W'}` : 'Rapport')}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {REPORT_TYPE_LABELS[report.report_type]}
            </span>
          </div>
          <FlyabilityBadge score={report.flyability_score} size="md" />
        </div>
      </div>

      {/* Image carousel */}
      {images.length > 0 && (
        <div className="relative bg-black">
          <img
            src={images[imageIdx].url}
            alt={images[imageIdx].caption || ''}
            className="w-full h-56 object-cover"
          />
          {images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImageIdx(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === imageIdx ? 'bg-white w-4' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-4 space-y-4">
        {/* Author */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
            {report.profiles?.avatar_url ? (
              <img
                src={report.profiles.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              authorName[0]?.toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800">{authorName}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                style={{ backgroundColor: BADGE_COLORS[badgeLevel] }}
              >
                {BADGE_LABELS[badgeLevel]}
              </span>
            </div>
            <span className="text-xs text-gray-400">{timeAgo(report.created_at)}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-sunset-500 font-semibold">
              {expiresIn(report.expires_at)}
            </span>
          </div>
        </div>

        {/* Title & description */}
        {report.title && (
          <h2 className="text-lg font-bold text-gray-800">{report.title}</h2>
        )}
        {report.description && (
          <p className="text-sm text-gray-600 leading-relaxed">{report.description}</p>
        )}

        {/* Location */}
        {report.location?.coordinates && (
          <div className="flex items-center gap-2 bg-sky-50 rounded-xl px-3 py-2">
            <MapPin className="h-4 w-4 text-sky-500 flex-shrink-0" />
            <span className="text-sm text-sky-700">
              {Math.abs(report.location.coordinates[1]).toFixed(4)}&deg; {report.location.coordinates[1] >= 0 ? 'N' : 'S'}, {Math.abs(report.location.coordinates[0]).toFixed(4)}&deg; {report.location.coordinates[0] >= 0 ? 'E' : 'W'}
              {report.altitude_m ? ` \u00B7 ${report.altitude_m}m` : ''}
            </span>
          </div>
        )}

        {/* Weather data grid */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          {/* Wind */}
          {report.wind_speed_kmh !== null && (
            <div className="flex items-center gap-3">
              <WindIndicator
                direction={report.wind_direction}
                speed={report.wind_speed_kmh}
                size="md"
              />
              <div>
                <div className="text-sm font-semibold text-gray-700">
                  {formatWind(report.wind_speed_kmh, report.wind_gust_kmh)}
                </div>
                {report.wind_direction && (
                  <div className="text-xs text-gray-400">
                    {WIND_DIRECTION_LABELS[report.wind_direction]}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Grid of values */}
          <div className="grid grid-cols-2 gap-3">
            {report.temperature_c !== null && (
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-red-400" />
                <div>
                  <div className="text-xs text-gray-400">Temperature</div>
                  <div className="text-sm font-semibold">{formatTemperature(report.temperature_c)}</div>
                </div>
              </div>
            )}
            {report.altitude_m && (
              <div className="flex items-center gap-2">
                <Mountain className="h-4 w-4 text-mountain-500" />
                <div>
                  <div className="text-xs text-gray-400">Altitude</div>
                  <div className="text-sm font-semibold">{formatAltitude(report.altitude_m)}</div>
                </div>
              </div>
            )}
            {report.cloud_ceiling_m && (
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-sky-400" />
                <div>
                  <div className="text-xs text-gray-400">Plafond</div>
                  <div className="text-sm font-semibold">{formatCloudCeiling(report.cloud_ceiling_m)}</div>
                </div>
              </div>
            )}
            {report.visibility_km && (
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-400" />
                <div>
                  <div className="text-xs text-gray-400">Visibilite</div>
                  <div className="text-sm font-semibold">{formatVisibility(report.visibility_km)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Ratings */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
            {report.thermal_quality && (
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Thermiques</div>
                <div className="text-sm font-bold text-sunset-500">
                  {report.thermal_quality}/5
                </div>
                <div className="text-[10px] text-gray-400">
                  {THERMAL_LABELS[report.thermal_quality]}
                </div>
              </div>
            )}
            {report.turbulence_level && (
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Turbulence</div>
                <div className="text-sm font-bold text-red-500">
                  {report.turbulence_level}/5
                </div>
                <div className="text-[10px] text-gray-400">
                  {TURBULENCE_LABELS[report.turbulence_level]}
                </div>
              </div>
            )}
            {report.flyability_score && (
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Volabilite</div>
                <div className="text-sm font-bold text-mountain-500">
                  {report.flyability_score}/5
                </div>
                <div className="text-[10px] text-gray-400">
                  {FLYABILITY_LABELS[report.flyability_score]}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {report.tags && report.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {report.tags.map((tag) => (
              <span
                key={tag}
                className="bg-sky-50 text-sky-600 text-xs px-2.5 py-1 rounded-full font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Reactions */}
        {user && (
          <ReactionButtons
            reportId={report.id}
            userId={user.id}
            likesCount={report.likes_count}
            geniusCount={report.genius_count}
            doubtCount={report.doubt_count}
            onUpdate={onRefresh}
          />
        )}
      </div>
    </div>
  );
}
