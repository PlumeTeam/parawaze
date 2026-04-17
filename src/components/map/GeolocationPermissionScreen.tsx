'use client';

import { useState } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  const handleEnableLocation = () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      // No geolocation support - skip the screen
      setIsLoading(false);
      onSkip();
      return;
    }

    // Request geolocation with reasonable settings for mobile
    // enableHighAccuracy=false for faster response on iOS
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Success - permission granted and position obtained
        setIsLoading(false);
        onPermissionGranted();
      },
      (err) => {
        // Handle different error codes
        // Code 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
        console.debug('Geolocation error:', err?.code, err?.message);
        setIsLoading(false);

        // If permission denied, let them continue without location
        if (err?.code === 1) {
          setError('Permission refusée. Vous pouvez continuer sans localisation.');
          // Auto-skip after short delay
          setTimeout(() => onSkip(), 2000);
        } else if (err?.code === 3) {
          // Timeout - just skip to map
          setError('Délai dépassé. Continuant...');
          setTimeout(() => onSkip(), 1500);
        } else {
          // Other error (position unavailable, etc)
          setError('Impossible de récupérer la position. Continuant sans localisation...');
          setTimeout(() => onSkip(), 2000);
        }
      },
      {
        enableHighAccuracy: false, // Faster on iOS, less accurate but acceptable
        timeout: 8000, // Reasonable timeout for mobile networks
        maximumAge: 0, // Don't use cached position
      }
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

        {/* Error message if any */}
        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
            {error}
          </div>
        )}

        {/* Primary Button */}
        <button
          onClick={handleEnableLocation}
          disabled={isLoading}
          className="w-full bg-sky-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors hover:bg-sky-600 active:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Accès à votre position...' : 'Activer la localisation'}
        </button>

        {/* Secondary Link - always clickable unless loading and no error */}
        {!error && (
          <button
            onClick={onSkip}
            disabled={isLoading && !error}
            className="text-sky-500 font-medium text-sm hover:text-sky-600 active:text-sky-700 disabled:text-sky-300 disabled:cursor-not-allowed transition-colors"
          >
            Continuer sans localisation
          </button>
        )}
      </div>

      {/* Safe area bottom spacing */}
      <div style={{ height: 'env(safe-area-inset-bottom)' }} className="flex-1 max-h-20" />
    </div>
  );
}
