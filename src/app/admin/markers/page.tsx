'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMarkerConfig } from '@/hooks/useMarkerConfig';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { MarkerConfig } from '@/lib/types';

export default function AdminMarkersPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { configs, loading: configLoading, fetchMarkerConfigs, updateMarkerConfig } = useMarkerConfig();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<MarkerConfig>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();

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
      icon_unicode: config.icon_unicode,
      size: config.size,
      stroke_color: config.stroke_color,
      stroke_width: config.stroke_width,
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
          <p className="font-semibold mb-1">Icônes Mapbox</p>
          <p className="text-xs mb-2">Pour utiliser les icônes Mapbox intégrées (maki-icons), consultez:</p>
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

                  {/* Icon unicode */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Icône (caractère Unicode)
                    </label>
                    <input
                      type="text"
                      value={editValues.icon_unicode || config.icon_unicode || ''}
                      onChange={(e) =>
                        setEditValues({ ...editValues, icon_unicode: e.target.value || null })
                      }
                      maxLength={2}
                      placeholder="Ex: ▶, ●, 📷"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-lg font-semibold focus:ring-2 focus:ring-sky-500 focus:border-transparent mb-2"
                    />
                    <div className="text-xs text-gray-600 mb-2">
                      Cliquez sur une icône pour la sélectionner:
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {['▶', '●', '■', '★', '✚', '⚑', '⛺', '⛰', '🪂', '🎯', '🏁', '📍', '📷', '🎥', '⚠', '☁', '⛅', '☀', '🌤', '🌬'].map((icon) => (
                        <button
                          key={icon}
                          onClick={() => setEditValues({ ...editValues, icon_unicode: icon })}
                          className="p-2 border border-gray-200 rounded-lg hover:bg-sky-50 active:bg-sky-100 transition-colors text-lg font-semibold"
                          title={icon}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
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
                    <span className="font-semibold">Icône:</span> {config.icon_unicode}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
