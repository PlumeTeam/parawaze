'use client';

import { useRef, useEffect, useState } from 'react';
import type { Story, WeatherReport } from '@/lib/types';

interface MixedContentViewerProps {
  stories: Story[];
  observations: WeatherReport[];
  onClose: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'à l\'instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

const WIND_LABELS: Record<string, string> = {
  N: '⬇️', NE: '↙️', E: '⬅️', SE: '↖️',
  S: '⬆️', SW: '↗️', W: '➡️', NW: '↘️',
  variable: '🌪️',
};

export default function MixedContentViewer({ stories, observations, onClose }: MixedContentViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const allContent = [...stories, ...observations];
  const totalItems = allContent.length;
  const isStory = currentIndex < stories.length;
  const currentStory = isStory ? stories[currentIndex] : null;
  const currentObservation = isStory ? null : observations[currentIndex - stories.length];

  const nextItem = () => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const previousItem = () => {
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
      previousItem();
    } else if (tapX > (rect.width * 2) / 3) {
      nextItem();
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

  const shadowStyle: React.CSSProperties = {
    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
  };

  const iconShadowStyle: React.CSSProperties = {
    filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))',
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[9999] bg-black overflow-hidden"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: translateY === 0 ? 'transform 0.3s cubic-bezier(0.32,0.72,0,1)' : 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={handleTap}
      >
        {/* Mixed progress bar — pink for stories, blue for observations */}
        {totalItems > 1 && (
          <div className="absolute top-0 inset-x-0 z-40 flex gap-1 px-1.5 pt-1.5" style={{ paddingTop: 'max(0.375rem, env(safe-area-inset-top))' }}>
            {allContent.map((_, idx) => {
              const isStorySegment = idx < stories.length;
              const segmentColor = isStorySegment ? 'bg-pink-500' : 'bg-blue-500';
              return (
                <div
                  key={idx}
                  className="flex-1 h-1 bg-white/40 rounded-full overflow-hidden"
                >
                  <div
                    className={`h-full ${segmentColor}`}
                    style={{
                      width: idx < currentIndex ? '100%' : idx === currentIndex ? '100%' : '0%',
                      transition: idx === currentIndex ? 'width 0.1s linear' : 'width 0.3s ease-out',
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Story content */}
        {isStory && currentStory && (
          <>
            <video
              ref={videoRef}
              key={currentStory.id}
              src={currentStory.video_url}
              autoPlay
              playsInline
              muted={false}
              className="absolute inset-0 w-full h-full object-cover"
              onEnded={nextItem}
            />

            {/* Top gradient */}
            <div
              className="absolute inset-x-0 top-0 h-32 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)' }}
            />

            {/* Top bar */}
            <div className="absolute top-0 inset-x-0 flex items-start justify-between px-4 pt-4" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
              <div style={shadowStyle}>
                <p className="text-white font-semibold text-base">📹 Story</p>
                <p className="text-white/80 text-sm mt-0.5">{currentStory.profiles?.display_name || currentStory.profiles?.username || 'Pilote anonyme'}</p>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-11 h-11 flex items-center justify-center rounded-full text-white flex-shrink-0"
                style={{ background: 'rgba(0,0,0,0.3)', ...iconShadowStyle }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Bottom gradient */}
            <div
              className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)' }}
            />
          </>
        )}

        {/* Observation content */}
        {!isStory && currentObservation && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-blue-100" />

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
              <div style={shadowStyle}>
                <p className="text-gray-900 font-bold text-base">🔍 Observation</p>
                <p className="text-gray-700 text-sm">{currentObservation.profiles?.display_name || currentObservation.profiles?.username || 'Pilote anonyme'}</p>
              </div>

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
                {currentObservation.location_name && (
                  <h2 className="text-lg font-bold text-gray-900 mb-4">📍 {currentObservation.location_name}</h2>
                )}

                {/* Altitude */}
                {currentObservation.altitude_m != null && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-xl">
                    <span className="text-sm text-gray-600">Altitude: </span>
                    <span className="font-semibold text-gray-900">{currentObservation.altitude_m} m</span>
                  </div>
                )}

                {/* Wind */}
                {(currentObservation.wind_speed_kmh != null || currentObservation.wind_gust_kmh != null) && (
                  <div className="mb-3 p-3 bg-cyan-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{WIND_LABELS[currentObservation.wind_direction || ''] || '💨'}</span>
                      <span className="text-sm text-gray-600">Vent</span>
                    </div>
                    {currentObservation.wind_speed_kmh != null && <div className="text-sm text-gray-700">Moyen: <span className="font-semibold">{Math.round(currentObservation.wind_speed_kmh)} km/h</span></div>}
                    {currentObservation.wind_gust_kmh != null && <div className="text-sm text-gray-700">Rafales: <span className="font-semibold">{Math.round(currentObservation.wind_gust_kmh)} km/h</span></div>}
                    {currentObservation.wind_direction && <div className="text-xs text-gray-600 mt-1">Direction: {currentObservation.wind_direction}</div>}
                  </div>
                )}

                {/* Description */}
                {currentObservation.description && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {currentObservation.description}
                    </p>
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-500">
                  {timeAgo(currentObservation.created_at)}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Bottom navigation hints */}
        {totalItems > 1 && (
          <div className="absolute bottom-0 inset-x-0 flex justify-between items-center px-6 pb-6" style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))' }}>
            {currentIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); previousItem(); }}
                className="text-white text-sm font-medium"
              >
                ← Précédent
              </button>
            )}
            <span className="text-white text-xs">
              {currentIndex + 1} / {totalItems}
            </span>
            {currentIndex < totalItems - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); nextItem(); }}
                className="text-white text-sm font-medium"
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
