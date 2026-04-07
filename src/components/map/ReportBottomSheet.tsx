'use client';

import { useRef, useState } from 'react';
import type { WeatherReport } from '@/lib/types';
import type { DayFilter } from '@/hooks/useReports';

interface ReportBottomSheetProps {
  reports: WeatherReport[];
  selectedReport: WeatherReport | null;
  onSelectReport: (report: WeatherReport | null) => void;
  onViewDetail: (report: WeatherReport) => void;
  selectedDay: DayFilter;
}

function flyabilityLabel(score: number | null): { label: string; color: string } {
  if (score === null) return { label: 'N/A', color: '#9CA3AF' };
  if (score >= 4) return { label: 'Excellent', color: '#22c55e' };
  if (score >= 3) return { label: 'Bon', color: '#F97316' };
  if (score >= 2) return { label: 'Moyen', color: '#eab308' };
  return { label: 'Mauvais', color: '#ef4444' };
}

function windLabel(dir: string | null): string {
  if (!dir) return '';
  const labels: Record<string, string> = {
    N: 'Nord', NE: 'Nord-Est', E: 'Est', SE: 'Sud-Est',
    S: 'Sud', SW: 'Sud-Ouest', W: 'Ouest', NW: 'Nord-Ouest',
    variable: 'Variable',
  };
  return labels[dir] ?? dir;
}

export default function ReportBottomSheet({
  reports,
  selectedReport,
  onSelectReport,
  onViewDetail,
}: ReportBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [translateY, setTranslateY] = useState(0);

  if (!selectedReport) return null;

  const fly = flyabilityLabel(selectedReport.flyability_score);

  const onPointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    if (delta > 0) setTranslateY(delta);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    dragStartY.current = null;
    if (delta > 100) {
      onSelectReport(null);
    } else {
      setTranslateY(0);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[40]"
        onClick={() => onSelectReport(null)}
      />
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-[50] bg-white rounded-t-3xl shadow-2xl"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: translateY === 0 ? 'transform 0.3s cubic-bezier(0.32,0.72,0,1)' : 'none',
          maxHeight: '60vh',
          overflowY: 'auto',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-4 pb-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 pr-2">
              <p className="font-semibold text-gray-900 text-base leading-snug truncate">
                {selectedReport.title || selectedReport.location_name || 'Observation'}
              </p>
              {selectedReport.location_name && selectedReport.title && (
                <p className="text-gray-500 text-sm mt-0.5 truncate">{selectedReport.location_name}</p>
              )}
            </div>
            <span
              className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
              style={{ background: fly.color }}
            >
              {fly.label}
            </span>
          </div>

          {selectedReport.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-3">{selectedReport.description}</p>
          )}

          <div className="grid grid-cols-2 gap-2 mb-4">
            {selectedReport.wind_speed_kmh !== null && (
              <div className="bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-xs text-gray-500">Vent</p>
                <p className="font-semibold text-gray-800 text-sm">
                  {selectedReport.wind_speed_kmh} km/h
                  {selectedReport.wind_direction ? ` · ${windLabel(selectedReport.wind_direction)}` : ''}
                </p>
              </div>
            )}
            {selectedReport.wind_gust_kmh !== null && (
              <div className="bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-xs text-gray-500">Rafales</p>
                <p className="font-semibold text-gray-800 text-sm">{selectedReport.wind_gust_kmh} km/h</p>
              </div>
            )}
            {selectedReport.temperature_c !== null && (
              <div className="bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-xs text-gray-500">Température</p>
                <p className="font-semibold text-gray-800 text-sm">{selectedReport.temperature_c}°C</p>
              </div>
            )}
            {selectedReport.altitude_m !== null && (
              <div className="bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-xs text-gray-500">Altitude</p>
                <p className="font-semibold text-gray-800 text-sm">{selectedReport.altitude_m} m</p>
              </div>
            )}
          </div>

          <button
            onClick={() => onViewDetail(selectedReport)}
            className="w-full py-3 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold rounded-2xl transition-colors"
          >
            Voir le détail
          </button>
        </div>

        <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      </div>
    </>
  );
}
