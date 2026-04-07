'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Truck, BarChart2 } from 'lucide-react';

interface BottomNavProps {
  /** When provided, the "Observation" button calls this instead of navigating directly */
  onCreateReport?: () => void;
  /** When provided, the camera button calls this to open story recording */
  onCameraOpen?: () => void;
}

export default function BottomNav({ onCreateReport, onCameraOpen }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isNavetteActive = pathname.startsWith('/shuttle');
  const isAnalyseActive = pathname.startsWith('/analyse');
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

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white safe-area-bottom"
      style={{ borderTop: '1px solid #F3F4F6' }}
    >
      <div
        className="flex items-center justify-between max-w-lg mx-auto px-4"
        style={{ height: 82 }}
      >

        {/* LEFT — Navette (secondary) */}
        <button
          onClick={() => router.push('/shuttle')}
          className="flex flex-col items-center justify-center gap-1 w-16 transition-opacity active:opacity-60"
        >
          <Truck
            width={22}
            height={22}
            strokeWidth={1.8}
            stroke={isNavetteActive ? '#1C1C1C' : '#C5C5C5'}
            fill="none"
          />
          <span
            className="font-medium"
            style={{
              fontSize: 10,
              color: isNavetteActive ? '#1C1C1C' : '#C5C5C5',
              lineHeight: 1,
            }}
          >
            Navette
          </span>
        </button>

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

        {/* RIGHT — Analyse (secondary) */}
        <button
          onClick={() => router.push('/analyse')}
          className="flex flex-col items-center justify-center gap-1 w-16 transition-opacity active:opacity-60"
        >
          <BarChart2
            width={22}
            height={22}
            strokeWidth={1.8}
            stroke={isAnalyseActive ? '#1C1C1C' : '#C5C5C5'}
            fill="none"
          />
          <span
            className="font-medium"
            style={{
              fontSize: 10,
              color: isAnalyseActive ? '#1C1C1C' : '#C5C5C5',
              lineHeight: 1,
            }}
          >
            Analyse
          </span>
        </button>

      </div>
    </nav>
  );
}
