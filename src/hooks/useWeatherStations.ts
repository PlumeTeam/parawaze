'use client';

import { useState, useEffect } from 'react';
import { usePioupiou, type PioupiouStation } from './usePioupiou';
import { useFFVL, type FFVLStation } from './useFFVL';
import { useWindsMobi, type WindsMobiStation } from './useWindsMobi';
import { useGeoSphere, type GeoSphereStation } from './useGeoSphere';
import { useBrightSky, type BrightSkyStation } from './useBrightSky';

export interface WeatherStationsData {
  pioupiou: PioupiouStation[];
  ffvl: FFVLStation[];
  windsMobi: WindsMobiStation[];
  geoSphere: GeoSphereStation[];
  brightSky: BrightSkyStation[];
}

export interface UseWeatherStationsReturn {
  stations: WeatherStationsData;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Consolidated weather stations hook — staggers API calls to avoid
 * overwhelming low-end devices with 5 simultaneous fetches.
 */
export function useWeatherStations({ enabled = true }: { enabled?: boolean } = {}): UseWeatherStationsReturn {
  // Stagger each provider by 3 seconds to spread the load
  const [enablePioupiou, setEnablePioupiou] = useState(false);
  const [enableFFVL, setEnableFFVL] = useState(false);
  const [enableWindsMobi, setEnableWindsMobi] = useState(false);
  const [enableGeoSphere, setEnableGeoSphere] = useState(false);
  const [enableBrightSky, setEnableBrightSky] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const timers = [
      setTimeout(() => setEnablePioupiou(true), 0),
      setTimeout(() => setEnableFFVL(true), 3000),
      setTimeout(() => setEnableWindsMobi(true), 6000),
      setTimeout(() => setEnableGeoSphere(true), 9000),
      setTimeout(() => setEnableBrightSky(true), 12000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [enabled]);

  const pioupiou = usePioupiou({ enabled: enablePioupiou });
  const ffvl = useFFVL({ enabled: enableFFVL });
  const windsMobi = useWindsMobi({ enabled: enableWindsMobi });
  const geoSphere = useGeoSphere({ enabled: enableGeoSphere });
  const brightSky = useBrightSky({ enabled: enableBrightSky });

  const loading = pioupiou.loading || ffvl.loading || windsMobi.loading || geoSphere.loading || brightSky.loading;
  const error = pioupiou.error || ffvl.error || windsMobi.error || geoSphere.error || brightSky.error;

  const stations: WeatherStationsData = {
    pioupiou: pioupiou.stations,
    ffvl: ffvl.stations,
    windsMobi: windsMobi.stations,
    geoSphere: geoSphere.stations,
    brightSky: brightSky.stations,
  };

  const refresh = async () => {
    await Promise.all([
      pioupiou.fetchStations(),
      ffvl.fetchStations(),
      windsMobi.fetchStations(),
      geoSphere.fetchStations(),
      brightSky.refetch(),
    ]);
  };

  return { stations, loading, error, refresh };
}