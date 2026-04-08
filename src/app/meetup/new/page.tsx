'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useMeetups } from '@/hooks/useMeetups';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { ArrowLeft, MapPin, Users, Globe, Lock, Calendar } from 'lucide-react';
import {
  MAPBOX_TOKEN,
  MAP_STYLES,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from '@/lib/mapbox';
import type mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Dynamically import mapbox to avoid SSR
const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false });

function NewMeetupForm() {
  const { user, loading: authLoading } = useAuth();
  const { createMeetup } = useMeetups();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [altitude, setAltitude] = useState<number | null>(null);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends_only'>('public');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [showMap, setShowMap] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from URL params (coming back from map picker)
  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const alt = searchParams.get('alt');
    const name = searchParams.get('name');
    if (lat) setLatitude(parseFloat(lat));
    if (lng) setLongitude(parseFloat(lng));
    if (alt) setAltitude(parseFloat(alt));
    if (name) setLocationName(decodeURIComponent(name));
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  // Default date/time to now + 1 day
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    setMeetingDate(tomorrow.toISOString().split('T')[0]);
    setMeetingTime('09:00');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Le titre est requis'); return; }
    if (!meetingDate || !meetingTime) { setError('La date et l\'heure sont requises'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const meetingTimeISO = new Date(`${meetingDate}T${meetingTime}:00`).toISOString();
      await createMeetup({
        title: title.trim(),
        description: description.trim() || undefined,
        location_name: locationName.trim() || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        altitude_m: altitude ?? undefined,
        meeting_time: meetingTimeISO,
        visibility,
        max_participants: maxParticipants,
      });
      router.push('/meetup');
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLocationPicked = (lat: number, lng: number, alt: number | null, name?: string) => {
    setLatitude(lat);
    setLongitude(lng);
    setAltitude(alt);
    if (name) setLocationName(name);
    setShowMap(false);
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (!user) return null;

  if (showMap) {
    return (
      <MapPicker
        initialLat={latitude ?? DEFAULT_CENTER[1]}
        initialLng={longitude ?? DEFAULT_CENTER[0]}
        onConfirm={handleLocationPicked}
        onClose={() => setShowMap(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white px-4 pt-safe-top border-b border-gray-100">
        <div className="pt-4 pb-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:opacity-60"
          >
            <ArrowLeft size={18} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Nouveau RDV</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 px-4 py-4 space-y-4 pb-8">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex: Décollage de Planfait demain matin"
            className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Détails sur le RDV, conditions météo, niveau requis..."
            rows={3}
            className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
            maxLength={500}
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Lieu</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Nom du lieu"
              className="flex-1 px-4 py-3 bg-white rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <button
              type="button"
              onClick={() => setShowMap(true)}
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
              style={{ background: latitude ? '#0EA5E9' : '#F3F4F6' }}
            >
              <MapPin size={18} stroke={latitude ? 'white' : '#6B7280'} />
            </button>
          </div>
          {latitude && longitude && (
            <p className="text-xs text-sky-600 mt-1 ml-1">
              Épingle placée ({latitude.toFixed(4)}, {longitude.toFixed(4)})
              {altitude ? ` — ${Math.round(altitude)}m` : ''}
            </p>
          )}
        </div>

        {/* Date & Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <Calendar size={14} className="inline mr-1 text-amber-500" />
            Date et heure *
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="flex-1 px-4 py-3 bg-white rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <input
              type="time"
              value={meetingTime}
              onChange={(e) => setMeetingTime(e.target.value)}
              className="w-28 px-4 py-3 bg-white rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
        </div>

        {/* Max participants */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <Users size={14} className="inline mr-1 text-green-500" />
            Participants maximum
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMaxParticipants((p) => Math.max(2, p - 1))}
              className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center active:opacity-60"
            >
              −
            </button>
            <span className="text-lg font-semibold text-gray-900 w-8 text-center">{maxParticipants}</span>
            <button
              type="button"
              onClick={() => setMaxParticipants((p) => Math.min(100, p + 1))}
              className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center active:opacity-60"
            >
              +
            </button>
          </div>
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Visibilité</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className="flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-semibold transition-all"
              style={{
                borderColor: visibility === 'public' ? '#3A3A3A' : '#E5E7EB',
                background: visibility === 'public' ? '#3A3A3A' : 'white',
                color: visibility === 'public' ? 'white' : '#6B7280',
              }}
            >
              <Globe size={15} />
              Public
            </button>
            <button
              type="button"
              onClick={() => setVisibility('friends_only')}
              className="flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-semibold transition-all"
              style={{
                borderColor: visibility === 'friends_only' ? '#3A3A3A' : '#E5E7EB',
                background: visibility === 'friends_only' ? '#3A3A3A' : 'white',
                color: visibility === 'friends_only' ? 'white' : '#6B7280',
              }}
            >
              <Lock size={15} />
              Amis uniquement
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="w-full py-4 rounded-xl text-white font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-50"
          style={{ background: '#3A3A3A' }}
        >
          {submitting ? 'Création...' : 'Créer le rendez-vous'}
        </button>
      </form>
    </div>
  );
}

export default function NewMeetupPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
      <NewMeetupForm />
    </Suspense>
  );
}
