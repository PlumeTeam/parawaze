'use client';

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
 * Consolidated weather stations hook combining Pioupiou, FFVL, Winds.mobi, GeoSphere, and BrightSky.
 * Pass enabled=false to defer all network fetches until ready (e.g. after map loads).
 */
export function useWeatherStations(enabled = true): UseWeatherStationsReturn {
  const pioupiou = usePioupiou(enabled);
  const ffvl = useFFVL(enabled);
  const windsMobi = useWindsMobi(enabled);
  const geoSphere = useGeoSphere(enabled);
  const brightSky = useBrightSky(enabled);

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
