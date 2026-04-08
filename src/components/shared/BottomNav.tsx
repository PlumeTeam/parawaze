'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

interface BottomNavProps {
  /** When provided, the "Observation" button calls this instead of navigating directly */
  onCreateReport?: () => void;
  /** When provided, the camera button calls this to open story recording */
  onCameraOpen?: () => void;
}

export default function BottomNav({ onCreateReport, onCameraOpen }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [communauteMenuOpen, setCommunauteMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isObservationActive = pathname.startsWith('/report');

  const handleObservation = () => {
    if (onCreateReport) {
      onCreateReport();
    } else {
      router.push('/report/new');
    }
  };

  const handleCamera = () => {
    if (onCameraOpen) {
      onCameraOpen();
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    if (!communauteMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setCommunauteMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [communauteMenuOpen]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white safe-area-bottom"
      style={{ borderTop: '1px solid #F3F4F6' }}
    >
      <div
        className="flex items-center justify-between max-w-lg mx-auto px-4"
        style={{ height: 82 }}
      >

        {/* LEFT — Communauté button with popup */}
        <div className="relative w-16 flex justify-center" ref={menuRef}>
          <button
            onClick={() => setCommunauteMenuOpen(!communauteMenuOpen)}
            className="flex flex-col items-center justify-center gap-1 transition-opacity active:opacity-60"
          >
            <svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke={communauteMenuOpen ? '#3A3A3A' : '#C5C5C5'}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'stroke 0.2s ease' }}
            >
              {/* Three people silhouettes */}
              {/* Left person */}
              <circle cx="6" cy="7" r="2.5" />
              <path d="M6 10v5" />
              <path d="M4.5 12h3" />
              {/* Center person */}
              <circle cx="12" cy="6" r="2.5" />
              <path d="M12 9v6" />
              <path d="M10 11h4" />
              {/* Right person */}
              <circle cx="18" cy="7" r="2.5" />
              <path d="M18 10v5" />
              <path d="M16.5 12h3" />
            </svg>
            <span
              className="font-medium"
              style={{
                fontSize: 10,
                color: communauteMenuOpen ? '#3A3A3A' : '#C5C5C5',
                lineHeight: 1,
                transition: 'color 0.2s ease',
              }}
            >
              Communauté
            </span>
          </button>

          {/* Communauté popup menu */}
          {communauteMenuOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: 80,
                left: -30,
                right: -30,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
                padding: 8,
                display: 'flex',
                gap: 4,
                animation: 'slideUp 0.2s ease-out',
              }}
            >
              <style>{`
                @keyframes slideUp {
                  from {
                    opacity: 0;
                    transform: translateY(10px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>

              {/* Navette option */}
              <button
                onClick={() => {
                  setCommunauteMenuOpen(false);
                  router.push('/shuttle/pick-locations');
                }}
                className="flex-1 flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3A3A3A"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {/* Minibus/van from side */}
                  <path d="M3 10h18v8c0 1-1 2-2 2H5c-1 0-2-1-2-2v-8z" />
                  <path d="M2 10h20" />
                  <circle cx="6" cy="16" r="1.5" />
                  <circle cx="18" cy="16" r="1.5" />
                  <path d="M18 10V7c0-1 0-2-2-2h-8c-2 0-2 1-2 2v3" />
                </svg>
                <span className="font-medium text-xs text-gray-800">Navette</span>
              </button>

              {/* RDV option */}
              <button
                onClick={() => {
                  setCommunauteMenuOpen(false);
                  router.push('/meetup/pick-location');
                }}
                className="flex-1 flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3A3A3A"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {/* Calendar with people */}
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M7 5V3" />
                  <path d="M17 5V3" />
                  {/* Two people inside */}
                  <circle cx="9" cy="13.5" r="1.5" />
                  <path d="M9 15.5v1.5" />
                  <circle cx="15" cy="13.5" r="1.5" />
                  <path d="M15 15.5v1.5" />
                </svg>
                <span className="font-medium text-xs text-gray-800">RDV</span>
              </button>
            </div>
          )}
        </div>

        {/* CENTER — Observation + Camera duo in shared dark capsule */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="flex items-center justify-center gap-3 px-5"
            style={{
              height: 60,
              borderRadius: 30,
              background: '#3A3A3A',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            }}
          >
            {/* Observation button */}
            <button
              onClick={handleObservation}
              className="flex items-center justify-center transition-opacity active:opacity-70"
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                background: isObservationActive ? 'rgba(255,255,255,0.15)' : 'transparent',
              }}
              aria-label="Observation"
            >
              <svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>

            {/* Thin divider */}
            <div
              style={{
                width: 1,
                height: 28,
                background: 'rgba(255,255,255,0.18)',
                borderRadius: 1,
                flexShrink: 0,
              }}
            />

            {/* Camera button */}
            <button
              onClick={handleCamera}
              className="flex items-center justify-center transition-opacity active:opacity-70"
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                background: 'transparent',
              }}
              aria-label="Story / Caméra"
            >
              <svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </div>

          {/* Labels under the capsule */}
          <div
            className="flex items-center justify-center"
            style={{ gap: 28 }}
          >
            <span
              className="font-medium"
              style={{ fontSize: 10, color: isObservationActive ? '#1C1C1C' : '#C5C5C5', lineHeight: 1 }}
            >
              Observation
            </span>
            <span
              className="font-medium"
              style={{ fontSize: 10, color: '#C5C5C5', lineHeight: 1 }}
            >
              Story
            </span>
          </div>
        </div>

        {/* RIGHT — Site button (direct, no popup) */}
        <button
          onClick={() => router.push('/sites/pick-location')}
          className="flex flex-col items-center justify-center gap-1 w-16 transition-opacity active:opacity-60"
        >
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#C5C5C5"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Map pin with paraglider wing inside */}
            <path d="M12 2c-4 0-6 3-6 6 0 4 6 12 6 12s6-8 6-12c0-3-2-6-6-6z" />
            {/* Paraglider wing inside pin */}
            <path d="M12 8.5c-1 0-1.5.5-1.5 1.5s.5 1.5 1.5 1.5 1.5-.5 1.5-1.5-.5-1.5-1.5-1.5z" />
            <path d="M10.5 8c-.5.5-.5 1 0 1.5" />
            <path d="M13.5 8c.5.5.5 1 0 1.5" />
          </svg>
          <span
            className="font-medium"
            style={{
              fontSize: 10,
              color: '#C5C5C5',
              lineHeight: 1,
            }}
          >
            Site
          </span>
        </button>

      </div>
    </nav>
  );
}
