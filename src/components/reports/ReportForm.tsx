'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, MapPin, Send, X, Plus, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useReports } from '@/hooks/useReports';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { WIND_DIRECTIONS, WIND_DIRECTION_LABELS, REPORT_TYPE_LABELS } from '@/utils/constants';
import type { ReportType, WindDirection, CreateReportInput, ForecastScenario, WeatherReport } from '@/lib/types';

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

// ──────────────────────────────────────────────
// Reusable labeled slider component
// ──────────────────────────────────────────────
interface LabeledSliderProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  labels: Record<number, string>;
  gradient: string; // Tailwind gradient classes
  unit?: string;
}

function LabeledSlider({ value, onChange, min = 1, max = 5, step = 1, labels, gradient, unit }: LabeledSliderProps) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Track background */}
        <div className={`w-full h-2.5 rounded-full ${gradient}`} />
        {/* Range input overlaid */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-2.5 appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-300
            [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-gray-300"
        />
      </div>
      {/* Current value label */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-800">
          {labels[value] || value}{unit ? ` ${unit}` : ''}
        </span>
        <span className="text-xs text-gray-400">{value}/{max}</span>
      </div>
      {/* Tick labels */}
      <div className="flex justify-between px-0.5">
        {Object.entries(labels).map(([k, label]) => (
          <span
            key={k}
            className={`text-[10px] leading-tight text-center max-w-[60px] ${
              Number(k) === value ? 'text-gray-800 font-semibold' : 'text-gray-400'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Interactive compass wheel component
// ──────────────────────────────────────────────
interface CompassWheelProps {
  value: WindDirection | '';
  onChange: (dir: WindDirection) => void;
  variability: string;
  onVariabilityChange: (v: string) => void;
}

const COMPASS_DIRS: { dir: WindDirection; angle: number; label: string }[] = [
  { dir: 'N', angle: 0, label: 'N' },
  { dir: 'NE', angle: 45, label: 'NE' },
  { dir: 'E', angle: 90, label: 'E' },
  { dir: 'SE', angle: 135, label: 'SE' },
  { dir: 'S', angle: 180, label: 'S' },
  { dir: 'SW', angle: 225, label: 'SW' },
  { dir: 'W', angle: 270, label: 'W' },
  { dir: 'NW', angle: 315, label: 'NW' },
];

function CompassWheel({ value, onChange, variability, onVariabilityChange }: CompassWheelProps) {
  const SIZE = 140;
  const CENTER = SIZE / 2;
  const RADIUS = 54;
  const DOT_RADIUS = 8;

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - rect.left - CENTER;
    const dy = e.clientY - rect.top - CENTER;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 15) return; // ignore clicks near center
    const angle = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
    const idx = Math.round(angle / 45) % 8;
    onChange(COMPASS_DIRS[idx].dir);
  }, [onChange]);

  // Get angle for current selection
  const selectedAngle = value && value !== 'variable'
    ? COMPASS_DIRS.find(d => d.dir === value)?.angle ?? null
    : null;

  // Variability cone half-angle
  const varAngle = parseInt(variability) || 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="cursor-pointer select-none"
        onClick={handleClick}
      >
        {/* Outer circle */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 8} fill="none" stroke="#e5e7eb" strokeWidth={1.5} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="#f9fafb" stroke="#d1d5db" strokeWidth={1} />

        {/* Variability cone */}
        {selectedAngle !== null && varAngle > 0 && (() => {
          const startA = ((selectedAngle - varAngle) * Math.PI) / 180;
          const endA = ((selectedAngle + varAngle) * Math.PI) / 180;
          const x1 = CENTER + RADIUS * Math.sin(startA);
          const y1 = CENTER - RADIUS * Math.cos(startA);
          const x2 = CENTER + RADIUS * Math.sin(endA);
          const y2 = CENTER - RADIUS * Math.cos(endA);
          const largeArc = varAngle * 2 > 180 ? 1 : 0;
          return (
            <path
              d={`M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill="rgba(56, 189, 248, 0.15)"
              stroke="rgba(56, 189, 248, 0.4)"
              strokeWidth={1}
            />
          );
        })()}

        {/* Direction line from center */}
        {selectedAngle !== null && (
          <line
            x1={CENTER}
            y1={CENTER}
            x2={CENTER + RADIUS * Math.sin((selectedAngle * Math.PI) / 180)}
            y2={CENTER - RADIUS * Math.cos((selectedAngle * Math.PI) / 180)}
            stroke="#0ea5e9"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}

        {/* Direction labels around the compass */}
        {COMPASS_DIRS.map(({ dir, angle, label }) => {
          const r = RADIUS + 16;
          const x = CENTER + r * Math.sin((angle * Math.PI) / 180);
          const y = CENTER - r * Math.cos((angle * Math.PI) / 180);
          const isSelected = value === dir;
          return (
            <text
              key={dir}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className={`text-[11px] font-semibold select-none ${
                isSelected ? 'fill-sky-600' : 'fill-gray-400'
              }`}
            >
              {label}
            </text>
          );
        })}

        {/* Selected dot on rim */}
        {selectedAngle !== null && (
          <circle
            cx={CENTER + RADIUS * Math.sin((selectedAngle * Math.PI) / 180)}
            cy={CENTER - RADIUS * Math.cos((selectedAngle * Math.PI) / 180)}
            r={DOT_RADIUS}
            fill="#0ea5e9"
            stroke="white"
            strokeWidth={2}
          />
        )}

        {/* Center dot */}
        <circle cx={CENTER} cy={CENTER} r={4} fill="#9ca3af" />
      </svg>

      {/* Direction display + Variable button */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700 min-w-[40px] text-center">
          {value ? (value === 'variable' ? 'VAR' : value) : '—'}
        </span>
        <button
          type="button"
          onClick={() => onChange('variable')}
          className={`text-xs px-3 py-1.5 rounded-full transition-all font-medium ${
            value === 'variable'
              ? 'bg-sky-500 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          Variable
        </button>
      </div>

      {/* Variability selector */}
      {value && value !== 'variable' && (
        <select
          value={variability}
          onChange={(e) => onVariabilityChange(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600"
        >
          <option value="0">Stable</option>
          <option value="15">Variable ±15°</option>
          <option value="30">Variable ±30°</option>
          <option value="45">Variable ±45°</option>
          <option value="90">Variable ±90°</option>
        </select>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Slider label constants
// ──────────────────────────────────────────────
const THERMAL_LABELS: Record<number, string> = {
  1: 'Faible (<1 m/s)',
  2: 'Modéré (1-3)',
  3: 'Bon (3-5)',
  4: 'Fort (5-10)',
  5: 'Très fort (>10)',
};

const TURBULENCE_LABELS: Record<number, string> = {
  1: 'Aucune',
  2: 'Légère',
  3: 'Modérée',
  4: 'Forte',
  5: 'Extrême',
};

const FLYABILITY_LABELS: Record<number, string> = {
  1: 'Dangereux',
  2: 'Difficile',
  3: 'Moyen',
  4: 'Bon',
  5: 'Excellent',
};

// ──────────────────────────────────────────────
// Main form component
// ──────────────────────────────────────────────
interface ReportFormProps {
  initialData?: WeatherReport;
  reportId?: string;
}

export default function ReportForm({ initialData, reportId }: ReportFormProps) {
  const isEditMode = !!initialData && !!reportId;
  const { user } = useAuth();
  const { createReport, updateReport, uploadImage } = useReports();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);

  // Read lat/lng/alt from query params (passed from map marker) or from initialData
  const paramLat = searchParams.get('lat');
  const paramLng = searchParams.get('lng');
  const paramAlt = searchParams.get('alt');
  const editLat = initialData?.location?.coordinates?.[1] ?? null;
  const editLng = initialData?.location?.coordinates?.[0] ?? null;
  const editAlt = initialData?.altitude_m ?? null;
  const hasMapCoords = isEditMode ? (editLat !== null && editLng !== null) : (paramLat !== null && paramLng !== null);
  const mapLat = isEditMode ? editLat : (hasMapCoords ? parseFloat(paramLat!) : null);
  const mapLng = isEditMode ? editLng : (hasMapCoords ? parseFloat(paramLng!) : null);
  const mapAlt = isEditMode ? editAlt : (paramAlt !== null ? parseInt(paramAlt) : null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state — pre-filled from initialData when editing
  const [reportType, setReportType] = useState<ReportType>(initialData?.report_type || 'observation');
  const [locationName, setLocationName] = useState(initialData?.location_name || '');
  const [altitudeM, setAltitudeM] = useState(initialData?.altitude_m ? String(initialData.altitude_m) : (mapAlt !== null ? String(mapAlt) : ''));
  const [altAutoFilled] = useState(mapAlt !== null && !isEditMode);
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [windSpeed, setWindSpeed] = useState(initialData?.wind_speed_kmh != null ? String(initialData.wind_speed_kmh) : '');
  const [windGust, setWindGust] = useState(initialData?.wind_gust_kmh != null ? String(initialData.wind_gust_kmh) : '');
  const [windDirection, setWindDirection] = useState<WindDirection | ''>(initialData?.wind_direction || '');
  const [windVariability, setWindVariability] = useState('0');
  const [temperature, setTemperature] = useState(initialData?.temperature_c != null ? String(initialData.temperature_c) : '');
  const [cloudCeiling, setCloudCeiling] = useState(initialData?.cloud_ceiling_m != null ? String(initialData.cloud_ceiling_m) : '');
  const [visibilityKm, setVisibilityKm] = useState(initialData?.visibility_km != null ? String(initialData.visibility_km) : '');
  const [thermalQuality, setThermalQuality] = useState(initialData?.thermal_quality || 3);
  const [turbulenceLevel, setTurbulenceLevel] = useState(initialData?.turbulence_level || 1);
  const [flyabilityScore, setFlyabilityScore] = useState(initialData?.flyability_score || 3);
  // Track which sliders the user has actually touched
  const initTouched = new Set<string>();
  if (initialData?.thermal_quality) initTouched.add('thermal_quality');
  if (initialData?.turbulence_level) initTouched.add('turbulence_level');
  if (initialData?.flyability_score) initTouched.add('flyability_score');
  const [touchedFields, setTouchedFields] = useState<Set<string>>(initTouched);
  const markTouched = (field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
  };

  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Forecast-specific state
  const [forecastDate, setForecastDate] = useState<string>(initialData?.forecast_date || '');
  const [forecastDateMode, setForecastDateMode] = useState<'today' | 'tomorrow' | 'after' | 'custom'>(initialData?.forecast_date ? 'custom' : 'today');
  const [scenarios, setScenarios] = useState<ScenarioInput[]>(
    initialData?.forecast_scenarios?.map((s) => ({
      hour_slot: s.hour_slot,
      wind_speed_kmh: s.wind_speed_kmh != null ? String(s.wind_speed_kmh) : '',
      wind_gust_kmh: s.wind_gust_kmh != null ? String(s.wind_gust_kmh) : '',
      wind_direction: s.wind_direction || '' as WindDirection | '',
      turbulence_level: s.turbulence_level || 0,
      thermal_quality: s.thermal_quality || 0,
      flyability_score: s.flyability_score || 0,
      description: s.description || '',
    })) || []
  );

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
    setPreviews(newImages.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (idx: number) => {
    const newImages = images.filter((_, i) => i !== idx);
    setImages(newImages);
    setPreviews(newImages.map((f) => URL.createObjectURL(f)));
  };

  const formatCoord = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}\u00B0 ${latDir}, ${Math.abs(lng).toFixed(4)}\u00B0 ${lngDir}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!hasMapCoords) {
      setError('Position manquante. Retournez sur la carte et utilisez le bouton Signaler.');
      return;
    }

    // Validation: at least one weather data field must be set
    const hasWeatherData =
      !!windSpeed ||
      !!windDirection ||
      touchedFields.has('thermal_quality') ||
      touchedFields.has('turbulence_level') ||
      touchedFields.has('flyability_score') ||
      !!temperature ||
      !!description.trim() ||
      images.length > 0;

    if (reportType === 'observation' && !hasWeatherData) {
      setError('Remplissez au moins un champ météo ou ajoutez une description/photo.');
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
        thermal_quality: touchedFields.has('thermal_quality') ? thermalQuality : undefined,
        turbulence_level: touchedFields.has('turbulence_level') ? turbulenceLevel : undefined,
        flyability_score: touchedFields.has('flyability_score') ? flyabilityScore : undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
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

      if (isEditMode) {
        await updateReport(reportId!, input);
        if (images.length > 0) {
          for (let i = 0; i < images.length; i++) {
            await uploadImage(reportId!, images[i], i);
          }
        }
        router.push(`/report/${reportId}`);
      } else {
        const report: any = await createReport(input, user.id);
        if (report?.id && images.length > 0) {
          for (let i = 0; i < images.length; i++) {
            await uploadImage(report.id, images[i], i);
          }
        }
        router.push('/map');
      }
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
            Date de la prévision
          </label>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {([
              { key: 'today' as const, label: "Aujourd'hui" },
              { key: 'tomorrow' as const, label: 'Demain' },
              { key: 'after' as const, label: 'Après-demain' },
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

      {/* Location name — only for forecast type */}
      {reportType === 'forecast' && (
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
      )}

      {/* Altitude */}
      <div>
        <div className="flex items-baseline gap-2 mb-2">
          <label className="text-sm font-semibold text-gray-700">Altitude (m)</label>
          {altAutoFilled && (
            <span className="text-[10px] text-sky-500 font-medium bg-sky-50 px-1.5 py-0.5 rounded">Auto-détectée</span>
          )}
        </div>
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
          <p className="text-sm font-semibold text-sky-700">Prévision générale de la journée</p>
          <p className="text-xs text-sky-500 mt-0.5">Remplissez les champs ci-dessous pour la tendance globale</p>
        </div>
      )}

      {/* Wind, weather & ratings (not for image_share) */}
      {reportType !== 'image_share' && (
        <>
          {/* Wind speed & gust */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Vent (km/h)</label>
              <input
                type="number"
                value={windSpeed}
                onChange={(e) => setWindSpeed(e.target.value)}
                placeholder="15"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Rafales (km/h)</label>
              <input
                type="number"
                value={windGust}
                onChange={(e) => setWindGust(e.target.value)}
                placeholder="25"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
              />
            </div>
          </div>

          {/* Wind direction — Interactive compass */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Direction du vent</label>
            <CompassWheel
              value={windDirection}
              onChange={setWindDirection}
              variability={windVariability}
              onVariabilityChange={setWindVariability}
            />
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Température (°C)</label>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Plafond nuageux (m)</label>
              <input
                type="number"
                value={cloudCeiling}
                onChange={(e) => setCloudCeiling(e.target.value)}
                placeholder="2500"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Visibilité (km)</label>
              <input
                type="number"
                value={visibilityKm}
                onChange={(e) => setVisibilityKm(e.target.value)}
                placeholder="30"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
              />
            </div>
          </div>

          {/* ── Sliders ── */}
          <div className="space-y-5">
            {/* Thermal power */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Puissance des thermiques</label>
              <LabeledSlider
                value={thermalQuality}
                onChange={(v) => { setThermalQuality(v); markTouched('thermal_quality'); }}
                labels={THERMAL_LABELS}
                gradient="bg-gradient-to-r from-gray-300 via-green-400 via-orange-400 to-red-500"
              />
            </div>

            {/* Turbulence */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Turbulences</label>
              <LabeledSlider
                value={turbulenceLevel}
                onChange={(v) => { setTurbulenceLevel(v); markTouched('turbulence_level'); }}
                labels={TURBULENCE_LABELS}
                gradient="bg-gradient-to-r from-green-400 via-yellow-400 via-orange-400 to-red-500"
              />
            </div>

            {/* Flyability score */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Score de volabilité</label>
              <LabeledSlider
                value={flyabilityScore}
                onChange={(v) => { setFlyabilityScore(v); markTouched('flyability_score'); }}
                labels={FLYABILITY_LABELS}
                gradient="bg-gradient-to-r from-red-500 via-orange-400 via-yellow-400 to-green-500"
              />
            </div>
          </div>
        </>
      )}

      {/* Hourly scenarios (only for forecast type) */}
      {reportType === 'forecast' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700">
              Scénarios par tranche horaire (optionnel)
            </label>
          </div>

          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-gray-400 self-center">Ajouter :</span>
            {[
              { label: 'Matin (10h)', hour: '10:00' },
              { label: 'Midi (12h)', hour: '12:00' },
              { label: 'Après-midi (15h)', hour: '15:00' },
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
                  <label className="text-xs text-gray-500">Volabilité</label>
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
                  placeholder="Conditions prévues..."
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
            Ajouter un créneau
          </button>
        </div>
      )}

      {/* Title (optional) */}
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

      {/* Description (optional) */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Description (optionnel)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Décrivez les conditions..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm resize-none"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Tags (séparés par des virgules)
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
        <label className="block text-sm font-semibold text-gray-700 mb-2">Photos (max 5)</label>
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
            {isEditMode ? 'Mettre à jour' : 'Publier l\'observation'}
          </>
        )}
      </button>
    </form>
  );
}
