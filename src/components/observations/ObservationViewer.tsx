'use client';

import { useRef, useEffect, useState } from 'react';
import { formatTimestamp } from '@/lib/dateUtils';
import type { WeatherReport } from '@/lib/types';

interface ObservationViewerProps {
  observations: WeatherReport[];
  onClose: () => void;
}

const WIND_LABELS: Record<string, string> = {
  N: '⬇️', NE: '↙️', E: '⬅️', SE: '↖️',
  S: '⬆️', SW: '↗️', W: '➡️', NW: '↘️',
  variable: '🌪️',
};

export default function ObservationViewer({ observations, onClose }: ObservationViewerProps) {
  const dragStartY = useRef<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const observation = observations[currentIndex];

  const nextObservation = () => {
    if (currentIndex < observations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const previousObservation = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const tapX = e.clientX - rect.left;
    if (tapX < rect.width / 3) {
      previousObservation();
    } else if (tapX > (rect.width * 2) / 3) {
      nextObservation();
    }
  };

  // Swipe down to close
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
    if (delta > 120) {
      onClose();
    } else {
      setTranslateY(0);
    }
  };

  const authorName = observation.profiles?.display_name || observation.profiles?.username || 'Pilote anonyme';

  const typeLabels: Record<string, string> = {
    observation: '🔍 Observation',
    forecast: '🔮 Prévision',
    image_share: '📸 Partage photo',
  };
  const typeLabel = typeLabels[observation.report_type] || 'Observation';

  const windAvg = observation.wind_speed_kmh != null ? Number(observation.wind_speed_kmh) : null;
  const windGust = observation.wind_gust_kmh != null ? Number(observation.wind_gust_kmh) : null;
  const windDir = observation.wind_direction || null;
  const windArrow = windDir ? WIND_LABELS[windDir] || '?' : null;

  const shadowStyle: React.CSSProperties = {
    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
  };

  const iconShadowStyle: React.CSSProperties = {
    filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))',
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[9999] bg-gradient-to-b from-blue-50 to-blue-100 overflow-hidden"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: translateY === 0 ? 'transform 0.3s cubic-bezier(0.32,0.72,0,1)' : 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={handleTap}
      >
        {/* Progress bar */}
        {observations.length > 1 && (
          <div className="absolute top-0 inset-x-0 z-40 flex gap-1 px-1.5 pt-1.5" style={{ paddingTop: 'max(0.375rem, env(safe-area-inset-top))' }}>
            {observations.map((_, idx) => (
              <div
                key={idx}
                className="flex-1 h-1 bg-white/40 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: idx < currentIndex ? '100%' : idx === currentIndex ? '100%' : '0%',
                    transition: idx === currentIndex ? 'width 0.1s linear' : 'width 0.3s ease-out',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Top gradient */}
        <div
          className="absolute inset-x-0 top-0 h-32 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 100%)' }}
        />

        {/* Bottom gradient */}
        <div
          className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.15) 0%, transparent 100%)' }}
        />

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 flex items-start justify-between px-4 pt-4" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
          {/* Type and author */}
          <div style={shadowStyle}>
            <p className="text-gray-900 font-bold text-base">{typeLabel}</p>
            <p className="text-gray-700 text-sm mt-0.5">{authorName}</p>
            <p className="text-gray-600 text-xs mt-1">{formatTimestamp(observation.created_at)}</p>
          </div>

          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-11 h-11 flex items-center justify-center rounded-full text-gray-900 flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.8)', ...iconShadowStyle }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content card */}
        <div className="absolute inset-0 flex items-center justify-center px-4 py-20">
          <div
            className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full border border-blue-100"
            style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
          >
            {/* Location */}
            {observation.location_name && (
              <h2 className="text-lg font-bold text-gray-900 mb-4">📍 {observation.location_name}</h2>
            )}

            {/* Altitude */}
            {observation.altitude_m != null && (
              <div className="mb-3 p-3 bg-blue-50 rounded-xl">
                <span className="text-sm text-gray-600">Altitude: </span>
                <span className="font-semibold text-gray-900">{observation.altitude_m} m</span>
              </div>
            )}

            {/* Wind */}
            {(windAvg != null || windGust != null) && (
              <div className="mb-3 p-3 bg-cyan-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{windArrow || '💨'}</span>
                  <span className="text-sm text-gray-600">Vent</span>
                </div>
                {windAvg != null && <div className="text-sm text-gray-700">Moyen: <span className="font-semibold">{Math.round(windAvg)} km/h</span></div>}
                {windGust != null && <div className="text-sm text-gray-700">Rafales: <span className="font-semibold">{Math.round(windGust)} km/h</span></div>}
                {windDir && <div className="text-xs text-gray-600 mt-1">Direction: {windDir}</div>}
              </div>
            )}

            {/* Thermal quality */}
            {observation.thermal_quality != null && (
              <div className="mb-3 p-3 bg-amber-50 rounded-xl">
                <span className="text-sm text-gray-600">Thermiques: </span>
                <span className="font-semibold text-gray-900">{'⭐'.repeat(observation.thermal_quality)}</span>
              </div>
            )}

            {/* Turbulence */}
            {observation.turbulence_level != null && (
              <div className="mb-3 p-3 bg-red-50 rounded-xl">
                <span className="text-sm text-gray-600">Turbulence: </span>
                <span className="font-semibold text-gray-900">
                  {observation.turbulence_level === 1 ? 'Faible'
                    : observation.turbulence_level === 2 ? 'Modérée'
                      : observation.turbulence_level === 3 ? 'Forte'
                        : observation.turbulence_level >= 4 ? 'Extrême'
                          : '—'}
                </span>
              </div>
            )}

            {/* Flyability */}
            {observation.flyability_score != null && (
              <div className="mb-3 p-3 bg-green-50 rounded-xl">
                <span className="text-sm text-gray-600">Voilabilité: </span>
                <span className="font-semibold text-gray-900">
                  {observation.flyability_score >= 4 ? '✅ Bonne'
                    : observation.flyability_score === 3 ? '⚠️ Moyenne'
                      : observation.flyability_score >= 2 ? '❌ Mauvaise'
                        : '❌ Très mauvaise'}
                </span>
              </div>
            )}

            {/* Description */}
            {observation.description && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {observation.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom navigation hints */}
        {observations.length > 1 && (
          <div className="absolute bottom-0 inset-x-0 flex justify-between items-center px-6 pb-6" style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))' }}>
            {currentIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); previousObservation(); }}
                className="text-gray-700 text-sm font-medium"
              >
                ← Précédent
              </button>
            )}
            <span className="text-gray-600 text-xs">
              {currentIndex + 1} / {observations.length}
            </span>
            {currentIndex < observations.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); nextObservation(); }}
                className="text-gray-700 text-sm font-medium"
              >
                Suivant →
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
