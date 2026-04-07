'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { Story } from '@/lib/types';
import { useStories } from '@/hooks/useStories';

interface StoryViewerProps {
  story: Story;
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

export default function StoryViewer({ story, onClose }: StoryViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [muted, setMuted] = useState(true);
  const [showFlagConfirm, setShowFlagConfirm] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);

  // Swipe-to-close state
  const dragStartY = useRef<number | null>(null);
  const [translateY, setTranslateY] = useState(0);

  const { flagStory } = useStories();

  const handleFlag = useCallback(async () => {
    try {
      await flagStory(story.id);
      setFlagged(true);
      setShowFlagConfirm(false);
      setTimeout(onClose, 1000);
    } catch (e: any) {
      setFlagError(e.message || 'Erreur');
    }
  }, [flagStory, story.id, onClose]);

  // Swipe down gesture
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

  const authorName =
    story.profiles?.display_name ||
    story.profiles?.username ||
    'Pilote anonyme';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-[90] bg-black rounded-t-3xl overflow-hidden"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: translateY === 0 ? 'transform 0.3s cubic-bezier(0.32,0.72,0,1)' : 'none',
          maxHeight: '85vh',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>

        {/* Video */}
        <div className="relative bg-black" style={{ aspectRatio: '9/16', maxHeight: '60vh' }}>
          <video
            ref={videoRef}
            src={story.video_url}
            autoPlay
            playsInline
            muted={muted}
            loop
            className="w-full h-full object-cover"
            onClick={() => setMuted((m) => !m)}
          />

          {/* Mute indicator */}
          <button
            onClick={() => setMuted((m) => !m)}
            className="absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white"
          >
            {muted ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97V10.18L16.45 12.63A4.36 4.36 0 0 0 16.5 12ZM19 12C19 12.94 18.8 13.82 18.46 14.64L19.97 16.15C20.63 14.91 21 13.5 21 12C21 7.72 18.01 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM4.27 3L3 4.27 7.73 9H3V15H7L12 20V13.27L16.25 17.52C15.58 18.04 14.83 18.45 14 18.7V20.77C15.38 20.45 16.63 19.82 17.68 18.96L19.73 21 21 19.73 12 10.73 4.27 3ZM12 4L9.91 6.09 12 8.18V4Z"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9V15H7L12 20V4L7 9H3ZM16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12ZM14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z"/>
              </svg>
            )}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Meta info */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {authorName[0]?.toUpperCase() || 'P'}
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">{authorName}</p>
              <p className="text-white/60 text-xs">
                {story.location_name ? `${story.location_name} \u00B7 ` : ''}{timeAgo(story.created_at)}
              </p>
            </div>
          </div>

          {/* Flag button */}
          {!flagged && (
            <button
              onClick={() => setShowFlagConfirm(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white transition-colors"
              title="Signaler"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>
          )}

          {flagged && (
            <span className="text-white/60 text-xs">Signalé</span>
          )}
        </div>

        {flagError && (
          <p className="px-4 pb-2 text-red-400 text-xs text-center">{flagError}</p>
        )}

        {/* Safe area bottom padding */}
        <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      </div>

      {/* Flag confirm dialog */}
      {showFlagConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="bg-gray-900 rounded-2xl p-5 w-full max-w-xs shadow-2xl">
            <p className="text-white font-semibold text-base text-center mb-1">Signaler cette vidéo ?</p>
            <p className="text-white/60 text-sm text-center mb-5">
              Elle sera examinée et pourrait être supprimée.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFlagConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/20 text-white text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleFlag}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold"
              >
                Signaler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
