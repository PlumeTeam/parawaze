'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, X, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMarkerConfig } from '@/hooks/useMarkerConfig';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { MarkerConfig } from '@/lib/types';

// Full Maki v8 icon list (base names without -15 suffix)
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
  'wetland', 'wheelchair', 'windmill', 'wine', 'zoo'
];

export default function AdminMarkersPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { configs, loading: configLoading, fetchMarkerConfigs, updateMarkerConfig } = useMarkerConfig();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<MarkerConfig>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const router = useRouter();

  const filteredIcons = MAKI_ICONS.filter((icon) =>
    icon.toLowerCase().includes(iconSearch.toLowerCase())
  );

  useEffect(() => {
    // Only redirect after we know profile has been loaded
    if (!authLoading) {
      // No user at all
      if (!user) {
        router.replace('/map');
        return;
      }
      // User exists but profile is loaded and is_admin is false
      if (profile !== null && !profile.is_admin) {
        router.replace('/map');
      }
      // If profile is null/undefined, wait for it to load
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
      size: config.size,
      stroke_color: config.stroke_color,
      stroke_width: config.stroke_width,
      show_circle: config.show_circle ?? true,
      icon_color: config.icon_color || '#FFFFFF',
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

  const isEditing = (id: string) => editingId === id;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
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
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
          <p className="font-semibold mb-1">Icônes Mapbox Maki</p>
          <p className="text-xs mb-2">Utilise les icônes Mapbox Maki v8. Chaque marqueur peut avoir sa propre icône.</p>
          <a
            href="https://labs.mapbox.com/maki-icons/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline text-xs"
          >
            Voir toutes les icônes →
          </a>
        </div>

        {/* Error message */}
        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {saveError}
          </div>
        )}

        {/* Marker configs list */}
        <div className="space-y-3">
          {configs.map((config) => (
            <div
              key={config.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3"
            >
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Preview circle */}
                  <div
                    style={{
                      width: `${(editValues.size || config.size) * 2}px`,
                      height: `${(editValues.size || config.size) * 2}px`,
                      backgroundColor: editValues.color || config.color,
                      borderColor: editValues.stroke_color || config.stroke_color,
                      borderWidth: `${editValues.stroke_width ?? config.stroke_width}px`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '12px' }}>
                      {editValues.icon_unicode || config.icon_unicode}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{config.label}</h3>
                    <p className="text-xs text-gray-500">{config.marker_type}</p>
                  </div>
                </div>

                {isEditing(config.id) ? (
                  <button
                    onClick={() => handleSave(config.id)}
                    disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 active:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Enregistrement...' : 'Sauvegarder'}
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
              {isEditing(config.id) && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  {/* Color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Couleur
                      </label>
                      <input
                        type="color"
                        value={editValues.color || config.color}
                        onChange={(e) =>
                          setEditValues({ ...editValues, color: e.target.value })
                        }
                        className="w-full h-10 rounded-lg border border-gray-200 cursor-pointer"
                      />
                    </div>

                    {/* Size */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Taille: {editValues.size ?? config.size}
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        value={editValues.size ?? config.size}
                        onChange={(e) =>
                          setEditValues({ ...editValues, size: parseInt(e.target.value) })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Icon picker */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Icône Mapbox Maki
                    </label>
                    <button
                      onClick={() => setShowIconPicker(true)}
                      className="w-full px-3 py-2 bg-sky-100 text-sky-700 text-sm font-semibold rounded-lg border border-sky-300 hover:bg-sky-200 transition-colors"
                    >
                      {editValues.icon_name || config.icon_name || 'Choisir une icône'}
                    </button>
                  </div>

                  {/* Stroke color and width */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Couleur contour
                      </label>
                      <input
                        type="color"
                        value={editValues.stroke_color || config.stroke_color}
                        onChange={(e) =>
                          setEditValues({ ...editValues, stroke_color: e.target.value })
                        }
                        className="w-full h-10 rounded-lg border border-gray-200 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Épaisseur contour: {editValues.stroke_width ?? config.stroke_width}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.5"
                        value={editValues.stroke_width ?? config.stroke_width}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            stroke_width: parseFloat(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Circle visibility and icon color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Afficher le cercle
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setEditValues({
                            ...editValues,
                            show_circle: !(editValues.show_circle ?? true),
                          })
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          (editValues.show_circle ?? true) ? 'bg-sky-500' : 'bg-gray-300'
                        }`}
                        aria-pressed={editValues.show_circle ?? true}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            (editValues.show_circle ?? true) ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="ml-2 text-xs text-gray-600">
                        {(editValues.show_circle ?? true) ? 'Oui' : 'Non'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Couleur de l&apos;icône
                      </label>
                      <input
                        type="color"
                        value={editValues.icon_color || '#FFFFFF'}
                        onChange={(e) =>
                          setEditValues({ ...editValues, icon_color: e.target.value })
                        }
                        className="w-full h-10 rounded-lg border border-gray-200 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Display mode */}
              {!isEditing(config.id) && (
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 pt-2">
                  <div>
                    <span className="font-semibold">Couleur:</span> {config.color}
                  </div>
                  <div>
                    <span className="font-semibold">Taille:</span> {config.size}
                  </div>
                  <div>
                    <span className="font-semibold">Icône:</span> {config.icon_name || 'Aucune'}
                  </div>
                  <div>
                    <span className="font-semibold">Cercle:</span>{' '}
                    {(config.show_circle ?? true) ? 'Affiché' : 'Masqué'}
                  </div>
                  <div>
                    <span className="font-semibold">Couleur icône:</span>{' '}
                    <span
                      style={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor: config.icon_color || '#FFFFFF',
                        border: '1px solid #d1d5db',
                        verticalAlign: 'middle',
                        marginRight: 2,
                      }}
                    />
                    {config.icon_color || '#FFFFFF'}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <BottomNav />

      {/* Icon Picker Modal */}
      {showIconPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl shadow-lg max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-bold">Choisir une icône Maki</h2>
              <button
                onClick={() => {
                  setShowIconPicker(false);
                  setIconSearch('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
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

            {/* Icon Grid */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="grid grid-cols-5 gap-3">
                {filteredIcons.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => {
                      setEditValues({ ...editValues, icon_name: icon });
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
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
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
