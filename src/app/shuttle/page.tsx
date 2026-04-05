'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useShuttles } from '@/hooks/useShuttles';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { Shuttle } from '@/lib/types';

function formatDepartureTime(iso: string): string {
  const d = new Date(iso);
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const day = days[d.getDay()];
  const date = d.getDate();
  const month = months[d.getMonth()];
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${date} ${month} à ${hours}h${minutes}`;
}

function formatPrice(price: number | null): string {
  if (!price || price === 0) return 'Gratuit';
  return `${price}\u20ac/pers`;
}

function ShuttleCard({ shuttle, onClick }: { shuttle: Shuttle; onClick: () => void }) {
  const isFull = shuttle.taken_seats >= shuttle.total_seats;
  const seatsLeft = shuttle.total_seats - shuttle.taken_seats;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left transition-all active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        {/* Van emoji with indicator */}
        <div className="flex-shrink-0 relative">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
              isFull ? 'bg-red-50' : 'bg-green-50'
            }`}
          >
            {'\u{1F690}'}
          </div>
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
              isFull ? 'bg-red-500' : 'bg-green-500'
            }`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              shuttle.shuttle_type === 'offer'
                ? 'bg-sky-100 text-sky-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {shuttle.shuttle_type === 'offer' ? 'Propose' : 'Cherche'}
            </span>
            {shuttle.return_requested && (
              <span className="text-xs text-gray-400">{'\u{1F504}'} A/R</span>
            )}
          </div>

          <p className="text-sm font-semibold text-gray-900 truncate">
            {shuttle.meeting_point_name || 'Point de rencontre'}
            {' \u2192 '}
            {shuttle.destination_name || 'Destination'}
          </p>

          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-gray-500">
              {'\u{1F552}'} {formatDepartureTime(shuttle.departure_time)}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs font-medium ${isFull ? 'text-red-600' : 'text-green-600'}`}>
              {isFull ? 'Complet' : `${seatsLeft} place${seatsLeft > 1 ? 's' : ''} dispo`}
              {' '}({shuttle.taken_seats}/{shuttle.total_seats})
            </span>
            <span className="text-xs font-medium text-gray-600">
              {formatPrice(shuttle.price_per_person)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function ShuttleListPage() {
  const { user, loading: authLoading } = useAuth();
  const { shuttles, loading, fetchShuttles } = useShuttles();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    fetchShuttles();
  }, [fetchShuttles]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  const offers = shuttles.filter((s) => s.shuttle_type === 'offer');
  const requests = shuttles.filter((s) => s.shuttle_type === 'request');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.push('/map')} className="p-1 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">{'\u{1F690}'} Navettes</h1>
        </div>
      </header>

      {/* Action buttons */}
      <div className="px-4 pt-4 flex gap-3">
        <button
          onClick={() => router.push('/shuttle/pick-locations?type=offer')}
          className="flex-1 flex items-center justify-center gap-2 bg-sky-500 text-white rounded-xl py-3 font-semibold text-sm shadow-sm active:bg-sky-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Proposer une navette
        </button>
        <button
          onClick={() => router.push('/shuttle/pick-locations?type=request')}
          className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white rounded-xl py-3 font-semibold text-sm shadow-sm active:bg-amber-600 transition-colors"
        >
          <Search className="h-4 w-4" />
          Chercher une navette
        </button>
      </div>

      {/* Shuttle list */}
      <div className="px-4 pt-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : shuttles.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">{'\u{1F690}'}</div>
            <p className="text-gray-500 font-medium">Aucune navette pour le moment</p>
            <p className="text-gray-400 text-sm mt-1">
              Soyez le premier à proposer un trajet !
            </p>
          </div>
        ) : (
          <>
            {/* Offers section */}
            {offers.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Navettes proposées ({offers.length})
                </h2>
                <div className="space-y-3">
                  {offers.map((s) => (
                    <ShuttleCard
                      key={s.id}
                      shuttle={s}
                      onClick={() => router.push(`/shuttle/${s.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Requests section */}
            {requests.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Recherches de navettes ({requests.length})
                </h2>
                <div className="space-y-3">
                  {requests.map((s) => (
                    <ShuttleCard
                      key={s.id}
                      shuttle={s}
                      onClick={() => router.push(`/shuttle/${s.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
