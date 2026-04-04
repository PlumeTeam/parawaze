'use client';

import { useState, useCallback } from 'react';

interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async (): Promise<LocationState | null> => {
    if (!navigator.geolocation) {
      setError('La geolocalisation n\'est pas supportee par ce navigateur.');
      return null;
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(loc);
          setLoading(false);
          resolve(loc);
        },
        (err) => {
          let msg = 'Erreur de geolocalisation.';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              msg = 'Permission de geolocalisation refusee.';
              break;
            case err.POSITION_UNAVAILABLE:
              msg = 'Position indisponible.';
              break;
            case err.TIMEOUT:
              msg = 'Delai de geolocalisation depasse.';
              break;
          }
          setError(msg);
          setLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  return { location, loading, error, requestLocation };
}
