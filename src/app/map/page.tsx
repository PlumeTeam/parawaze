'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useReports } from '@/hooks/useReports';
import ReportBottomSheet from '@/components/map/ReportBottomSheet';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { WeatherReport } from '@/lib/types';

// Dynamic import MapView to avoid SSR issues with mapbox-gl
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

export default function MapPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { reports, loading: reportsLoading, fetchReportsInRadius } = useReports();
  const [selectedReport, setSelectedReport] = useState<WeatherReport | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  const handleReportClick = (report: WeatherReport) => {
    setSelectedReport(report);
  };

  const handleViewDetail = (report: WeatherReport) => {
    router.push(`/report/${report.id}`);
  };

  const handleMapMove = (center: { lat: number; lng: number }) => {
    // Optionally fetch reports near new center
    // fetchReportsInRadius(center.lat, center.lng, 50);
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top bar */}
      <header className="flex-shrink-0 bg-gray-900 text-white px-4 py-3 flex items-center justify-between z-50 safe-area-top">
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
            <path
              d="M20 4C18 4 8 18 8 24c0 4 3 8 8 8h0c1-3 3-5 4-5s3 2 4 5h0c5 0 8-4 8-8C32 18 22 4 20 4z"
              fill="#0EA5E9"
            />
            <path
              d="M14 14c0 0 3-2 6-2s6 2 6 2"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <span className="text-lg font-bold tracking-tight">ParaWaze</span>
        </div>
        <button
          onClick={() => router.push('/profile')}
          className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            (profile?.display_name?.[0] || user.email?.[0] || 'P').toUpperCase()
          )}
        </button>
      </header>

      {/* Map */}
      <main className="flex-1 relative">
        <MapView
          reports={reports}
          onReportClick={handleReportClick}
          onMapMove={handleMapMove}
        />

        <ReportBottomSheet
          reports={reports}
          selectedReport={selectedReport}
          onSelectReport={setSelectedReport}
          onViewDetail={handleViewDetail}
        />
      </main>

      {/* Bottom nav */}
      <BottomNav />
    </div>
  );
}
