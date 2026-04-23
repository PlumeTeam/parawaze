'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useReports } from '@/hooks/useReports';
import { useShuttles } from '@/hooks/useShuttles';
import { useStories } from '@/hooks/useStories';
import { usePois } from '@/hooks/usePois';
import { useMeetups } from '@/hooks/useMeetups';
import { useWeatherStations } from '@/hooks/useWeatherStations';
import { useMarkerConfig } from '@/hooks/useMarkerConfig';
import type { DayFilter } from '@/hooks/useReports';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import StoryRecorder from '@/components/stories/StoryRecorder';
import StoryViewer from '@/components/stories/StoryViewer';
import ObservationViewer from '@/components/observations/ObservationViewer';
import type { WeatherReport, Shuttle, Poi, Story, Meetup } from '@/lib/types';
import type { MapViewHandle, MapActions, MarkerPosition } from '@/components/map/MapView';
import { MapErrorBoundary } from '@/components/map/MapErrorBoundary';
import { isWebGLSupported } from '@/lib/webglCheck';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

const MapViewLeaflet = dynamic(() => import('@/components/map/MapViewLeaflet'), {
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
  const { reports, loading: reportsLoading, fetchReportsByDay, fetchReports } = useReports();
  const { shuttles, fetchShuttles } = useShuttles();
  const { stories, fetchStories } = useStories();
  const { pois, fetchPois } = usePois();
  const { meetups } = useMeetups();
  const [stationsEnabled, setStationsEnabled] = useState(false);
  const { stations: weatherStations } = useWeatherStations({ enabled: stationsEnabled });
  const { getConfigsAsMap } = useMarkerConfig();
  const pioupiouStations = weatherStations.pioupiou;
  const ffvlStations = weatherStations.ffvl;
  const windsMobiStations = weatherStations.windsMobi;
  const geoSphereStations = weatherStations.geoSphere;
  const brightSkyStations = weatherStations.brightSky;
  const [stationsReady, setStationsReady] = useState(false);

  const [useLeaflet, setUseLeaflet] = useState(false);
  const [selectedObservations, setSelectedObservations] = useState<WeatherReport[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayFilter>('today');
  const [toast, setToast] = useState<string | null>(null);
  const [lastMarker, setLastMarker] = useState<{lat: number; lng: number; alt: number | null} | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [selectedStories, setSelectedStories] = useState<Story[]>([]);
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const router = useRouter();
  const mapRef = useRef<MapViewHandle>(null);
  const mapActionsRef = useRef<MapActions | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const [navHeight, setNavHeight] = useState(82);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  // Check WebGL support once on mount; fall back to Leaflet if broken or ?leaflet=true
  useEffect(() => {
    if (window.location.search.includes('leaflet=true') || !isWebGLSupported()) {
      setUseLeaflet(true);
    }
  }, []);

  // Fetch reports when selectedDay changes
  useEffect(() => {
    fetchReportsByDay(selectedDay);
  }, [selectedDay, fetchReportsByDay]);

  // Refetch stories and reports when page becomes visible (e.g., returning from posting)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, refetch stories and reports
        fetchStories();
        fetchReportsByDay(selectedDay);
      }
    };

    const handleFocus = () => {
      // Window regained focus, refetch data
      fetchStories();
      fetchReportsByDay(selectedDay);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedDay, fetchStories, fetchReportsByDay]);

  // Toggle stations on/off
  const toggleStations = useCallback(() => {
    setStationsEnabled(prev => !prev);
    setStationsReady(prev => !prev);
  }, []);

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

  // Measure BottomNav height so map buttons stay above it
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setNavHeight(el.offsetHeight));
    ro.observe(el);
    setNavHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  const handleShuttleClick = (shuttle: Shuttle) => {
    router.push(`/shuttle/${shuttle.id}`);
  };

  const handlePoiClick = (poi: Poi) => {
    router.push(`/sites/${poi.id}`);
  };

  const handleStoryClick = (stories: Story[]) => {
    setSelectedStories(stories);
  };

  const handleObservationsClick = (observations: WeatherReport[]) => {
    setSelectedObservations(observations);
  };

  const handleMeetupClick = (meetup: Meetup) => {
    router.push('/meetup');
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

  const formatMarkerLabel = (pos: MarkerPosition) => {
    const latDir = pos.lat >= 0 ? 'N' : 'S';
    const lngDir = pos.lng >= 0 ? 'E' : 'W';
    const coords = `${Math.abs(pos.lat).toFixed(4)}\u00B0 ${latDir}, ${Math.abs(pos.lng).toFixed(4)}\u00B0 ${lngDir}`;
    const alt = pos.alt !== null ? ` \u00B7 ${pos.alt}m` : '';
    return `\u{1F4CD} ${coords}${alt}`;
  };

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
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex bg-white/50 backdrop-blur-md rounded-full p-1 shadow-lg border border-white/50">
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

        {useLeaflet ? (
          <MapViewLeaflet
            dayFilter={selectedDay}
            reports={reports}
            pois={pois}
            shuttles={shuttles}
            onObservationsClick={handleObservationsClick}
            onPoiClick={handlePoiClick}
            onShuttleClick={handleShuttleClick}
            onMarkerPlaced={handleMarkerPlaced}
            onMapLoaded={() => setMapLoading(false)}
          />
        ) : (
        <MapErrorBoundary>
        <MapView
          ref={mapRef}
          dayFilter={selectedDay}
          reports={reports}
          stories={selectedDay === 'today' ? stories : []}
          pois={pois}
          pioupiouStations={stationsReady ? pioupiouStations : []}
          ffvlStations={stationsReady ? ffvlStations : []}
          windsMobiStations={stationsReady ? windsMobiStations : []}
          geoSphereStations={stationsReady ? geoSphereStations : []}
          brightSkyStations={stationsReady ? brightSkyStations : []}
          markerConfig={getConfigsAsMap()}
          meetups={meetups.filter(m => {
            if (!m.meeting_time) return false;
            const meetTime = new Date(m.meeting_time);
            const now = new Date();
            const utcYear = now.getUTCFullYear();
            const utcMonth = now.getUTCMonth();
            const utcDate = now.getUTCDate();
            const todayStart = new Date(Date.UTC(utcYear, utcMonth, utcDate, 0, 0, 0));
            const tomorrowStart = new Date(Date.UTC(utcYear, utcMonth, utcDate + 1, 0, 0, 0));
            const dayAfter = new Date(Date.UTC(utcYear, utcMonth, utcDate + 2, 0, 0, 0));
            const yesterdayStart = new Date(Date.UTC(utcYear, utcMonth, utcDate - 1, 0, 0, 0));
            if (selectedDay === 'today') return meetTime >= todayStart && meetTime < tomorrowStart;
            if (selectedDay === 'tomorrow') return meetTime >= tomorrowStart && meetTime < dayAfter;
            if (selectedDay === 'yesterday') return meetTime >= yesterdayStart && meetTime < todayStart;
            return true;
          })}
          onPoiClick={handlePoiClick}
          onStoryClick={handleStoryClick}
          onMeetupClick={handleMeetupClick}
          shuttles={shuttles.filter(s => {
            if (!s.departure_time) return false;
            const dep = new Date(s.departure_time);
            const now = new Date();
            const utcYear = now.getUTCFullYear();
            const utcMonth = now.getUTCMonth();
            const utcDate = now.getUTCDate();
            const todayStart = new Date(Date.UTC(utcYear, utcMonth, utcDate, 0, 0, 0));
            const tomorrowStart = new Date(Date.UTC(utcYear, utcMonth, utcDate + 1, 0, 0, 0));
            const dayAfter = new Date(Date.UTC(utcYear, utcMonth, utcDate + 2, 0, 0, 0));
            const yesterdayStart = new Date(Date.UTC(utcYear, utcMonth, utcDate - 1, 0, 0, 0));
            if (selectedDay === 'today') return dep >= todayStart && dep < tomorrowStart;
            if (selectedDay === 'tomorrow') return dep >= tomorrowStart && dep < dayAfter;
            if (selectedDay === 'yesterday') return dep >= yesterdayStart && dep < todayStart;
            return true;
          })}
          onObservationsClick={handleObservationsClick}
          onShuttleClick={handleShuttleClick}
          onMapMove={handleMapMove}
          onMarkerPlaced={handleMarkerPlaced}
          enableAutocenter={true}
          onMapLoaded={() => setMapLoading(false)}
          onMapReady={(actions) => { mapActionsRef.current = actions; }}
        />
        </MapErrorBoundary>
        )}

        {/* Loading spinner overlay */}
        {mapLoading && (
          <div className="absolute inset-0 z-40 bg-white flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600 font-medium">Chargement...</p>
          </div>
        )}

        {/* Story Viewer */}
        {selectedStories.length > 0 && (
          <StoryViewer
            stories={selectedStories}
            onClose={() => setSelectedStories([])}
          />
        )}

        {/* Observation Viewer */}
        {selectedObservations.length > 0 && (
          <ObservationViewer
            observations={selectedObservations}
            onClose={() => setSelectedObservations([])}
          />
        )}

        {/* Toast message */}
        {toast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-gray-900/90 text-white text-sm px-4 py-2 rounded-full shadow-lg backdrop-blur-sm">
            {toast}
          </div>
        )}
      </main>

      {/* Map controls — Mapbox only (hidden in Leaflet fallback) */}
      {!useLeaflet && <div
        className="fixed right-4 flex flex-col gap-2 z-40"
        style={{ bottom: navHeight + 12 }}
      >
        <button
          onClick={() => mapActionsRef.current?.cycleStyle()}
          className="bg-white rounded-xl shadow-lg p-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors border border-gray-100"
          title="Changer le style de la carte"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
        </button>
        <button
          onClick={() => mapActionsRef.current?.locateMe()}
          className="bg-white rounded-xl shadow-lg p-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors border border-gray-100"
          title="Ma position"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
      </div>}

      {/* Marker info label — shown when a marker is placed */}
      {lastMarker && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 bg-gray-900/85 backdrop-blur-sm text-white text-sm px-4 py-2.5 rounded-2xl shadow-lg pointer-events-none whitespace-nowrap font-medium"
          style={{ bottom: navHeight + 60 }}
        >
          {formatMarkerLabel(lastMarker)}
        </div>
      )}

      <BottomNav
        ref={navRef}
        onCreateReport={handleCreateReport}
        onCameraOpen={() => setShowRecorder(true)}
      />

      {/* Story Recorder fullscreen */}
      {showRecorder && (
        <StoryRecorder
          onClose={() => setShowRecorder(false)}
          onPublished={() => setToast('Story publiée !')}
          onStoryPublished={() => fetchStories()}
        />
      )}
    </div>
  );
}