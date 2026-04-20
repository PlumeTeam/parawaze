'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X, Search, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMarkerConfig } from '@/hooks/useMarkerConfig';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { MarkerConfig } from '@/lib/types';

const MAKI_ICONS = [
  'aerialway', 'airfield', 'airport', 'alcohol-shop', 'america-football', 'amusement-park',
  'aquarium', 'art-gallery', 'attraction', 'bakery', 'bank', 'bar', 'barrier', 'baseball',
  'basketball', 'beach', 'beer', 'bicycle', 'bicycle-share', 'blood-bank', 'bowling-alley',
  'bridge', 'building', 'building-alt1', 'bus', 'cafe', 'campsite', 'car', 'car-rental',
  'car-repair', 'casino', 'castle', 'castle-alt1', 'cemetery', 'charging-station', 'cinema',
  'circle', 'circle-stroked', 'city', 'clothing-store', 'college', 'commercial',
  'communications-tower', 'confectionery', 'construction', 'convenience', 'cricket', 'cross',
  'dam', 'danger', 'dentist', 'diamond', 'doctor', 'dog-park', 'drinking-water', 'electric',
  'elevator', 'embassy', 'emergency-phone', 'entrance', 'entrance-alt1', 'farm', 'fast-food',
  'fence', 'ferry', 'fire-station', 'fitness-centre', 'florist', 'fuel', 'furniture', 'gaming',
  'garden', 'garden-centre', 'gate', 'gift', 'globe', 'golf', 'grocery', 'hairdresser', 'harbor',
  'hardware', 'heart', 'heliport', 'highway-rest-area', 'historic', 'home', 'horse-riding',
  'hospital', 'hot-spring', 'ice-cream', 'industry', 'information', 'jewelry-store', 'karaoke',
  'landmark', 'landuse', 'laundry', 'library', 'lift-gate', 'lighthouse', 'lodging', 'logging',
  'marker', 'marker-stroked', 'mobile-phone', 'monument', 'mountain', 'museum', 'music',
  'natural', 'observation-tower', 'optician', 'paint', 'park', 'parking', 'parking-garage',
  'parking-paid', 'pharmacy', 'picnic-site', 'pitch', 'place-of-worship', 'playground',
  'police', 'post', 'prison', 'racetrack', 'racetrack-boat', 'racetrack-cycling',
  'racetrack-horse', 'rail', 'rail-light', 'rail-metro', 'ranger-station', 'recycling',
  'religious-buddhist', 'religious-christian', 'religious-jewish', 'religious-muslim',
  'religious-shinto', 'residential-community', 'restaurant', 'restaurant-bbq',
  'restaurant-noodle', 'restaurant-pizza', 'restaurant-seafood', 'restaurant-sushi',
  'road-accident', 'rocket', 'school', 'scooter', 'shelter', 'shoe', 'shop', 'skateboard',
  'skiing', 'slaughterhouse', 'slipway', 'snowmobile', 'soccer', 'square', 'square-stroked',
  'stadium', 'star', 'star-stroked', 'suitcase', 'sushi', 'swimming', 'table-tennis', 'taxi',
  'teahouse', 'telephone', 'tennis', 'theatre', 'toilet', 'toll', 'town', 'town-hall',
  'triangle', 'triangle-stroked', 'tunnel', 'veterinary', 'viewpoint', 'village', 'volcano',
  'volleyball', 'warehouse', 'waste-basket', 'watch', 'water', 'waterfall', 'watermill',
  'wetland', 'wheelchair', 'windmill', 'wine', 'zoo',
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
        value ? 'bg-sky-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function AdminMarkersPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { configs, loading: configLoading, fetchMarkerConfigs, updateMarkerConfig } = useMarkerConfig();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<MarkerConfig>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const filteredIcons = MAKI_ICONS.filter((icon) =>
    icon.toLowerCase().includes(iconSearch.toLowerCase())
  );

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));

  const sectionOpen = (key: string) => openSections[key] !== false;

  useEffect(() => {
    if (!authLoading) {
      if (!user) { router.replace('/map'); return; }
      if (profile !== null && !profile.is_admin) { router.replace('/map'); }
    }
  }, [user, profile, authLoading, router]);

  useEffect(() => {
    fetchMarkerConfigs();
  }, [fetchMarkerConfigs]);

  if (authLoading || configLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || !profile?.is_admin) return null;

  const handleEditStart = (config: MarkerConfig) => {
    setEditingId(config.id);
    setEditValues({
      color: config.color,
      icon_name: config.icon_name,
      // Stroke
      stroke_color: config.stroke_color || '#ffffff',
      stroke_width: config.stroke_width ?? 3,
      stroke_opacity: config.stroke_opacity ?? 1.0,
      show_stroke: config.show_stroke ?? true,
      circle_radius: config.circle_radius ?? 14,
      // Fill
      fill_color: config.fill_color || config.color,
      fill_opacity: config.fill_opacity ?? 0.95,
      show_fill: config.show_fill ?? true,
      // Icon
      icon_color: config.icon_color || '#FFFFFF',
      icon_size: config.icon_size ?? 1.0,
      icon_opacity: config.icon_opacity ?? 1.0,
      show_icon: config.show_icon ?? true,
      // Legacy
      show_circle: config.show_circle ?? true,
    });
    setSaveError(null);
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateMarkerConfig(id, editValues);
      setEditingId(null);
    } catch (e: any) {
      setSaveError(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const upd = <K extends keyof MarkerConfig>(field: K, value: MarkerConfig[K]) =>
    setEditValues((prev) => ({ ...prev, [field]: value }));

  const isEditing = (id: string) => editingId === id;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center gap-3 safe-area-top">
        <button
          onClick={() => router.push('/profile')}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold flex-1">Configuration des marqueurs</h1>
      </header>

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
          <p className="font-semibold mb-1">Icônes Mapbox Maki</p>
          <p className="text-xs">Personnalisez le cercle, le fond et l&apos;icône de chaque marqueur.</p>
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {saveError}
          </div>
        )}

        <div className="space-y-3">
          {configs.map((config) => {
            const ev = editValues;
            const editing = isEditing(config.id);

            const previewRadius = Math.min(editing ? (ev.circle_radius ?? 14) : (config.circle_radius ?? 14), 24);
            const previewFill = editing ? (ev.fill_color ?? config.color) : (config.fill_color ?? config.color);
            const previewStroke = editing ? (ev.stroke_color ?? '#ffffff') : (config.stroke_color ?? '#ffffff');
            const previewStrokeW = editing ? (ev.stroke_width ?? 3) : (config.stroke_width ?? 3);

            return (
              <div key={config.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: `${previewRadius * 2}px`,
                        height: `${previewRadius * 2}px`,
                        backgroundColor: previewFill,
                        borderColor: previewStroke,
                        borderWidth: `${previewStrokeW}px`,
                        borderStyle: 'solid',
                        borderRadius: '50%',
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{config.label}</h3>
                      <p className="text-xs text-gray-500">{config.marker_type}</p>
                    </div>
                  </div>
                  {editing ? (
                    <button
                      onClick={() => handleSave(config.id)}
                      disabled={saving}
                      className="px-3 py-1.5 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 active:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEditStart(config)}
                      className="px-3 py-1.5 bg-sky-500 text-white text-sm font-semibold rounded-lg hover:bg-sky-600 active:bg-sky-700 transition-colors"
                    >
                      Éditer
                    </button>
                  )}
                </div>

                {/* Edit controls */}
                {editing && (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    {/* Icon name picker */}
                    <div className="pb-1">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Icône Maki</label>
                      <button
                        onClick={() => setShowIconPicker(true)}
                        className="w-full px-3 py-2 bg-sky-50 text-sky-700 text-sm font-semibold rounded-lg border border-sky-200 hover:bg-sky-100 transition-colors"
                      >
                        {ev.icon_name || config.icon_name || 'Choisir une icône'}
                      </button>
                    </div>

                    {/* ─── Cercle (contour) ─── */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 text-sm font-bold text-gray-800"
                        onClick={() => toggleSection(`${config.id}-stroke`)}
                      >
                        Cercle (contour)
                        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${sectionOpen(`${config.id}-stroke`) ? 'rotate-180' : ''}`} />
                      </button>
                      {sectionOpen(`${config.id}-stroke`) && (
                        <div className="p-3 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Couleur</label>
                              <input
                                type="color"
                                value={ev.stroke_color ?? '#ffffff'}
                                onChange={(e) => upd('stroke_color', e.target.value)}
                                className="w-full h-10 rounded-lg border border-gray-200 cursor-pointer"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Taille: {ev.circle_radius ?? 14}px
                              </label>
                              <input
                                type="range"
                                min="4"
                                max="30"
                                step="1"
                                value={ev.circle_radius ?? 14}
                                onChange={(e) => upd('circle_radius', parseFloat(e.target.value))}
                                className="w-full mt-2"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Épaisseur: {ev.stroke_width ?? 3}px
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="8"
                                step="0.5"
                                value={ev.stroke_width ?? 3}
                                onChange={(e) => upd('stroke_width', parseFloat(e.target.value))}
                                className="w-full mt-2"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Opacité: {Math.round((ev.stroke_opacity ?? 1.0) * 100)}%
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={Math.round((ev.stroke_opacity ?? 1.0) * 100)}
                                onChange={(e) => upd('stroke_opacity', parseInt(e.target.value) / 100)}
                                className="w-full mt-2"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Toggle
                              value={ev.show_stroke ?? true}
                              onChange={(v) => upd('show_stroke', v)}
                            />
                            <span className="text-xs text-gray-600">
                              Afficher: {(ev.show_stroke ?? true) ? 'Oui' : 'Non'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ─── Fond du cercle ─── */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 text-sm font-bold text-gray-800"
                        onClick={() => toggleSection(`${config.id}-fill`)}
                      >
                        Fond du cercle
                        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${sectionOpen(`${config.id}-fill`) ? 'rotate-180' : ''}`} />
                      </button>
                      {sectionOpen(`${config.id}-fill`) && (
                        <div className="p-3 space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Couleur</label>
                            <input
                              type="color"
                              value={ev.fill_color ?? config.color}
                              onChange={(e) => upd('fill_color', e.target.value)}
                              className="w-full h-10 rounded-lg border border-gray-200 cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Opacité: {Math.round((ev.fill_opacity ?? 0.95) * 100)}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="1"
                              value={Math.round((ev.fill_opacity ?? 0.95) * 100)}
                              onChange={(e) => upd('fill_opacity', parseInt(e.target.value) / 100)}
                              className="w-full"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <Toggle
                              value={ev.show_fill ?? true}
                              onChange={(v) => upd('show_fill', v)}
                            />
                            <span className="text-xs text-gray-600">
                              Afficher: {(ev.show_fill ?? true) ? 'Oui' : 'Non'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ─── Icône (logo) ─── */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 text-sm font-bold text-gray-800"
                        onClick={() => toggleSection(`${config.id}-icon`)}
                      >
                        Icône (logo)
                        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${sectionOpen(`${config.id}-icon`) ? 'rotate-180' : ''}`} />
                      </button>
                      {sectionOpen(`${config.id}-icon`) && (
                        <div className="p-3 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Couleur</label>
                              <input
                                type="color"
                                value={ev.icon_color ?? '#ffffff'}
                                onChange={(e) => upd('icon_color', e.target.value)}
                                className="w-full h-10 rounded-lg border border-gray-200 cursor-pointer"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Taille: {(ev.icon_size ?? 1.0).toFixed(1)}x
                              </label>
                              <input
                                type="range"
                                min="0.3"
                                max="2.0"
                                step="0.1"
                                value={ev.icon_size ?? 1.0}
                                onChange={(e) => upd('icon_size', parseFloat(e.target.value))}
                                className="w-full mt-2"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Opacité: {Math.round((ev.icon_opacity ?? 1.0) * 100)}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="1"
                              value={Math.round((ev.icon_opacity ?? 1.0) * 100)}
                              onChange={(e) => upd('icon_opacity', parseInt(e.target.value) / 100)}
                              className="w-full"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <Toggle
                              value={ev.show_icon ?? true}
                              onChange={(v) => upd('show_icon', v)}
                            />
                            <span className="text-xs text-gray-600">
                              Afficher: {(ev.show_icon ?? true) ? 'Oui' : 'Non'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Display mode summary */}
                {!editing && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 pt-1">
                    <div>
                      <span className="font-semibold">Icône:</span> {config.icon_name || 'Aucune'}
                    </div>
                    <div>
                      <span className="font-semibold">Rayon:</span> {config.circle_radius ?? 14}px
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">Fond:</span>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 12,
                          height: 12,
                          borderRadius: 2,
                          backgroundColor: config.fill_color ?? config.color,
                          border: '1px solid #d1d5db',
                          verticalAlign: 'middle',
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">Contour:</span>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 12,
                          height: 12,
                          borderRadius: 2,
                          backgroundColor: config.stroke_color,
                          border: '1px solid #d1d5db',
                          verticalAlign: 'middle',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />

      {/* Icon Picker Modal */}
      {showIconPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl shadow-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-bold">Choisir une icône Maki</h2>
              <button
                onClick={() => { setShowIconPicker(false); setIconSearch(''); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-200 sticky top-12 bg-white">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                <Search className="h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Rechercher une icône..."
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="grid grid-cols-5 gap-3">
                {filteredIcons.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => {
                      upd('icon_name', icon);
                      setShowIconPicker(false);
                      setIconSearch('');
                    }}
                    className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-sky-50 hover:border-sky-300 transition-colors gap-1"
                    title={icon}
                  >
                    <img
                      src={`https://raw.githubusercontent.com/mapbox/maki/main/icons/${icon}.svg`}
                      alt={icon}
                      className="h-6 w-6"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="text-xs text-center break-words">{icon}</span>
                  </button>
                ))}
              </div>
              {filteredIcons.length === 0 && (
                <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                  Aucune icône trouvée
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
