'use client';

import { Suspense } from 'react';
import ShuttleFormContent from './ShuttleFormContent';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function NewShuttlePage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <ShuttleFormContent />
    </Suspense>
  );
}
