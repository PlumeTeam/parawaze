'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Star, ExternalLink, MapPin, Mountain, Wind, Shield, User, Pencil, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Send, MessageCircle, History, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePois } from '@/hooks/usePois';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { MAPBOX_TOKEN, MAP_STYLES } from '@/lib/mapbox';
import type { Poi, PoiType, PoiEdit, PoiComment } from '@/lib/types';

const POI_TYPE_CONFIG: Record<PoiType, { label: string; emoji: string; color: string; bgColor: string }> = {
  landing: { label: 'Atterrissage', emoji: 'A', color: 'text-green-600', bgColor: 'bg-green-100' },
  takeoff: { label: 'D\u00e9collage', emoji: 'D', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  weather_station: { label: 'Balise m\u00e9t\u00e9o', emoji: 'M', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  webcam: { label: 'Webcam', emoji: 'W', color: 'text-purple-600', bgColor: 'bg-purple-100' },
};

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  easy: { label: 'Facile', color: 'bg-green-100 text-green-700' },
  moderate: { label: 'Mod\u00e9r\u00e9', color: 'bg-yellow-100 text-yellow-700' },
  difficult: { label: 'Difficile', color: 'bg-orange-100 text-orange-700' },
  expert: { label: 'Expert', color: 'bg-red-100 text-red-700' },
};

const FIELD_LABELS: Record<string, string> = {
  location_name: 'Nom',
  description: 'Description',
  wind_orientations: 'Orientations vent',
  difficulty: 'Difficult\u00e9',
  ffvl_approved: 'Homologation FFVL',
  position: 'Position GPS',
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `il y a ${diffD}j`;
  return date.toLocaleDateString('fr-FR');
}

function VotingStars({
  currentRating,
  userVote,
  onVote,
  totalVotes,
}: {
  currentRating: number;
  userVote: number | null;
  onVote: (rating: number) => void;
  totalVotes: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayVotes = totalVotes > 11 ? totalVotes - 11 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = hovered !== null ? i <= hovered : i <= Math.round(currentRating);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onVote(i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={`h-7 w-7 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
              />
            </button>
          );
        })}
        <span className="text-sm text-gray-600 ml-2">
          {currentRating.toFixed(1)} / 5
        </span>
      </div>
      <p className="text-xs text-gray-500">
        {displayVotes} vote{displayVotes !== 1 ? 's' : ''}
        {userVote !== null && (
          <span className="ml-2 text-sky-500">
            (votre note : {userVote}/5)
          </span>
        )}
      </p>
    </div>
  );
}

// === Inline Edit Form ===
function InlineEditField({
  fieldName,
  label,
  currentValue,
  onSave,
  type = 'text',
}: {
  fieldName: string;
  label: string;
  currentValue: string;
  onSave: (fieldName: string, oldValue: string, newValue: string, reason: string) => Promise<void>;
  type?: 'text' | 'textarea' | 'select';
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentValue);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (value === currentValue) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(fieldName, currentValue, value, reason);
      setEditing(false);
      setReason('');
    } catch (err) {
      console.error('Edit save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="p-1 rounded hover:bg-gray-100 transition-colors group"
        title={`Modifier ${label}`}
      >
        <Pencil className="h-3.5 w-3.5 text-gray-400 group-hover:text-sky-500" />
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 bg-sky-50 rounded-lg p-3 border border-sky-200">
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
          rows={3}
        />
      ) : type === 'select' && fieldName === 'difficulty' ? (
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
        >
          <option value="">Non d&eacute;finie</option>
          <option value="easy">Facile</option>
          <option value="moderate">Mod&eacute;r&eacute;</option>
          <option value="difficult">Difficile</option>
          <option value="expert">Expert</option>
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      )}
      <input
        type="text"
        placeholder="Raison de la modification (optionnel)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full text-xs border border-gray-200 rounded-lg p-2 text-gray-500"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 bg-sky-500 text-white text-xs font-medium rounded-lg hover:bg-sky-600 disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          onClick={() => { setEditing(false); setValue(currentValue); setReason(''); }}
          className="px-3 py-1.5 bg-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-300"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

// === Edit History Section ===
function EditHistorySection({ edits, onVote }: { edits: PoiEdit[]; onVote: (editId: string, voteType: 'up' | 'down') => void }) {
  const [expanded, setExpanded] = useState(false);

  if (edits.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <History className="h-4 w-4" />
          Historique des modifications ({edits.length})
        </h3>
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {edits.map((edit) => {
            const authorName = edit.profiles?.display_name || edit.profiles?.username || 'Utilisateur';
            const fieldLabel = FIELD_LABELS[edit.field_name] || edit.field_name;
            return (
              <div
                key={edit.id}
                className={`p-3 rounded-lg border ${edit.is_reverted ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${edit.is_reverted ? 'text-red-600 line-through' : 'text-gray-700'}`}>
                      <span className="font-medium">@{authorName}</span> a modifi&eacute; <span className="font-medium">{fieldLabel}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(edit.created_at)}</p>
                    {/* Diff display */}
                    <div className="mt-1.5 text-xs space-y-0.5">
                      {edit.old_value && (
                        <p className="text-red-500"><span className="select-none">- </span><span className="line-through">{edit.old_value.length > 80 ? edit.old_value.slice(0, 80) + '...' : edit.old_value}</span></p>
                      )}
                      {edit.new_value && (
                        <p className="text-green-600"><span className="select-none">+ </span>{edit.new_value.length > 80 ? edit.new_value.slice(0, 80) + '...' : edit.new_value}</p>
                      )}
                    </div>
                    {edit.reason && (
                      <p className="text-xs text-gray-400 mt-1 italic">&laquo; {edit.reason} &raquo;</p>
                    )}
                    {edit.is_reverted && (
                      <p className="text-xs text-red-500 font-medium mt-1">Annul&eacute; par la communaut&eacute;</p>
                    )}
                  </div>
                  {/* Vote buttons */}
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button onClick={() => onVote(edit.id, 'up')} className="p-1 rounded hover:bg-green-100 transition-colors">
                      <ThumbsUp className="h-3.5 w-3.5 text-gray-400 hover:text-green-600" />
                    </button>
                    <span className="text-xs text-gray-500 min-w-[24px] text-center">
                      {edit.upvotes - edit.downvotes}
                    </span>
                    <button onClick={() => onVote(edit.id, 'down')} className="p-1 rounded hover:bg-red-100 transition-colors">
                      <ThumbsDown className="h-3.5 w-3.5 text-gray-400 hover:text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// === Comments Section ===
function CommentsSection({
  comments,
  onAddComment,
  onVote,
}: {
  comments: PoiComment[];
  onAddComment: (content: string) => Promise<void>;
  onVote: (commentId: string, voteType: 'up' | 'down') => void;
}) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Hide comments with downvotes > upvotes + 5
  const visibleComments = comments.filter((c) => !(c.downvotes > c.upvotes + 5));

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
        <MessageCircle className="h-4 w-4" />
        Commentaires de la communaut&eacute; ({visibleComments.length})
      </h3>

      {/* Add comment */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Ajouter un commentaire..."
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
        <button
          onClick={handleSubmit}
          disabled={!newComment.trim() || submitting}
          className="p-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Comments list */}
      <div className="space-y-3">
        {visibleComments.map((comment) => {
          const authorName = comment.profiles?.display_name || comment.profiles?.username || 'Anonyme';
          const score = comment.upvotes - comment.downvotes;
          return (
            <div key={comment.id} className="flex gap-3">
              {/* Vote arrows (Reddit-style) */}
              <div className="flex flex-col items-center gap-0.5 pt-1">
                <button onClick={() => onVote(comment.id, 'up')} className="p-0.5 rounded hover:bg-green-100 transition-colors">
                  <ThumbsUp className="h-3.5 w-3.5 text-gray-400 hover:text-green-600" />
                </button>
                <span className={`text-xs font-medium min-w-[20px] text-center ${score > 0 ? 'text-green-600' : score < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {score}
                </span>
                <button onClick={() => onVote(comment.id, 'down')} className="p-0.5 rounded hover:bg-red-100 transition-colors">
                  <ThumbsDown className="h-3.5 w-3.5 text-gray-400 hover:text-red-600" />
                </button>
              </div>
              {/* Comment card */}
              <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {comment.profiles?.avatar_url ? (
                      <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{authorName}</span>
                  <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600">{comment.content}</p>
              </div>
            </div>
          );
        })}
        {visibleComments.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-3">Aucun commentaire pour le moment</p>
        )}
      </div>
    </div>
  );
}

// === Position Edit Modal ===
function PositionEditModal({
  poi,
  isAdmin,
  onSave,
  onClose,
}: {
  poi: Poi;
  isAdmin: boolean;
  onSave: (newLat: number, newLng: number) => Promise<void>;
  onClose: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const initialCoords = poi.location?.coordinates; // [lng, lat]
  const [newCoords, setNewCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || !initialCoords) return;
    let cancelled = false;

    const init = async () => {
      if (!document.querySelector('link[href*="mapbox-gl"]')) {
        await new Promise<void>((resolve) => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css';
          link.onload = () => resolve();
          link.onerror = () => resolve();
          document.head.appendChild(link);
        });
      }
      const mb = (await import('mapbox-gl')).default;
      if (cancelled) return;
      mb.accessToken = MAPBOX_TOKEN;

      const map = new mb.Map({
        container: mapContainerRef.current!,
        style: MAP_STYLES.satellite,
        center: [initialCoords[0], initialCoords[1]],
        zoom: 14,
        attributionControl: false,
      });

      map.on('load', () => {
        if (cancelled) return;
        map.resize();
        const marker = new mb.Marker({ color: '#0EA5E9', draggable: true })
          .setLngLat([initialCoords[0], initialCoords[1]])
          .addTo(map);

        marker.on('drag', () => {
          const lngLat = marker.getLngLat();
          setNewCoords({ lat: lngLat.lat, lng: lngLat.lng });
        });

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          setNewCoords({ lat: lngLat.lat, lng: lngLat.lng });
        });

        markerRef.current = marker;
      });

      mapRef.current = map;
    };

    // Delay init so the modal is fully painted before Mapbox measures container size
    const timer = setTimeout(init, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!markerRef.current || !newCoords) return;
    setSaving(true);
    try {
      await onSave(newCoords.lat, newCoords.lng);
      onClose();
    } catch (err) {
      console.error('Position save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60">
      <div className="flex flex-col bg-white rounded-t-2xl" style={{ height: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-800">
            {isAdmin ? 'Modifier la position' : 'Proposer une nouvelle position'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Map */}
        <div className="relative" style={{ height: "50vh" }}>
          <div ref={mapContainerRef} className="absolute inset-0" />
          {!initialCoords && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <p className="text-sm text-gray-500">Coordonn&eacute;es non disponibles</p>
            </div>
          )}
        </div>

        {/* Coords + buttons */}
        <div className="p-4 space-y-3 border-t border-gray-100 shrink-0">
          <div className="space-y-1">
            {initialCoords && (
              <p className="text-xs text-gray-500">
                Position actuelle&nbsp;: {initialCoords[1].toFixed(5)}&deg;N, {initialCoords[0].toFixed(5)}&deg;E
              </p>
            )}
            {newCoords ? (
              <p className="text-xs font-medium text-sky-600">
                Nouvelle position&nbsp;: {newCoords.lat.toFixed(5)}&deg;N, {newCoords.lng.toFixed(5)}&deg;E
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic">D&eacute;placez le marqueur pour choisir la nouvelle position</p>
            )}
          </div>
          {!isAdmin && (
            <p className="text-xs text-gray-400">
              Votre proposition sera soumise &agrave; la validation de la communaut&eacute;.
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !newCoords}
              className="flex-1 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Enregistrement...' : 'Valider'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// === Main Page Component ===
export default function PoiDetailPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { getPoi, votePoi, getUserVote, editPoiField, editPoiPosition, getPoiEdits, voteOnEdit, addComment, getComments, voteOnComment } = usePois();
  const router = useRouter();
  const params = useParams();
  const poiId = params.id as string;

  const [poi, setPoi] = useState<Poi | null>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const [edits, setEdits] = useState<PoiEdit[]>([]);
  const [comments, setComments] = useState<PoiComment[]>([]);
  const [showPositionEdit, setShowPositionEdit] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  const loadPoi = useCallback(async () => {
    if (!poiId) return;
    setLoading(true);
    const data = await getPoi(poiId);
    setPoi(data);
    setLoading(false);
  }, [poiId, getPoi]);

  const loadUserVote = useCallback(async () => {
    if (!poiId) return;
    const vote = await getUserVote(poiId);
    setUserVote(vote);
  }, [poiId, getUserVote]);

  const loadEdits = useCallback(async () => {
    if (!poiId) return;
    const data = await getPoiEdits(poiId);
    setEdits(data);
  }, [poiId, getPoiEdits]);

  const loadComments = useCallback(async () => {
    if (!poiId) return;
    const data = await getComments(poiId);
    setComments(data);
  }, [poiId, getComments]);

  useEffect(() => {
    loadPoi();
    loadUserVote();
    loadEdits();
    loadComments();
  }, [loadPoi, loadUserVote, loadEdits, loadComments]);

  const handleVote = async (rating: number) => {
    if (!user || voteLoading) return;
    setVoteLoading(true);
    try {
      await votePoi(poiId, rating);
      setUserVote(rating);
      await loadPoi();
    } catch (err) {
      console.error('Vote error:', err);
    } finally {
      setVoteLoading(false);
    }
  };

  const handleFieldEdit = async (fieldName: string, oldValue: string, newValue: string, reason: string) => {
    await editPoiField(poiId, fieldName, oldValue, newValue, reason);
    await loadPoi();
    await loadEdits();
  };

  const handleEditVote = async (editId: string, voteType: 'up' | 'down') => {
    try {
      await voteOnEdit(editId, voteType);
      await loadEdits();
      await loadPoi(); // in case auto-revert happened
    } catch (err) {
      console.error('Edit vote error:', err);
    }
  };

  const handleAddComment = async (content: string) => {
    await addComment(poiId, content);
    await loadComments();
  };

  const handleCommentVote = async (commentId: string, voteType: 'up' | 'down') => {
    try {
      await voteOnComment(commentId, voteType);
      await loadComments();
    } catch (err) {
      console.error('Comment vote error:', err);
    }
  };

  const handlePositionSave = async (newLat: number, newLng: number) => {
    if (!poi?.location?.coordinates) return;
    const [oldLng, oldLat] = poi.location.coordinates;
    const isAdmin = !!profile?.is_admin;
    await editPoiPosition(poiId, oldLat, oldLng, newLat, newLng, isAdmin);
    await loadPoi();
    await loadEdits();
  };

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || !poi) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Site introuvable</p>
          <button
            onClick={() => router.push('/sites')}
            className="mt-3 text-sky-500 text-sm font-medium"
          >
            Retour aux sites
          </button>
        </div>
      </div>
    );
  }

  const config = POI_TYPE_CONFIG[poi.poi_type];
  const isFlightSite = poi.poi_type === 'takeoff' || poi.poi_type === 'landing';
  const coords = poi.location?.coordinates;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800 truncate">{poi.location_name}</h1>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Type badge + name (editable) */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 ${config.bgColor} rounded-full flex items-center justify-center`}>
              <span className={`font-bold text-xl ${config.color}`}>{config.emoji}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xl font-bold text-gray-800">{poi.location_name}</h2>
                <InlineEditField
                  fieldName="location_name"
                  label="Nom"
                  currentValue={poi.location_name}
                  onSave={handleFieldEdit}
                />
              </div>
              <p className="text-sm text-gray-500">{config.label}</p>
            </div>
          </div>

          {/* Quick info pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            {poi.altitude_m && (
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-medium">
                <Mountain className="h-3 w-3" />
                {poi.altitude_m}m
              </span>
            )}
            {poi.difficulty && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${DIFFICULTY_LABELS[poi.difficulty]?.color || 'bg-gray-100 text-gray-600'}`}>
                {DIFFICULTY_LABELS[poi.difficulty]?.label || poi.difficulty}
              </span>
            )}
            {poi.ffvl_approved && (
              <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full text-xs font-medium">
                <Shield className="h-3 w-3" />
                FFVL
              </span>
            )}
          </div>
        </div>

        {/* Location */}
        {coords && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                Coordonn&eacute;es
              </h3>
              <button
                onClick={() => setShowPositionEdit(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors bg-sky-50 text-sky-600 hover:bg-sky-100"
              >
                <Pencil className="h-3 w-3" />
                {profile?.is_admin ? 'Modifier la position' : 'Proposer une nouvelle position'}
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {coords[1].toFixed(5)}&deg;N, {coords[0].toFixed(5)}&deg;E
            </p>
          </div>
        )}

        {/* Description (editable) */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Description</h3>
            <InlineEditField
              fieldName="description"
              label="Description"
              currentValue={poi.description || ''}
              onSave={handleFieldEdit}
              type="textarea"
            />
          </div>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {poi.description || <span className="italic text-gray-400">Aucune description</span>}
          </p>
        </div>

        {/* Wind orientations (editable) */}
        {isFlightSite && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Wind className="h-4 w-4" />
                Orientations favorables
              </h3>
              <InlineEditField
                fieldName="wind_orientations"
                label="Orientations vent"
                currentValue={JSON.stringify(poi.wind_orientations)}
                onSave={handleFieldEdit}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {poi.wind_orientations.length > 0 ? poi.wind_orientations.map((dir) => (
                <span key={dir} className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full text-xs font-medium">
                  {dir}
                </span>
              )) : (
                <span className="text-xs text-gray-400 italic">Non renseign&eacute;</span>
              )}
            </div>
          </div>
        )}

        {/* Difficulty (editable) */}
        {isFlightSite && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Difficult&eacute;</h3>
              <InlineEditField
                fieldName="difficulty"
                label="Difficult&eacute;"
                currentValue={poi.difficulty || ''}
                onSave={handleFieldEdit}
                type="select"
              />
            </div>
            <p className="text-sm text-gray-600">
              {poi.difficulty ? (DIFFICULTY_LABELS[poi.difficulty]?.label || poi.difficulty) : <span className="italic text-gray-400">Non d&eacute;finie</span>}
            </p>
          </div>
        )}

        {/* Weather station info */}
        {poi.poi_type === 'weather_station' && (poi.station_url || poi.station_provider) && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Station m&eacute;t&eacute;o</h3>
            {poi.station_provider && (
              <p className="text-sm text-gray-600 mb-2">Fournisseur : {poi.station_provider}</p>
            )}
            {poi.station_url && (
              <a
                href={poi.station_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-sky-500 font-medium hover:text-sky-600"
              >
                <ExternalLink className="h-4 w-4" />
                Voir les donn&eacute;es
              </a>
            )}
          </div>
        )}

        {/* Webcam */}
        {poi.poi_type === 'webcam' && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Webcam</h3>
            {poi.webcam_orientation && (
              <p className="text-sm text-gray-600 mb-2">Orientation : {poi.webcam_orientation}</p>
            )}
            {poi.webcam_url && (
              <>
                <div className="rounded-lg overflow-hidden mb-3 bg-gray-100">
                  <iframe
                    src={poi.webcam_url}
                    className="w-full h-48 border-0"
                    title="Webcam"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
                <a
                  href={poi.webcam_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-sky-500 font-medium hover:text-sky-600"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir en plein &eacute;cran
                </a>
              </>
            )}
          </div>
        )}

        {/* Rating / Voting */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Noter ce site</h3>
          <VotingStars
            currentRating={poi.average_rating}
            userVote={userVote}
            onVote={handleVote}
            totalVotes={poi.total_votes}
          />
        </div>

        {/* Author */}
        {poi.profiles && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {poi.profiles.avatar_url ? (
                  <img src={poi.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {poi.profiles.display_name || poi.profiles.username || 'Pilote anonyme'}
                </p>
                <p className="text-xs text-gray-400">Ajout&eacute; par</p>
              </div>
            </div>
          </div>
        )}

        {/* === WIKI SECTIONS === */}

        {/* Edit History */}
        <EditHistorySection edits={edits} onVote={handleEditVote} />

        {/* Comments */}
        <CommentsSection
          comments={comments}
          onAddComment={handleAddComment}
          onVote={handleCommentVote}
        />
      </div>

      <BottomNav />

      {/* Position edit modal */}
      {showPositionEdit && poi && (
        <PositionEditModal
          poi={poi}
          isAdmin={!!profile?.is_admin}
          onSave={handlePositionSave}
          onClose={() => setShowPositionEdit(false)}
        />
      )}
    </div>
  );
}
