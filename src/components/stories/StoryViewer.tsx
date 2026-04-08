'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { Story } from '@/lib/types';
import { useStories } from '@/hooks/useStories';

interface StoryViewerProps {
  stories: Story[];
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

export default function StoryViewer({ stories, onClose }: StoryViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showMuteIcon, setShowMuteIcon] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [heartAnim, setHeartAnim] = useState(false);
  const [showFlagConfirm, setShowFlagConfirm] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);

  // Swipe-to-close state
  const dragStartY = useRef<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const muteIconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { flagStory } = useStories();

  const story = stories[currentIndex];

  const handleFlag = useCallback(async () => {
    try {
      await flagStory(story.id);
      setFlagged(true);
      setShowFlagConfirm(false);
      setTimeout(onClose, 1000);
    } catch (e: unknown) {
      setFlagError(e instanceof Error ? e.message : 'Erreur');
    }
  }, [flagStory, story.id, onClose]);

  const nextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setLiked(false);
      setFlagged(false);
      setShowFlagConfirm(false);
    } else {
      onClose();
    }
  };

  const previousStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setLiked(false);
      setFlagged(false);
      setShowFlagConfirm(false);
    }
  };

  const handleVideoTap = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't toggle mute if tapping on UI controls
    if (target.closest('button')) return;

    // Check which side of screen was tapped
    const rect = target.closest('video')?.getBoundingClientRect();
    if (!rect) {
      setMuted((m) => !m);
      return;
    }

    const tapX = e.clientX - rect.left;
    if (tapX < rect.width / 3) {
      // Left third — previous story
      previousStory();
    } else if (tapX > (rect.width * 2) / 3) {
      // Right third — next story
      nextStory();
    } else {
      // Middle third — toggle mute
      setMuted((m) => !m);
      setShowMuteIcon(true);
      if (muteIconTimer.current) clearTimeout(muteIconTimer.current);
      muteIconTimer.current = setTimeout(() => setShowMuteIcon(false), 1200);
    }
  };

  // Auto-advance when video ends
  const handleVideoEnd = () => {
    nextStory();
  };

  const handleLike = () => {
    if (liked) return;
    setLiked(true);
    setLikeCount((c) => c + 1);
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 600);
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

  useEffect(() => {
    return () => {
      if (muteIconTimer.current) clearTimeout(muteIconTimer.current);
    };
  }, []);

  const authorName =
    story.profiles?.display_name ||
    story.profiles?.username ||
    'Pilote anonyme';

  const shadowStyle: React.CSSProperties = {
    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
  };

  const iconShadowStyle: React.CSSProperties = {
    filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))',
  };

  return (
    <>
      {/* Fullscreen overlay */}
      <div
        className="fixed inset-0 z-[9999] bg-black overflow-hidden"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: translateY === 0 ? 'transform 0.3s cubic-bezier(0.32,0.72,0,1)' : 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={handleVideoTap}
      >
        {/* Story progress bar — Instagram style */}
        {stories.length > 1 && (
          <div className="absolute top-0 inset-x-0 z-40 flex gap-1 px-1.5 pt-1.5" style={{ paddingTop: 'max(0.375rem, env(safe-area-inset-top))' }}>
            {stories.map((_, idx) => (
              <div
                key={idx}
                className="flex-1 h-1 bg-white/40 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white"
                  style={{
                    width: idx < currentIndex ? '100%' : idx === currentIndex ? '100%' : '0%',
                    transition: idx === currentIndex ? 'width 0.1s linear' : 'width 0.3s ease-out',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Full-screen video */}
        <video
          ref={videoRef}
          key={story.id}
          src={story.video_url}
          autoPlay
          playsInline
          muted={muted}
          className="absolute inset-0 w-full h-full object-cover"
          onEnded={handleVideoEnd}
        />

        {/* Top gradient */}
        <div
          className="absolute inset-x-0 top-0 h-32 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)' }}
        />

        {/* Bottom gradient */}
        <div
          className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)' }}
        />

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 flex items-start justify-between px-4 pt-4" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
          {/* Author info */}
          <div style={shadowStyle}>
            <p className="text-white font-semibold text-base leading-tight">{authorName}</p>
            <p className="text-white/80 text-sm mt-0.5">{timeAgo(story.created_at)}</p>
          </div>

          {/* Close button */}
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

        {/* Bottom bar */}
        <div
          className="absolute bottom-0 inset-x-0 flex items-end justify-between px-4"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          {/* Location */}
          <div style={shadowStyle}>
            {story.location_name && (
              <p className="text-white font-medium text-sm">{story.location_name}</p>
            )}
          </div>

          {/* Right actions */}
          <div className="flex flex-col items-center gap-3">
            {/* Flag button */}
            {!flagged ? (
              <button
                onClick={(e) => { e.stopPropagation(); setShowFlagConfirm(true); }}
                className="w-9 h-9 flex items-center justify-center rounded-full text-white/80"
                style={{ background: 'rgba(0,0,0,0.25)', ...iconShadowStyle }}
                title="Signaler"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
            ) : (
              <span className="text-white/50 text-xs" style={shadowStyle}>Signalé</span>
            )}

            {/* Like button */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); handleLike(); }}
                className="w-12 h-12 flex items-center justify-center rounded-full text-white"
                style={{
                  ...iconShadowStyle,
                  transform: heartAnim ? 'scale(1.4)' : 'scale(1)',
                  transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }}
              >
                {liked ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#EF4444">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                )}
              </button>
              {likeCount > 0 && (
                <span className="text-white text-xs font-medium" style={shadowStyle}>{likeCount}</span>
              )}
            </div>
          </div>
        </div>

        {/* Mute/unmute transient icon */}
        {showMuteIcon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-black/50 text-white">
              {muted ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97V10.18L16.45 12.63A4.36 4.36 0 0 0 16.5 12ZM19 12C19 12.94 18.8 13.82 18.46 14.64L19.97 16.15C20.63 14.91 21 13.5 21 12C21 7.72 18.01 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM4.27 3L3 4.27 7.73 9H3V15H7L12 20V13.27L16.25 17.52C15.58 18.04 14.83 18.45 14 18.7V20.77C15.38 20.45 16.63 19.82 17.68 18.96L19.73 21 21 19.73 12 10.73 4.27 3ZM12 4L9.91 6.09 12 8.18V4Z"/>
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9V15H7L12 20V4L7 9H3ZM16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12ZM14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z"/>
                </svg>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Flag confirm dialog */}
      {showFlagConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-6">
          <div className="bg-gray-900 rounded-2xl p-5 w-full max-w-xs shadow-2xl">
            <p className="text-white font-semibold text-base text-center mb-1">Signaler cette vidéo ?</p>
            <p className="text-white/60 text-sm text-center mb-5">
              Elle sera examinée et pourrait être supprimée.
            </p>
            {flagError && (
              <p className="text-red-400 text-xs text-center mb-3">{flagError}</p>
            )}
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
