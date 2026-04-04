'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, MapPin, Send, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useReports } from '@/hooks/useReports';
import { useLocation } from '@/hooks/useLocation';
import StarRating from '@/components/shared/StarRating';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { WIND_DIRECTIONS, WIND_DIRECTION_LABELS, REPORT_TYPE_LABELS } from '@/utils/constants';
import type { ReportType, WindDirection, CreateReportInput } from '@/lib/types';

export default function ReportForm() {
  const { user } = useAuth();
  const { createReport, uploadImage } = useReports();
  const { location, requestLocation, loading: locLoading } = useLocation();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [reportType, setReportType] = useState<ReportType>('observation');
  const [locationName, setLocationName] = useState('');
  const [shareLocation, setShareLocation] = useState(true);
  const [altitudeM, setAltitudeM] = useState('');
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

  const handleLocationRequest = async () => {
    await requestLocation();
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!locationName.trim()) {
      setError('Veuillez indiquer un nom de lieu');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const input: CreateReportInput = {
        report_type: reportType,
        location_name: locationName.trim(),
        share_location: shareLocation,
        latitude: location?.latitude,
        longitude: location?.longitude,
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
              onClick={() => setReportType(type)}
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

      {/* Location */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Lieu</label>
        <input
          type="text"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder="Ex: Col de la Forclaz, Annecy"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
        />

        <div className="flex items-center justify-between mt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shareLocation}
              onChange={(e) => setShareLocation(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-500"
            />
            <span className="text-sm text-gray-600">Partager ma position GPS</span>
          </label>
          <button
            type="button"
            onClick={handleLocationRequest}
            disabled={locLoading}
            className="flex items-center gap-1 text-sm text-sky-500 font-medium"
          >
            <MapPin className="h-4 w-4" />
            {locLoading ? 'Localisation...' : location ? 'Localise' : 'Localiser'}
          </button>
        </div>
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
        disabled={submitting}
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
