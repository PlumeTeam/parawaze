'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? '/map' : '/auth');
    }
  }, [user, loading, router]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-sky-500 to-mountain-500">
      <div className="flex items-center gap-2 mb-6">
        <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
          <path
            d="M20 4C18 4 8 18 8 24c0 4 3 8 8 8h0c1-3 3-5 4-5s3 2 4 5h0c5 0 8-4 8-8C32 18 22 4 20 4z"
            fill="white"
            fillOpacity="0.9"
          />
          <path
            d="M14 14c0 0 3-2 6-2s6 2 6 2"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <h1 className="text-3xl font-bold text-white">ParaWaze</h1>
      </div>
      <LoadingSpinner size="lg" />
    </div>
  );
}
