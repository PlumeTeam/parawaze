'use client';

import type { WeatherReport } from '@/lib/types';
import { REPORT_TYPE_ICONS, WIND_DIRECTION_LABELS } from '@/utils/constants';
import { timeAgo, expiresIn, formatWind, formatTemperature } from '@/utils/formatters';
import FlyabilityBadge from '@/components/shared/FlyabilityBadge';
import WindIndicator from '@/components/shared/WindIndicator';

interface ReportCardProps {
  report: WeatherReport;
  onClick: () => void;
  expanded?: boolean;
}

export default function ReportCard({ report, onClick, expanded = false }: ReportCardProps) {
  const authorName = report.profiles?.display_name || report.profiles?.username || 'Anonyme';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Top line: type icon + location + flyability */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{REPORT_TYPE_ICONS[report.report_type]}</span>
            <span className="font-semibold text-gray-800 truncate text-sm">
              {report.location_name || 'Position inconnue'}
            </span>
            <FlyabilityBadge score={report.flyability_score} size="sm" />
          </div>

          {/* Author + time */}
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span>{authorName}</span>
            <span>-</span>
            <span>{timeAgo(report.created_at)}</span>
            <span className="text-sunset-500 font-medium ml-auto">
              {expiresIn(report.expires_at)}
            </span>
          </div>

          {/* Weather data row */}
          <div className="flex items-center gap-3 flex-wrap">
            {report.wind_speed_kmh !== null && (
              <div className="flex items-center gap-1.5">
                <WindIndicator
                  direction={report.wind_direction}
                  speed={report.wind_speed_kmh}
                  size="sm"
                />
                <div className="text-xs">
                  <div className="font-semibold text-gray-700">
                    {formatWind(report.wind_speed_kmh, report.wind_gust_kmh)}
                  </div>
                  {report.wind_direction && (
                    <div className="text-gray-400">
                      {WIND_DIRECTION_LABELS[report.wind_direction]}
                    </div>
                  )}
                </div>
              </div>
            )}

            {report.temperature_c !== null && (
              <div className="text-xs">
                <span className="font-semibold text-gray-700">
                  {formatTemperature(report.temperature_c)}
                </span>
              </div>
            )}
          </div>

          {/* Description preview */}
          {expanded && report.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-3">{report.description}</p>
          )}

          {/* Reactions */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            {report.likes_count > 0 && <span>👍 {report.likes_count}</span>}
            {report.genius_count > 0 && <span>🧠 {report.genius_count}</span>}
            {report.doubt_count > 0 && <span>🤔 {report.doubt_count}</span>}
          </div>
        </div>

        {/* Thumbnail image */}
        {report.report_images && report.report_images.length > 0 && (
          <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden">
            <img
              src={report.report_images[0].url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}
