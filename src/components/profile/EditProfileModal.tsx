'use client';

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { GENDER_LABELS, WING_CATEGORY_LABELS, PILOT_LEVEL_LABELS, COMMON_CERTIFICATIONS } from '@/utils/constants';
import type { Profile, Gender, WingCategory, PilotLevel } from '@/lib/types';

interface EditProfileModalProps {
  profile: Profile;
  onSave: (updates: Partial<Profile>) => Promise<any>;
  onClose: () => void;
}

export default function EditProfileModal({ profile, onSave, onClose }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [username, setUsername] = useState(profile.username || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth || '');
  const [gender, setGender] = useState<Gender | ''>(profile.gender || '');
  const [currentWing, setCurrentWing] = useState(profile.current_wing || '');
  const [currentWingCategory, setCurrentWingCategory] = useState<WingCategory | ''>(profile.current_wing_category || '');
  const [pastWings, setPastWings] = useState<string[]>(profile.past_wings || []);
  const [newPastWing, setNewPastWing] = useState('');
  const [pilotLevel, setPilotLevel] = useState<PilotLevel | ''>(profile.pilot_level || '');
  const [flyingSince, setFlyingSince] = useState<string>(profile.flying_since ? String(profile.flying_since) : '');
  const [certifications, setCertifications] = useState<string[]>(profile.certifications || []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addPastWing = () => {
    const trimmed = newPastWing.trim();
    if (trimmed && !pastWings.includes(trimmed)) {
      setPastWings([...pastWings, trimmed]);
      setNewPastWing('');
    }
  };

  const removePastWing = (index: number) => {
    setPastWings(pastWings.filter((_, i) => i !== index));
  };

  const toggleCertification = (cert: string) => {
    if (certifications.includes(cert)) {
      setCertifications(certifications.filter((c) => c !== cert));
    } else {
      setCertifications([...certifications, cert]);
    }
  };

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
        date_of_birth: dateOfBirth || null,
        gender: (gender as Gender) || null,
        current_wing: currentWing.trim() || null,
        current_wing_category: (currentWingCategory as WingCategory) || null,
        past_wings: pastWings,
        pilot_level: (pilotLevel as PilotLevel) || null,
        flying_since: flyingSince ? parseInt(flyingSince, 10) : null,
        certifications,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none text-sm text-gray-800';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const sectionClass = 'text-xs font-semibold text-gray-400 uppercase tracking-wider pt-3 pb-1';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-slideUp">
        <div className="flex items-center justify-between sticky top-0 bg-white pb-2">
          <h3 className="text-lg font-bold text-gray-800">Modifier le profil</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* --- Basic info --- */}
        <div>
          <label className={labelClass}>Nom d&apos;affichage</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Nom d&apos;utilisateur</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} placeholder="@pilote42" />
        </div>

        <div>
          <label className={labelClass}>Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="Pilote depuis 5 ans, je vole principalement dans les Alpes..." />
        </div>

        {/* --- Personal info --- */}
        <p className={sectionClass}>Informations personnelles</p>

        <div>
          <label className={labelClass}>Date de naissance</label>
          <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Sexe</label>
          <select value={gender} onChange={(e) => setGender(e.target.value as Gender | '')} className={inputClass}>
            <option value="">— Sélectionner —</option>
            {(Object.entries(GENDER_LABELS) as [Gender, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* --- Pilot info --- */}
        <p className={sectionClass}>Informations pilote</p>

        <div>
          <label className={labelClass}>Niveau</label>
          <select value={pilotLevel} onChange={(e) => setPilotLevel(e.target.value as PilotLevel | '')} className={inputClass}>
            <option value="">— Sélectionner —</option>
            {(Object.entries(PILOT_LEVEL_LABELS) as [PilotLevel, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Parapente depuis (année)</label>
          <input type="number" value={flyingSince} onChange={(e) => setFlyingSince(e.target.value)} className={inputClass} placeholder="Ex: 2015" min="1970" max={new Date().getFullYear()} />
        </div>

        {/* --- Wings --- */}
        <p className={sectionClass}>Voiles</p>

        <div>
          <label className={labelClass}>Voile actuelle</label>
          <input type="text" value={currentWing} onChange={(e) => setCurrentWing(e.target.value)} className={inputClass} placeholder="Ex: Advance Sigma 11" />
        </div>

        <div>
          <label className={labelClass}>Catégorie voile</label>
          <select value={currentWingCategory} onChange={(e) => setCurrentWingCategory(e.target.value as WingCategory | '')} className={inputClass}>
            <option value="">— Sélectionner —</option>
            {(Object.entries(WING_CATEGORY_LABELS) as [WingCategory, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Voiles passées</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPastWing}
              onChange={(e) => setNewPastWing(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPastWing(); } }}
              className={`${inputClass} flex-1`}
              placeholder="Nom de la voile"
            />
            <button
              type="button"
              onClick={addPastWing}
              className="px-3 py-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {pastWings.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {pastWings.map((wing, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  {wing}
                  <button onClick={() => removePastWing(i)} className="hover:text-red-500 transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* --- Certifications --- */}
        <p className={sectionClass}>Diplômes &amp; Certifications</p>

        <div className="flex flex-wrap gap-2">
          {COMMON_CERTIFICATIONS.map((cert) => {
            const selected = certifications.includes(cert);
            return (
              <button
                key={cert}
                type="button"
                onClick={() => toggleCertification(cert)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selected
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {cert}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>
        )}

        {/* Extra padding so the save button is not hidden behind BottomNav */}
        <div className="pb-24">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <LoadingSpinner size="sm" /> : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
