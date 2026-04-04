'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useReports } from '@/hooks/useReports';
import ProfileCard from '@/components/profile/ProfileCard';
import EditProfileModal from '@/components/profile/EditProfileModal';
import ReportCard from '@/components/reports/ReportCard';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { WeatherReport } from '@/lib/types';

export default function ProfilePage() {
  const { user, profile, loading: authLoading, signOut, updateProfile } = useAuth();
  const { getUserReports } = useReports();
  const [userReports, setUserReports] = useState<WeatherReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const router = useRouter();

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
    }
  }, [user, getUserReports]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth');
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
        <h1 className="text-lg font-bold">Mon Profil</h1>
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

      <div className="px-4 pt-4 space-y-4">
        <ProfileCard profile={profile} email={user.email} />

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
                Creer mon premier rapport
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

      {/* Edit modal */}
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
