'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { Profile } from '@/lib/types';

interface EditProfileModalProps {
  profile: Profile;
  onSave: (updates: Partial<Profile>) => Promise<any>;
  onClose: () => void;
}

export default function EditProfileModal({ profile, onSave, onClose }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [username, setUsername] = useState(profile.username || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Le nom est requis');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave({
        display_name: displayName.trim(),
        username: username.trim() || null,
        bio: bio.trim() || null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 space-y-4 animate-slideUp">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">Modifier le profil</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom d&apos;affichage</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom d&apos;utilisateur</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm"
            placeholder="@pilote42"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm resize-none"
            placeholder="Pilote depuis 5 ans, je vole principalement dans les Alpes..."
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <LoadingSpinner size="sm" /> : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}
