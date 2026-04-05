'use client';

import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, MapPin, Send, X, Plus, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useReports } from '@/hooks/useReports';
import StarRating from '@/components/shared/StarRating';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { WIND_DIRECTIONS, WIND_DIRECTION_LABELS, REPORT_TYPE_LABELS } from '@/utils/constants';
import type { ReportType, WindDirection, CreateReportInput, ForecastScenario } from '@/lib/types';

interface ScenarioInput {
  hour_slot: string;
  wind_speed_kmh: string;
  wind_gust_kmh: string;
  wind_direction: WindDirection | '';
  turbulence_level: number;
  thermal_quality: number;
  flyability_score: number;
  description: string;
}

export default function ReportForm() {
  const { user } = useAuth();
  const { createReport, uploadImage } = useReports();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);

  // Read lat/lng/alt from query params (passed from map marker)
  const paramLat = searchParams.get('lat');
  const paramLng = searchParams.get('lng');
  const paramAlt = searchParams.get('alt');
  const hasMapCoords = paramLat !== null && paramLng !== null;
  const mapLat = hasMapCoords ? parseFloat(paramLat) : null;
  const mapLng = hasMapCoords ? parseFloat(paramLng) : null;
  const mapAlt = paramAlt !== null ? parseInt(paramAlt) : null;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [reportType, setReportType] = useState<ReportType>('observation');
  const [locationName, setLocationName] = useState('');
  const [altitudeM, setAltitudeM] = useState(mapAlt !== null ? String(mapAlt) : '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [windSpeed, setWindSpeed] = useState('');
  const [windGust, setWindGust] = useState('');
  const [windDirection, setWindDirection] = useState<WindDirection | ''>('');
  const [temperature, setTemperature] = useState('');
  const [cloudCeiling, setCloudCeiling] = useState('');
  const [visibilityKm, setVisibilityKm] = useState('');
  const [thermalQuality, setThermalQuality] = useState(0);
  const [turbulenceLevel, setTurbulenceLevel] = useState(0);
  const [flyabilityScore, setFlyabilityScore] = useState(0);
  const [tags, setTags] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Forecast-specific state
  const [forecastDate, setForecastDate] = useState<string>('');
  const [forecastDateMode, setForecastDateMode] = useState<'today' | 'tomorrow' | 'after' | 'custom'>('today');
  const [scenarios, setScenarios] = useState<ScenarioInput[]>([]);

  // Helpers for forecast date
  const getDateString = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  const handleForecastDateMode = (mode: 'today' | 'tomorrow' | 'after' | 'custom') => {
    setForecastDateMode(mode);
    if (mode === 'today') setForecastDate(getDateString(0));
    else if (mode === 'tomorrow') setForecastDate(getDateString(1));
    else if (mode === 'after') setForecastDate(getDateString(2));
  };

  // Initialize forecast date when switching to forecast type
  const handleReportTypeChange = (type: ReportType) => {
    setReportType(type);
    if (type === 'forecast' && !forecastDate) {
      setForecastDate(getDateString(1));
      setForecastDateMode('tomorrow');
    }
  };

  // Scenario management
  const addScenario = (hour?: string) => {
    setScenarios([...scenarios, {
      hour_slot: hour || '10:00',
      wind_speed_kmh: '',
      wind_gust_kmh: '',
      wind_direction: '',
      turbulence_level: 0,
      thermal_quality: 0,
      flyability_score: 0,
      description: '',
    }]);
  };

  const removeScenario = (idx: number) => {
    setScenarios(scenarios.filter((_, i) => i !== idx));
  };

  const updateScenario = (idx: number, field: keyof ScenarioInput, value: any) => {
    const updated = [...scenarios];
    (updated[idx] as any)[field] = value;
    setScenarios(updated);
  };

  const HOUR_SLOTS = Array.from({ length: 15 }, (_, i) => {
    const h = i + 6;
    return `${h.toString().padStart(2, '0')}:00`;
  });

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = [...images, ...files].slice(0, 5);
    setImages(newImages);

    const newPreviews = newImages.map((f) => URL.createObjectURL(f));
    setPreviews(newPreviews);
  };

  const removeImage = (idx: number) => {
    const newImages = images.filter((_, i) => i !== idx);
    setImages(newImages);
    setPreviews(newImages.map((f) => URL.createObjectURL(f)));
  };

  /** Format coordinates nicely for display: 45.9123° N, 6.1345° E */
  const formatCoord = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Location comes from map coords — no required location_name
    if (!hasMapCoords) {
      setError('Position manquante. Retournez sur la carte et utilisez le bouton Signaler.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const input: CreateReportInput = {
        report_type: reportType,
        location_name: locationName.trim() || '',
        share_location: true,
        latitude: mapLat!,
        longitude: mapLng!,
        altitude_m: altitudeM ? parseInt(altitudeM) : undefined,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        wind_speed_kmh: windSpeed ? parseInt(windSpeed) : undefined,
        wind_gust_kmh: windGust ? parseInt(windGust) : undefined,
        wind_direction: windDirection || undefined,
        temperature_c: temperature ? parseInt(temperature) : undefined,
        cloud_ceiling_m: cloudCeiling ? parseInt(cloudCeiling) : undefined,
        visibility_km: visibilityKm ? parseFloat(visibilityKm) : undefined,
        thermal_quality: thermalQuality || undefined,
        turbulence_level: turbulenceLevel || undefined,
        flyability_score: flyabilityScore || undefined,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        forecast_date: reportType === 'forecast' && forecastDate ? forecastDate : undefined,
        forecast_scenarios: reportType === 'forecast' && scenarios.length > 0
          ? scenarios.map((s) => ({
              hour_slot: s.hour_slot,
              wind_speed_kmh: s.wind_speed_kmh ? parseInt(s.wind_speed_kmh) : null,
              wind_gust_kmh: s.wind_gust_kmh ? parseInt(s.wind_gust_kmh) : null,
              wind_direction: s.wind_direction || null,
              turbulence_level: s.turbulence_level || null,
              thermal_quality: s.thermal_quality || null,
              flyability_score: s.flyability_score || null,
              description: s.description.trim() || null,
            }))
          : undefined,
      };

      const report: any = await createReport(input, user.id);

      // Upload images
      if (report?.id && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          await uploadImage(report.id, images[i], i);
        }
      }

      router.push('/map');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la creation');
    } finally {
      setSubmitting(false);
    }
  };

  const reportTypes: ReportType[] = ['observation', 'forecast', 'image_share'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-8">
      {/* Report type selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Type de rapport</label>
        <div className="grid grid-cols-3 gap-2">
          {reportTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleReportTypeChange(type)}
              className={`py-2.5 px-2 rounded-xl text-xs font-medium transition-all ${
                reportType === type
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {REPORT_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Forecast date selector (only for forecast type) */}
      {reportType === 'forecast' && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Date de la prevision
          </label>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {([
              { key: 'today' as const, label: "Aujourd'hui" },
              { key: 'tomorrow' as const, label: 'Demain' },
              { key: 'after' as const, label: 'Apres-demain' },
              { key: 'custom' as const, label: 'Autre' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleForecastDateMode(key)}
                className={`py-2 px-1 rounded-xl text-xs font-medium transition-all ${
                  forecastDateMode === key
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {forecastDateMode === 'custom' && (
            <input
              type="date"
              value={forecastDate}
              onChange={(e) => setForecastDate(e.target.value)}
              min={getDateString(0)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
            />
          )}
          {forecastDate && (
            <p className="text-xs text-gray-500 mt-1">
              Prevision pour le {new Date(forecastDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          )}
        </div>
      )}

      {/* Location preview from map */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Position</label>
        {hasMapCoords ? (
          <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-sky-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-800">
                {formatCoord(mapLat!, mapLng!)}{mapAlt !== null ? ` \u00B7 Alt. ${mapAlt}m` : ''}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Position choisie sur la carte</p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            <MapPin className="h-4 w-4 inline mr-1" />
            Retournez sur la carte et appuyez sur Signaler pour choisir une position.
          </div>
        )}
      </div>

      {/* Optional location name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Nom du lieu (optionnel)</label>
        <input
          type="text"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder="Ex: Col de la Forclaz"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
        />
      </div>

      {/* Altitude */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Altitude (m)</label>
        <input
          type="number"
          value={altitudeM}
          onChange={(e) => setAltitudeM(e.target.value)}
          placeholder="1200"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
        />
      </div>

      {/* General forecast label */}
      {reportType === 'forecast' && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-2.5">
          <p className="text-sm font-semibold text-sky-700">Prevision generale de la journee</p>
          <p className="text-xs text-sky-500 mt-0.5">Remplissez les champs ci-dessous pour la tendance globale</p>
        </div>
      )}

      {/* Wind */}
      {reportType !== 'image_share' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Vent (km/h)
              </label>
              <input
                type="number"
                value={windSpeed}
                onChange={(e) => setWindSpeed(e.target.value)}
                placeholder="15"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Rafales (km/h)
              </label>
              <input
                type="number"
                value={windGust}
                onChange={(e) => setWindGust(e.target.value)}
                placeholder="25"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
              />
            </div>
          </div>

          {/* Wind direction */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Direction du vent
            </label>
            <div className="grid grid-cols-5 gap-2">
              {WIND_DIRECTIONS.map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => setWindDirection(dir)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    windDirection === dir
                      ? 'bg-sky-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {dir === 'variable' ? 'VAR' : dir}
                </button>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Temperature (°C)
            </label>
            <input
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="18"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
            />
          </div>

          {/* Cloud ceiling + Visibility */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Plafond nuageux (m)
              </label>
              <input
                type="number"
                value={cloudCeiling}
                onChange={(e) => setCloudCeiling(e.target.value)}
                placeholder="2500"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Visibilite (km)
              </label>
              <input
                type="number"
                value={visibilityKm}
                onChange={(e) => setVisibilityKm(e.target.value)}
                placeholder="30"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
              />
            </div>
          </div>

          {/* Ratings */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Qualite thermique
              </label>
              <StarRating value={thermalQuality} onChange={setThermalQuality} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Turbulence
              </label>
              <StarRating value={turbulenceLevel} onChange={setTurbulenceLevel} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Score de volabilite
              </label>
              <StarRating value={flyabilityScore} onChange={setFlyabilityScore} />
            </div>
          </div>
        </>
      )}

      {/* Hourly scenarios (only for forecast type) */}
      {reportType === 'forecast' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700">
              Scenarios par tranche horaire (optionnel)
            </label>
          </div>

          {/* Quick preset buttons */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-gray-400 self-center">Ajouter :</span>
            {[
              { label: 'Matin (10h)', hour: '10:00' },
              { label: 'Midi (12h)', hour: '12:00' },
              { label: 'Apres-midi (15h)', hour: '15:00' },
            ].map(({ label, hour }) => (
              <button
                key={hour}
                type="button"
                onClick={() => addScenario(hour)}
                className="text-xs px-3 py-1.5 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors font-medium"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Scenario cards */}
          {scenarios
            .map((s, idx) => ({ s, idx }))
            .sort((a, b) => a.s.hour_slot.localeCompare(b.s.hour_slot))
            .map(({ s, idx }) => (
            <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-200 relative">
              <button
                type="button"
                onClick={() => removeScenario(idx)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200 transition-colors"
              >
                <X className="h-3 w-3 text-red-500" />
              </button>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-500" />
                <select
                  value={s.hour_slot}
                  onChange={(e) => updateScenario(idx, 'hour_slot', e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold bg-white"
                >
                  {HOUR_SLOTS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Vent (km/h)</label>
                  <input
                    type="number"
                    value={s.wind_speed_kmh}
                    onChange={(e) => updateScenario(idx, 'wind_speed_kmh', e.target.value)}
                    placeholder="15"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Rafales (km/h)</label>
                  <input
                    type="number"
                    value={s.wind_gust_kmh}
                    onChange={(e) => updateScenario(idx, 'wind_gust_kmh', e.target.value)}
                    placeholder="25"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500">Direction du vent</label>
                <div className="grid grid-cols-5 gap-1 mt-1">
                  {WIND_DIRECTIONS.map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => updateScenario(idx, 'wind_direction', dir)}
                      className={`py-1 rounded text-[10px] font-medium transition-all ${
                        s.wind_direction === dir
                          ? 'bg-sky-500 text-white'
                          : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {dir === 'variable' ? 'VAR' : dir}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Turbulence</label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateScenario(idx, 'turbulence_level', s.turbulence_level === v ? 0 : v)}
                        className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                          s.turbulence_level === v
                            ? 'bg-red-500 text-white'
                            : 'bg-white text-gray-400 border border-gray-200'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Thermiques</label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateScenario(idx, 'thermal_quality', s.thermal_quality === v ? 0 : v)}
                        className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                          s.thermal_quality === v
                            ? 'bg-orange-500 text-white'
                            : 'bg-white text-gray-400 border border-gray-200'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Volabilite</label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateScenario(idx, 'flyability_score', s.flyability_score === v ? 0 : v)}
                        className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                          s.flyability_score === v
                            ? 'bg-green-500 text-white'
                            : 'bg-white text-gray-400 border border-gray-200'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500">Description</label>
                <input
                  type="text"
                  value={s.description}
                  onChange={(e) => updateScenario(idx, 'description', e.target.value)}
                  placeholder="Conditions prevues..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm mt-1"
                />
              </div>
            </div>
          ))}

          {/* Add custom slot */}
          <button
            type="button"
            onClick={() => addScenario()}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-sky-300 text-sky-500 text-sm font-medium hover:bg-sky-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter un creneau
          </button>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Titre (optionnel)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Conditions du jour..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Decrivez les conditions..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm resize-none"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Tags (separes par des virgules)
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="soaring, thermique, brise"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
        />
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Photos (max 5)
        </label>
        <div className="flex flex-wrap gap-2">
          {previews.map((preview, idx) => (
            <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden">
              <img src={preview} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-sky-400 transition-colors"
            >
              <Camera className="h-6 w-6 text-gray-400" />
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageAdd}
          className="hidden"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !hasMapCoords}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-mountain-500 text-white font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-base"
      >
        {submitting ? (
          <LoadingSpinner size="sm" />
        ) : (
          <>
            <Send className="h-5 w-5" />
            Publier le rapport
          </>
        )}
      </button>
    </form>
  );
}
