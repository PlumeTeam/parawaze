'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ChevronUp, ChevronDown, ExternalLink, Wind, Thermometer, Mountain, Eye, Cloud, Flame, AlertTriangle, Star, Camera, Clock, MapPin } from 'lucide-react';
import type { WeatherReport } from '@/lib/types';
import type { DayFilter } from '@/hooks/useReports';
import ReportCard from '@/components/reports/ReportCard';
import FlyabilityBadge from '@/components/shared/FlyabilityBadge';
import WindIndicator from '@/components/shared/WindIndicator';
import {
  REPORT_TYPE_ICONS,
  REPORT_TYPE_LABELS,
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
} from '@/utils/formatters';

interface ReportBottomSheetProps {
  reports: WeatherReport[];
  selectedReport: WeatherReport | null;
  onSelectReport: (report: WeatherReport | null) => void;
  onViewDetail: (report: WeatherReport) => void;
  selectedDay?: DayFilter;
}

function getDayTitle(reports: WeatherReport[], day: DayFilter = 'today'): string {
  const count = reports.length;
  if (day === 'yesterday') {
    return `${count} rapport${count !== 1 ? 's' : ''} hier`;
  }
  if (day === 'tomorrow') {
    return `${count} prévision${count !== 1 ? 's' : ''} pour demain`;
  }
  return `${count} rapport${count !== 1 ? 's' : ''} actif${count !== 1 ? 's' : ''}`;
}

/** Condition color: green/yellow/red */
function getConditionColor(report: WeatherReport): string {
  const wind = report.wind_speed_kmh ?? 0;
  const gust = report.wind_gust_kmh ?? 0;
  const turbulence = report.turbulence_level ?? 0;
  const flyability = report.flyability_score ?? 3;

  if (wind >= 25 || gust >= 30 || turbulence >= 4 || flyability <= 2) return 'bg-red-500';
  if (wind <= 10 && gust <= 15 && turbulence <= 2 && flyability >= 4) return 'bg-green-500';
  return 'bg-yellow-500';
}

/** Inline full detail view for a selected report */
function SelectedReportDetail({
  report,
  onViewDetail,
}: {
  report: WeatherReport;
  onViewDetail: (r: WeatherReport) => void;
}) {
  const authorName = report.profiles?.display_name || report.profiles?.username || 'Anonyme';
  const conditionColor = getConditionColor(report);

  return (
    <div className="space-y-3">
      {/* Condition bar + type + flyability */}
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${conditionColor}`} />
        <span className="text-lg">{REPORT_TYPE_ICONS[report.report_type]}</span>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {REPORT_TYPE_LABELS[report.report_type]}
        </span>
        <div className="ml-auto">
          <FlyabilityBadge score={report.flyability_score} size="sm" />
        </div>
      </div>

      {/* Forecast date */}
      {report.report_type === 'forecast' && report.forecast_date && (
        <div className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
          Prévision pour le {new Date(report.forecast_date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      )}

      {/* Author + time */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        {report.profiles?.avatar_url && (
          <img src={report.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
        )}
        <span className="font-medium text-gray-600">{authorName}</span>
        <span>·</span>
        <span>{timeAgo(report.created_at)}</span>
        <span className="text-sunset-500 font-medium ml-auto">
          {expiresIn(report.expires_at)}
        </span>
      </div>

      {/* Title */}
      {report.title && (
        <h4 className="font-semibold text-gray-800 text-sm">{report.title}</h4>
      )}

      {/* Location + altitude */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        <span>
          {report.location?.coordinates
            ? `${report.location.coordinates[1].toFixed(4)}°${report.location.coordinates[1] >= 0 ? 'N' : 'S'}, ${report.location.coordinates[0].toFixed(4)}°${report.location.coordinates[0] >= 0 ? 'E' : 'W'}`
            : 'Position inconnue'}
        </span>
        {report.altitude_m && (
          <>
            <span>·</span>
            <Mountain className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="font-medium">{formatAltitude(report.altitude_m)}</span>
          </>
        )}
      </div>

      {/* Photo carousel */}
      {report.report_images && report.report_images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto py-1 -mx-1 px-1">
          {report.report_images.map((img) => (
            <div key={img.id} className="flex-shrink-0 w-24 h-20 rounded-lg overflow-hidden">
              <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Weather data grid */}
      <div className="bg-gray-50 rounded-lg p-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
        {/* Wind */}
        {report.wind_speed_kmh !== null && (
          <div className="flex items-center gap-1.5">
            <WindIndicator direction={report.wind_direction} speed={report.wind_speed_kmh} size="sm" />
            <div className="text-xs">
              <div className="font-semibold text-gray-700">{formatWind(report.wind_speed_kmh, report.wind_gust_kmh)}</div>
              {report.wind_direction && (
                <div className="text-gray-400">{WIND_DIRECTION_LABELS[report.wind_direction]}</div>
              )}
            </div>
          </div>
        )}

        {/* Temperature */}
        {report.temperature_c !== null && (
          <div className="flex items-center gap-1.5 text-xs">
            <Thermometer className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
            <span className="font-semibold text-gray-700">{formatTemperature(report.temperature_c)}</span>
          </div>
        )}

        {/* Thermals */}
        {report.thermal_quality != null && (
          <div className="flex items-center gap-1.5 text-xs">
            <Flame className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
            <span className="text-gray-600">
              Thermiques: <span className="font-semibold text-gray-700">{THERMAL_LABELS[report.thermal_quality] || report.thermal_quality}</span>
            </span>
          </div>
        )}

        {/* Turbulence */}
        {report.turbulence_level != null && (
          <div className="flex items-center gap-1.5 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-gray-600">
              Turbulences: <span className="font-semibold text-gray-700">{TURBULENCE_LABELS[report.turbulence_level] || report.turbulence_level}</span>
            </span>
          </div>
        )}

        {/* Flyability */}
        {report.flyability_score != null && (
          <div className="flex items-center gap-1.5 text-xs">
            <Star className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
            <span className="text-gray-600">
              Volabilité: <span className="font-semibold text-gray-700">{report.flyability_score}/5 ({FLYABILITY_LABELS[report.flyability_score] || ''})</span>
            </span>
          </div>
        )}

        {/* Visibility */}
        {report.visibility_km != null && (
          <div className="flex items-center gap-1.5 text-xs">
            <Eye className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
            <span className="text-gray-600">
              Visibilité: <span className="font-semibold text-gray-700">{formatVisibility(report.visibility_km)}</span>
            </span>
          </div>
        )}

        {/* Cloud ceiling */}
        {report.cloud_ceiling_m != null && (
          <div className="flex items-center gap-1.5 text-xs">
            <Cloud className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600">
              Plafond: <span className="font-semibold text-gray-700">{formatCloudCeiling(report.cloud_ceiling_m)}</span>
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      {report.description && (
        <p className="text-xs text-gray-600 leading-relaxed">{report.description}</p>
      )}

      {/* Forecast scenarios mini-table */}
      {report.forecast_scenarios && report.forecast_scenarios.length > 0 && (
        <div className="bg-purple-50 rounded-lg p-2.5">
          <div className="flex items-center gap-1 mb-1.5 text-xs font-semibold text-purple-700">
            <Clock className="h-3.5 w-3.5" />
            {report.forecast_scenarios.length} créneau{report.forecast_scenarios.length > 1 ? 'x' : ''} prévu{report.forecast_scenarios.length > 1 ? 's' : ''}
          </div>
          <div className="space-y-1">
            {report.forecast_scenarios.slice(0, 4).map((sc) => (
              <div key={sc.id} className="flex items-center gap-2 text-[10px] text-gray-600">
                <span className="font-mono font-semibold w-10">{sc.hour_slot}</span>
                {sc.wind_speed_kmh != null && (
                  <span><Wind className="h-2.5 w-2.5 inline text-gray-400" /> {formatWind(sc.wind_speed_kmh, sc.wind_gust_kmh)}</span>
                )}
                {sc.flyability_score != null && (
                  <span className="ml-auto font-semibold">
                    {FLYABILITY_LABELS[sc.flyability_score] || `${sc.flyability_score}/5`}
                  </span>
                )}
              </div>
            ))}
            {report.forecast_scenarios.length > 4 && (
              <div className="text-[10px] text-purple-500 font-medium">
                +{report.forecast_scenarios.length - 4} créneau{report.forecast_scenarios.length - 4 > 1 ? 'x' : ''} de plus...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reactions */}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        {report.likes_count > 0 && <span>👍 {report.likes_count}</span>}
        {report.genius_count > 0 && <span>🧠 {report.genius_count}</span>}
        {report.doubt_count > 0 && <span>🤔 {report.doubt_count}</span>}
      </div>

      {/* View detail button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onViewDetail(report);
        }}
        className="w-full flex items-center justify-center gap-1.5 py-2 bg-sky-500 text-white text-xs font-semibold rounded-lg hover:bg-sky-600 transition-colors"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Voir détail complet
      </button>
    </div>
  );
}

export default function ReportBottomSheet({
  reports,
  selectedReport,
  onSelectReport,
  onViewDetail,
  selectedDay = 'today',
}: ReportBottomSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedReport) setExpanded(true);
  }, [selectedReport]);

  return (
    <div
      ref={sheetRef}
      className={`fixed bottom-16 left-0 right-0 z-40 bg-white rounded-t-2xl shadow-2xl transition-all duration-300 ${
        expanded ? 'max-h-[70vh]' : 'max-h-[140px]'
      }`}
    >
      {/* Handle bar */}
      <div
        className="flex items-center justify-center py-2 cursor-pointer"
        onClick={() => {
          if (selectedReport) {
            onSelectReport(null);
            setExpanded(false);
          } else {
            setExpanded(!expanded);
          }
        }}
      >
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-700">
          {selectedReport
            ? selectedReport.location_name
              || (selectedReport.location?.coordinates
                ? `${selectedReport.location.coordinates[1].toFixed(4)}° ${selectedReport.location.coordinates[1] >= 0 ? 'N' : 'S'}, ${selectedReport.location.coordinates[0].toFixed(4)}° ${selectedReport.location.coordinates[0] >= 0 ? 'E' : 'W'}`
                : 'Rapport')
            : getDayTitle(reports, selectedDay)}
        </h3>
        <div className="flex items-center gap-2">
          {selectedReport && (
            <button
              onClick={() => {
                onSelectReport(null);
                setExpanded(false);
              }}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto px-4 pb-4" style={{ maxHeight: 'calc(70vh - 60px)' }}>
        {selectedReport ? (
          <SelectedReportDetail
            report={selectedReport}
            onViewDetail={onViewDetail}
          />
        ) : (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">
                {selectedDay === 'yesterday'
                  ? 'Aucun rapport hier.'
                  : selectedDay === 'tomorrow'
                  ? 'Aucune prévision pour demain. Soyez le premier !'
                  : 'Aucun rapport dans cette zone. Soyez le premier !'}
              </p>
            ) : (
              reports.slice(0, 10).map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onClick={() => onViewDetail(report)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
