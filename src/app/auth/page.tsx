'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import { useAuth } from '@/hooks/useAuth';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/map');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-500 via-sky-400 to-mountain-500 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pt-12 pb-6 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
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
            <path
              d="M20 12v18M20 12c-4 1-8 6-8 6M20 12c4 1 8 6 8 6"
              stroke="rgba(14,165,233,0.6)"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <h1 className="text-3xl font-bold text-white tracking-tight">ParaWaze</h1>
        </div>
        <p className="text-sky-100 text-sm">La météo collaborative des pilotes de parapente</p>
      </div>

      {/* Form card */}
      <div className="flex-1 bg-gray-50 rounded-t-3xl px-6 pt-8 pb-12 shadow-xl">
        <h2 className="text-xl font-bold text-gray-800 text-center mb-6">
          {isLogin ? 'Connexion' : 'Inscription'}
        </h2>

        {isLogin ? (
          <LoginForm onToggle={() => setIsLogin(false)} />
        ) : (
          <SignupForm onToggle={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
}
