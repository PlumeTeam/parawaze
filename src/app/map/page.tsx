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
import { usePioupiou } from '@/hooks/usePioupiou';
import { useFFVL } from '@/hooks/useFFVL';
import { useWindsMobi } from '@/hooks/useWindsMobi';
import { useGeoSphere } from '@/hooks/useGeoSphere';
import { useBrightSky } from '@/hooks/useBrightSky';
import type { DayFilter } from '@/hooks/useReports';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import StoryRecorder from '@/components/stories/StoryRecorder';
import StoryViewer from '@/components/stories/StoryViewer';
import ObservationViewer from '@/components/observations/ObservationViewer';
import GeolocationPermissionScreen from '@/components/map/GeolocationPermissionScreen';
import type { WeatherReport, Shuttle, Poi, Story, Meetup } from '@/lib/types';
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
  const { reports, loading: reportsLoading, fetchReportsByDay, fetchReports } = useReports();
  const { shuttles, fetchShuttles } = useShuttles();
  const { stories, fetchStories } = useStories();
  const { pois, fetchPois } = usePois();
  const { meetups } = useMeetups();
  const { stations: pioupiouStations } = usePioupiou();
  const { stations: ffvlStations } = useFFVL();
  const { stations: windsMobiStations } = useWindsMobi();
  const { stations: geoSphereStations } = useGeoSphere();
  const { stations: brightSkyStations } = useBrightSky();
  const [selectedObservations, setSelectedObservations] = useState<WeatherReport[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayFilter>('today');
  const [toast, setToast] = useState<string | null>(null);
  const [lastMarker, setLastMarker] = useState<{lat: number; lng: number; alt: number | null} | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [selectedStories, setSelectedStories] = useState<Story[]>([]);
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null);
  const [showGeolocationScreen, setShowGeolocationScreen] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const router = useRouter();
  const mapRef = useRef<MapViewHandle>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  // Check geolocation permission status on mount
  useEffect(() => {
    const checkGeolocationPermission = async () => {
      try {
        if (!navigator.permissions) {
          // Permissions API not available, assume we should show the screen
          setShowGeolocationScreen(true);
          return;
        }

        const result = await navigator.permissions.query({ name: 'geolocation' });

        if (result.state === 'granted') {
          // Permission already granted, skip the screen
          setShowGeolocationScreen(false);
        } else if (result.state === 'prompt') {
          // Permission not yet asked, show the screen
          setShowGeolocationScreen(true);
        } else if (result.state === 'denied') {
          // Permission was denied, show the screen
          setShowGeolocationScreen(true);
        }

        // Listen for permission changes
        result.addEventListener('change', () => {
          if (result.state === 'granted') {
            setShowGeolocationScreen(false);
          }
        });
      } catch (e) {
        // If permission check fails, show the screen
        console.debug('Permission check error:', e);
        setShowGeolocationScreen(true);
      }
    };

    checkGeolocationPermission();
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
      {/* Geolocation permission screen overlay */}
      {showGeolocationScreen && (
        <GeolocationPermissionScreen
          onPermissionGranted={() => setShowGeolocationScreen(false)}
          onSkip={() => setShowGeolocationScreen(false)}
        />
      )}

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
          stories={stories}
          pois={pois}
          pioupiouStations={pioupiouStations}
          ffvlStations={ffvlStations}
          windsMobiStations={windsMobiStations}
          geoSphereStations={geoSphereStations}
          brightSkyStations={brightSkyStations}
          meetups={meetups}
          onPoiClick={handlePoiClick}
          onStoryClick={handleStoryClick}
          onMeetupClick={handleMeetupClick}
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
          onObservationsClick={handleObservationsClick}
          onShuttleClick={handleShuttleClick}
          onMapMove={handleMapMove}
          onMarkerPlaced={handleMarkerPlaced}
          enableAutocenter={!showGeolocationScreen}
          onMapLoaded={() => setMapLoading(false)}
        />

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

      <BottomNav
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