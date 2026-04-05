'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useReports } from '@/hooks/useReports';
import { useShuttles } from '@/hooks/useShuttles';
import { usePois } from '@/hooks/usePois';
import type { DayFilter } from '@/hooks/useReports';
import ReportBottomSheet from '@/components/map/ReportBottomSheet';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { WeatherReport, Shuttle, Poi } from '@/lib/types';
import type { MapViewHandle } from '@/components/map/MapView';

// Dynamic import MapView to avoid SSR issues with mapbox-gl
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

const DAY_LABELS: Record<DayFilter, string> = {
  yesterday: 'Hier',
  today: "Aujourd'hui",
  tomorrow: 'Demain',
};

export default function MapPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { reports, loading: reportsLoading, fetchReportsByDay } = useReports();
  const { shuttles, fetchShuttles } = useShuttles();
  const { pois, fetchPois } = usePois();
  const [selectedReport, setSelectedReport] = useState<WeatherReport | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayFilter>('today');
  const [toast, setToast] = useState<string | null>(null);
  const [lastMarker, setLastMarker] = useState<{lat: number; lng: number; alt: number | null} | null>(null);
  const router = useRouter();
  const mapRef = useRef<MapViewHandle>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  // Fetch reports when selectedDay changes
  useEffect(() => {
    fetchReportsByDay(selectedDay);
  }, [selectedDay, fetchReportsByDay]);

  // Fetch shuttles once
  useEffect(() => {
    fetchShuttles();
  }, [fetchShuttles]);

  // Fetch POIs once (always visible)
  useEffect(() => {
    fetchPois();
  }, [fetchPois]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleReportClick = (report: WeatherReport) => {
    setSelectedReport(report);
  };

  const handleShuttleClick = (shuttle: Shuttle) => {
    router.push(`/shuttle/${shuttle.id}`);
  };

  const handlePoiClick = (poi: Poi) => {
    router.push(`/sites/${poi.id}`);
  };

  const handleViewDetail = (report: WeatherReport) => {
    router.push(`/report/${report.id}`);
  };

  const handleMapMove = (center: { lat: number; lng: number }) => {
    // Optionally fetch reports near new center
    // fetchReportsInRadius(center.lat, center.lng, 50);
  };

  // Called when user taps on the map to place a marker
  const handleMarkerPlaced = useCallback((pos: {lat: number; lng: number; alt: number | null}) => {
    setLastMarker(pos);
  }, []);

  // Called by BottomNav when "Observation" is tapped — uses stored marker position
  const handleCreateReport = useCallback(() => {
    // Try ref first, then fall back to state
    const marker = mapRef.current?.getMarkerPosition() || lastMarker;
    if (marker) {
      const altParam = marker.alt !== null ? `&alt=${marker.alt}` : '';
      const typeParam = selectedDay === 'tomorrow' ? '&type=forecast' : '';
      router.push(`/report/new?lat=${marker.lat.toFixed(6)}&lng=${marker.lng.toFixed(6)}${altParam}${typeParam}`);
    } else {
      setToast('Touchez la carte pour placer votre observation');
    }
  }, [router, lastMarker, selectedDay]);

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
      <main className="flex-1 relative" style={{ minHeight: 0 }}>
        {/* Day filter tabs */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex bg-white/80 backdrop-blur-md rounded-full p-1 shadow-lg border border-white/50">
          {(['yesterday', 'today', 'tomorrow'] as const).map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedDay === day
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>

        <MapView
          ref={mapRef}
          reports={reports}
          pois={pois}
          onPoiClick={handlePoiClick}
          shuttles={shuttles.filter(s => {
            if (!s.departure_time) return false;
            const dep = new Date(s.departure_time);
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
            const dayAfter = new Date(tomorrowStart); dayAfter.setDate(dayAfter.getDate() + 1);
            const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            if (selectedDay === 'today') return dep >= todayStart && dep < tomorrowStart;
            if (selectedDay === 'tomorrow') return dep >= tomorrowStart && dep < dayAfter;
            if (selectedDay === 'yesterday') return dep >= yesterdayStart && dep < todayStart;
            return true;
          })}
          onReportClick={handleReportClick}
          onShuttleClick={handleShuttleClick}
          onMapMove={handleMapMove}
          onMarkerPlaced={handleMarkerPlaced}
        />

        <ReportBottomSheet
          reports={reports}
          selectedReport={selectedReport}
          onSelectReport={setSelectedReport}
          onViewDetail={handleViewDetail}
          selectedDay={selectedDay}
        />

        {/* Toast message */}
        {toast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-gray-900/90 text-white text-sm px-4 py-2 rounded-full shadow-lg backdrop-blur-sm">
            {toast}
          </div>
        )}
      </main>

      <BottomNav onCreateReport={handleCreateReport} />
    </div>
  );
}
