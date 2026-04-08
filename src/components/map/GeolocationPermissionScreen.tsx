'use client';

import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';

interface GeolocationPermissionScreenProps {
  onPermissionGranted: () => void;
  onSkip: () => void;
}

export default function GeolocationPermissionScreen({
  onPermissionGranted,
  onSkip,
}: GeolocationPermissionScreenProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleEnableLocation = () => {
    setIsLoading(true);
    if (!navigator.geolocation) {
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        // Permission granted and position obtained
        setIsLoading(false);
        onPermissionGranted();
      },
      (error) => {
        // Permission denied or error - just log and let user continue
        console.debug('Geolocation error:', error?.code, error?.message);
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-6">
      {/* Main content */}
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        {/* GPS Icon */}
        <div className="w-20 h-20 rounded-full bg-sky-50 flex items-center justify-center">
          <MapPin className="w-10 h-10 text-sky-500" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900">
          Activez votre localisation
        </h1>

        {/* Description */}
        <p className="text-gray-600 text-base leading-relaxed">
          Pour voir les conditions météo et les rapports autour de vous, autorisez l'accès à votre position.
        </p>

        {/* Primary Button */}
        <button
          onClick={handleEnableLocation}
          disabled={isLoading}
          className="w-full bg-sky-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors hover:bg-sky-600 active:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Accès à votre position...' : 'Activer la localisation'}
        </button>

        {/* Secondary Link */}
        <button
          onClick={onSkip}
          disabled={isLoading}
          className="text-sky-500 font-medium text-sm hover:text-sky-600 active:text-sky-700 disabled:text-sky-300 disabled:cursor-not-allowed transition-colors"
        >
          Continuer sans localisation
        </button>
      </div>

      {/* Safe area bottom spacing */}
      <div style={{ height: 'env(safe-area-inset-bottom)' }} className="flex-1 max-h-20" />
    </div>
  );
}
