'use client';

import type { WeatherReport } from '@/lib/types';
import {
  REPORT_TYPE_ICONS,
  WIND_DIRECTION_LABELS,
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
  truncate,
} from '@/utils/formatters';
import FlyabilityBadge from '@/components/shared/FlyabilityBadge';
import WindIndicator from '@/components/shared/WindIndicator';
import {
  Wind,
  Thermometer,
  Mountain,
  Eye,
  Cloud,
  Flame,
  AlertTriangle,
  Star,
  Camera,
  Clock,
} from 'lucide-react';

interface ReportCardProps {
  report: WeatherReport;
  onClick: () => void;
  expanded?: boolean;
}

/** Condition color dot: green/yellow/red based on flyability + wind + turbulence */
function getConditionColor(report: WeatherReport): string {
  const wind = report.wind_speed_kmh ?? 0;
  const gust = report.wind_gust_kmh ?? 0;
  const thermal = report.thermal_quality ?? 0;
  const turbulence = report.turbulence_level ?? 0;
  const flyability = report.flyability_score ?? 3;

  // Red conditions
  if (wind >= 25 || gust >= 30 || turbulence >= 4 || flyability <= 2) {
    return 'bg-red-500';
  }
  // Green conditions
  if (wind <= 10 && gust <= 15 && turbulence <= 2 && flyability >= 4) {
    return 'bg-green-500';
  }
  // Yellow
  return 'bg-yellow-500';
}

export default function ReportCard({ report, onClick, expanded = false }: ReportCardProps) {
  const authorName = report.profiles?.display_name || report.profiles?.username || 'Anonyme';
  const conditionColor = getConditionColor(report);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Top line: condition dot + type icon + location + flyability */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${conditionColor}`} />
            <span className="text-base">{REPORT_TYPE_ICONS[report.report_type]}</span>
            <span className="font-semibold text-gray-800 truncate text-sm">
              {report.location_name
                || (report.location?.coordinates
                  ? `${report.location.coordinates[1].toFixed(4)}° ${report.location.coordinates[1] >= 0 ? 'N' : 'S'}, ${report.location.coordinates[0].toFixed(4)}° ${report.location.coordinates[0] >= 0 ? 'E' : 'W'}`
                  : 'Position inconnue')}
            </span>
            <FlyabilityBadge score={report.flyability_score} size="sm" />
          </div>

          {/* Forecast date badge */}
          {report.report_type === 'forecast' && report.forecast_date && (
            <div className="mb-1">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                Prévision pour le {new Date(report.forecast_date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
          )}

          {/* Author + time */}
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span>{authorName}</span>
            <span>·</span>
            <span>{timeAgo(report.created_at)}</span>
            <span className="text-sunset-500 font-medium ml-auto">
              {expiresIn(report.expires_at)}
            </span>
          </div>

          {/* Altitude line */}
          {report.altitude_m && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
              <Mountain className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span>{formatAltitude(report.altitude_m)}</span>
            </div>
          )}

          {/* Weather data grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {/* Wind */}
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

            {/* Temperature */}
            {report.temperature_c !== null && (
              <div className="flex items-center gap-1.5 text-xs">
                <Thermometer className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                <span className="font-semibold text-gray-700">
                  {formatTemperature(report.temperature_c)}
                </span>
              </div>
            )}

            {/* Thermal quality */}
            {report.thermal_quality !== null && report.thermal_quality !== undefined && (
              <div className="flex items-center gap-1.5 text-xs">
                <Flame className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                <span className="text-gray-600">
                  Thermiques: <span className="font-semibold text-gray-700">{THERMAL_LABELS[report.thermal_quality] || report.thermal_quality}</span>
                </span>
              </div>
            )}

            {/* Turbulence */}
            {report.turbulence_level !== null && report.turbulence_level !== undefined && (
              <div className="flex items-center gap-1.5 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                <span className="text-gray-600">
                  Turbulences: <span className="font-semibold text-gray-700">{TURBULENCE_LABELS[report.turbulence_level] || report.turbulence_level}</span>
                </span>
              </div>
            )}

            {/* Flyability score */}
            {report.flyability_score !== null && report.flyability_score !== undefined && (
              <div className="flex items-center gap-1.5 text-xs">
                <Star className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
                <span className="text-gray-600">
                  Volabilité: <span className="font-semibold text-gray-700">{report.flyability_score}/5 ({FLYABILITY_LABELS[report.flyability_score] || ''})</span>
                </span>
              </div>
            )}

            {/* Visibility */}
            {report.visibility_km !== null && report.visibility_km !== undefined && (
              <div className="flex items-center gap-1.5 text-xs">
                <Eye className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                <span className="text-gray-600">
                  Visibilité: <span className="font-semibold text-gray-700">{formatVisibility(report.visibility_km)}</span>
                </span>
              </div>
            )}

            {/* Cloud ceiling */}
            {report.cloud_ceiling_m !== null && report.cloud_ceiling_m !== undefined && (
              <div className="flex items-center gap-1.5 text-xs">
                <Cloud className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600">
                  Plafond: <span className="font-semibold text-gray-700">{formatCloudCeiling(report.cloud_ceiling_m)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Description preview - always show first 100 chars */}
          {report.description && (
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              {expanded
                ? report.description
                : truncate(report.description, 100)}
            </p>
          )}

          {/* Photo indicator + Reactions + scenario count */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
            {report.report_images && report.report_images.length > 0 && (
              <span className="flex items-center gap-0.5">
                <Camera className="h-3 w-3" /> {report.report_images.length}
              </span>
            )}
            {report.likes_count > 0 && <span>👍 {report.likes_count}</span>}
            {report.genius_count > 0 && <span>🧠 {report.genius_count}</span>}
            {report.doubt_count > 0 && <span>🤔 {report.doubt_count}</span>}
            {report.forecast_scenarios && report.forecast_scenarios.length > 0 && (
              <span className="flex items-center gap-0.5 text-sky-500 font-medium">
                <Clock className="h-3 w-3" /> {report.forecast_scenarios.length} créneau{report.forecast_scenarios.length > 1 ? 'x' : ''}
              </span>
            )}
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
