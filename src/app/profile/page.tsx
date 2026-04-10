'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings, LogOut, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useReports } from '@/hooks/useReports';
import { useWings, type WingInput } from '@/hooks/useWings';
import { useVehicles, type VehicleInput } from '@/hooks/useVehicles';
import ProfileCard from '@/components/profile/ProfileCard';
import EditProfileModal from '@/components/profile/EditProfileModal';
import ReportCard from '@/components/reports/ReportCard';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { WeatherReport, Wing, Vehicle, WingCategory } from '@/lib/types';

const WING_BRANDS = [
  'Advance', 'Ozone', 'Niviuk', 'Nova', 'Gin', 'BGD', 'Skywalk', 'UP',
  'Triple Seven', 'Flow', 'Phi', 'Swing', 'Sol', 'ITV', 'Gradient', 'Kortel', 'Supair'
];

const WING_CATEGORIES: WingCategory[] = ['A', 'B', 'B+', 'C', 'D', 'CCC', 'biplace'];

function categoryColor(cat: WingCategory | null): string {
  switch (cat) {
    case 'A': return 'bg-green-100 text-green-700';
    case 'B': return 'bg-blue-100 text-blue-700';
    case 'B+': return 'bg-indigo-100 text-indigo-700';
    case 'C': return 'bg-orange-100 text-orange-700';
    case 'D': return 'bg-red-100 text-red-700';
    case 'CCC': return 'bg-purple-100 text-purple-700';
    case 'biplace': return 'bg-pink-100 text-pink-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export default function ProfilePage() {
  const { user, profile, loading: authLoading, signOut, updateProfile } = useAuth();
  const { getUserReports } = useReports();
  const { wings, loading: wingsLoading, fetchWings, addWing, updateWing, deleteWing, setCurrentWing } = useWings();
  const { vehicles, loading: vehiclesLoading, fetchVehicles, addVehicle, updateVehicle, deleteVehicle, setDefaultVehicle } = useVehicles();

  const [userReports, setUserReports] = useState<WeatherReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const router = useRouter();

  // Wing modal state
  const [showWingModal, setShowWingModal] = useState(false);
  const [editingWing, setEditingWing] = useState<Wing | null>(null);
  const [wingForm, setWingForm] = useState<WingInput>({ brand: '', model: '' });
  const [wingSubmitting, setWingSubmitting] = useState(false);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [filteredBrands, setFilteredBrands] = useState<string[]>([]);

  // Vehicle modal state
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState<VehicleInput>({ seats: 4 });
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      setLoadingReports(true);
      getUserReports(user.id)
        .then(setUserReports)
        .finally(() => setLoadingReports(false));
      fetchWings(user.id);
      fetchVehicles(user.id);
    }
  }, [user, getUserReports, fetchWings, fetchVehicles]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth');
  };

  // --- Wing handlers ---
  const openAddWing = () => {
    setEditingWing(null);
    setWingForm({ brand: '', model: '', size: '', category: null, color: '', year: null, is_current: false, serial_number: '', notes: '' });
    setShowWingModal(true);
  };

  const openEditWing = (wing: Wing) => {
    setEditingWing(wing);
    setWingForm({
      brand: wing.brand, model: wing.model, size: wing.size,
      category: wing.category, color: wing.color, year: wing.year,
      is_current: wing.is_current, serial_number: wing.serial_number, notes: wing.notes,
    });
    setShowWingModal(true);
  };

  const handleWingSave = async () => {
    if (!user || !wingForm.brand.trim() || !wingForm.model.trim()) return;
    setWingSubmitting(true);
    try {
      if (editingWing) {
        await updateWing(editingWing.id, wingForm);
      } else {
        await addWing(user.id, wingForm);
      }
      await fetchWings(user.id);
      setShowWingModal(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setWingSubmitting(false);
    }
  };

  const handleDeleteWing = async (wingId: string) => {
    if (!user || !confirm('Supprimer cette voile ?')) return;
    try {
      await deleteWing(wingId);
      await fetchWings(user.id);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSetCurrentWing = async (wingId: string) => {
    if (!user) return;
    try {
      await setCurrentWing(user.id, wingId);
      await fetchWings(user.id);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBrandInput = (val: string) => {
    setWingForm({ ...wingForm, brand: val });
    if (val.length > 0) {
      const filtered = WING_BRANDS.filter(b => b.toLowerCase().startsWith(val.toLowerCase()));
      setFilteredBrands(filtered);
      setShowBrandSuggestions(filtered.length > 0);
    } else {
      setShowBrandSuggestions(false);
    }
  };

  // --- Vehicle handlers ---
  const openAddVehicle = () => {
    setEditingVehicle(null);
    setVehicleForm({ name: '', brand: '', model: '', color: '', license_plate: '', seats: 4, is_default: false });
    setShowVehicleModal(true);
  };

  const openEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      name: vehicle.name, brand: vehicle.brand, model: vehicle.model,
      color: vehicle.color, license_plate: vehicle.license_plate,
      seats: vehicle.seats, is_default: vehicle.is_default,
    });
    setShowVehicleModal(true);
  };

  const handleVehicleSave = async () => {
    if (!user || !vehicleForm.seats) return;
    setVehicleSubmitting(true);
    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, vehicleForm);
      } else {
        await addVehicle(user.id, vehicleForm);
      }
      await fetchVehicles(user.id);
      setShowVehicleModal(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setVehicleSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!user || !confirm('Supprimer ce v\u00e9hicule ?')) return;
    try {
      await deleteVehicle(vehicleId);
      await fetchVehicles(user.id);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSetDefaultVehicle = async (vehicleId: string) => {
    if (!user) return;
    try {
      await setDefaultVehicle(user.id, vehicleId);
      await fetchVehicles(user.id);
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between safe-area-top">
        <button
          onClick={() => router.push('/map')}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold flex-1 text-center">Mon Profil</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            onClick={handleSignOut}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-6">
        <ProfileCard profile={profile} email={user.email} />

        {/* ========== WINGS SECTION ========== */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Mes voiles
            </h3>
            <button
              onClick={openAddWing}
              className="flex items-center gap-1 text-sky-500 text-sm font-semibold hover:text-sky-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
          {wingsLoading ? (
            <div className="py-4"><LoadingSpinner /></div>
          ) : wings.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">Aucune voile enregistr&eacute;e</p>
              <button onClick={openAddWing} className="mt-2 text-sky-500 font-semibold text-sm hover:underline">
                Ajouter ma premi&egrave;re voile
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {wings.map((wing) => (
                <div
                  key={wing.id}
                  className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3"
                  style={{ borderLeftWidth: 4, borderLeftColor: wing.color || '#e5e7eb' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {wing.brand} {wing.model}
                      </span>
                      {wing.category && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor(wing.category)}`}>
                          {wing.category}
                        </span>
                      )}
                      {wing.is_current && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          Voile actuelle
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {wing.size && <span>Taille {wing.size}</span>}
                      {wing.color && (
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: wing.color }} />
                          {wing.color}
                        </span>
                      )}
                      {wing.year && <span>{wing.year}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!wing.is_current && (
                      <button
                        onClick={() => handleSetCurrentWing(wing.id)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded-full hover:bg-green-50 transition-colors"
                        title="D\u00e9finir comme voile actuelle"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditWing(wing)}
                      className="p-1.5 text-gray-400 hover:text-sky-600 rounded-full hover:bg-sky-50 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteWing(wing.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========== VEHICLES SECTION ========== */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Mes v&eacute;hicules
            </h3>
            <button
              onClick={openAddVehicle}
              className="flex items-center gap-1 text-sky-500 text-sm font-semibold hover:text-sky-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
          {vehiclesLoading ? (
            <div className="py-4"><LoadingSpinner /></div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">Aucun v&eacute;hicule enregistr&eacute;</p>
              <button onClick={openAddVehicle} className="mt-2 text-sky-500 font-semibold text-sm hover:underline">
                Ajouter mon premier v&eacute;hicule
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3"
                >
                  <span className="text-xl">{'\uD83D\uDE97'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {vehicle.brand && vehicle.model
                          ? `${vehicle.brand} ${vehicle.model}`
                          : vehicle.name || 'V\u00e9hicule'}
                      </span>
                      {vehicle.is_default && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          V&eacute;hicule par d&eacute;faut
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {vehicle.color && <span>{vehicle.color}</span>}
                      <span>{vehicle.seats} places</span>
                      {vehicle.license_plate && <span>{vehicle.license_plate}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!vehicle.is_default && (
                      <button
                        onClick={() => handleSetDefaultVehicle(vehicle.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                        title="D\u00e9finir par d\u00e9faut"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditVehicle(vehicle)}
                      className="p-1.5 text-gray-400 hover:text-sky-600 rounded-full hover:bg-sky-50 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVehicle(vehicle.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User reports */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Mes rapports
          </h3>
          {loadingReports ? (
            <div className="py-8">
              <LoadingSpinner />
            </div>
          ) : userReports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">Aucun rapport pour le moment</p>
              <button
                onClick={() => router.push('/report/new')}
                className="mt-3 text-sky-500 font-semibold text-sm hover:underline"
              >
                Cr&eacute;er mon premier rapport
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {userReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onClick={() => router.push(`/report/${report.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========== WING MODAL ========== */}
      {showWingModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-800">
                {editingWing ? 'Modifier la voile' : 'Ajouter une voile'}
              </h2>
              <button onClick={() => setShowWingModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Brand with autocomplete */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Marque *</label>
              <input
                type="text"
                value={wingForm.brand}
                onChange={(e) => handleBrandInput(e.target.value)}
                onFocus={() => { if (wingForm.brand) handleBrandInput(wingForm.brand); }}
                onBlur={() => setTimeout(() => setShowBrandSuggestions(false), 200)}
                placeholder="Ex: Ozone"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
              {showBrandSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                  {filteredBrands.map((b) => (
                    <button
                      key={b}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-sky-50 transition-colors"
                      onMouseDown={() => {
                        setWingForm({ ...wingForm, brand: b });
                        setShowBrandSuggestions(false);
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mod&egrave;le *</label>
              <input
                type="text"
                value={wingForm.model}
                onChange={(e) => setWingForm({ ...wingForm, model: e.target.value })}
                placeholder="Ex: Alpina 4"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taille</label>
                <input
                  type="text"
                  value={wingForm.size || ''}
                  onChange={(e) => setWingForm({ ...wingForm, size: e.target.value || null })}
                  placeholder="Ex: MS, 26, L"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cat&eacute;gorie</label>
                <select
                  value={wingForm.category || ''}
                  onChange={(e) => setWingForm({ ...wingForm, category: (e.target.value || null) as WingCategory | null })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white"
                >
                  <option value="">--</option>
                  {WING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
                <input
                  type="text"
                  value={wingForm.color || ''}
                  onChange={(e) => setWingForm({ ...wingForm, color: e.target.value || null })}
                  placeholder="Ex: Rouge / Bleu"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ann&eacute;e</label>
                <input
                  type="number"
                  value={wingForm.year ?? ''}
                  onChange={(e) => setWingForm({ ...wingForm, year: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="2024"
                  min="2000"
                  max="2030"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N&deg; de s&eacute;rie</label>
              <input
                type="text"
                value={wingForm.serial_number || ''}
                onChange={(e) => setWingForm({ ...wingForm, serial_number: e.target.value || null })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={wingForm.notes || ''}
                onChange={(e) => setWingForm({ ...wingForm, notes: e.target.value || null })}
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={wingForm.is_current ?? false}
                onChange={(e) => setWingForm({ ...wingForm, is_current: e.target.checked })}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Voile actuelle</span>
            </label>

            <button
              onClick={handleWingSave}
              disabled={wingSubmitting || !wingForm.brand.trim() || !wingForm.model.trim()}
              className="w-full py-3 rounded-xl bg-sky-500 text-white font-bold text-sm disabled:opacity-50 active:bg-sky-600 transition-all"
            >
              {wingSubmitting ? 'Enregistrement...' : editingWing ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {/* ========== VEHICLE MODAL ========== */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-800">
                {editingVehicle ? 'Modifier le v\u00e9hicule' : 'Ajouter un v\u00e9hicule'}
              </h2>
              <button onClick={() => setShowVehicleModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom (optionnel)</label>
              <input
                type="text"
                value={vehicleForm.name || ''}
                onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value || null })}
                placeholder='Ex: "La Navette", "Mon Kangoo"'
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
                <input
                  type="text"
                  value={vehicleForm.brand || ''}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value || null })}
                  placeholder="Ex: Renault"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mod&egrave;le</label>
                <input
                  type="text"
                  value={vehicleForm.model || ''}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value || null })}
                  placeholder="Ex: Kangoo"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
                <input
                  type="text"
                  value={vehicleForm.color || ''}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value || null })}
                  placeholder="Ex: Blanc"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Places *</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={vehicleForm.seats}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, seats: parseInt(e.target.value) || 1 })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plaque d&apos;immatriculation</label>
              <input
                type="text"
                value={vehicleForm.license_plate || ''}
                onChange={(e) => setVehicleForm({ ...vehicleForm, license_plate: e.target.value || null })}
                placeholder="Ex: AB-123-CD"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={vehicleForm.is_default ?? false}
                onChange={(e) => setVehicleForm({ ...vehicleForm, is_default: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">V&eacute;hicule par d&eacute;faut</span>
            </label>

            <button
              onClick={handleVehicleSave}
              disabled={vehicleSubmitting}
              className="w-full py-3 rounded-xl bg-sky-500 text-white font-bold text-sm disabled:opacity-50 active:bg-sky-600 transition-all"
            >
              {vehicleSubmitting ? 'Enregistrement...' : editingVehicle ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {/* Edit profile modal */}
      {showEdit && (
        <EditProfileModal
          profile={profile}
          onSave={updateProfile}
          onClose={() => setShowEdit(false)}
        />
      )}

      <BottomNav />
    </div>
  );
}
