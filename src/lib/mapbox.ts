const mapboxToken = 'pk.eyJ1IjoiamJpbnRoZWFpciIsImEiOiJjbWZqczhpcWMweWYxMmxzZnpuNXFxNXF0In0.c1jfb-ZcLUILC2gHpC7ZBA';
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || mapboxToken;

export const MAP_STYLES = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  standard: 'mapbox://styles/mapbox/streets-v12',
} as const;

export type MapStyleKey = keyof typeof MAP_STYLES;

// Default center: French Alps (Annecy area)
export const DEFAULT_CENTER: [number, number] = [6.13, 45.9];
export const DEFAULT_ZOOM = 9;

export function flyabilityColor(score: number): string {
  if (score >= 4) return '#22c55e'; // green
  if (score >= 3) return '#F97316'; // orange
  if (score >= 2) return '#eab308'; // yellow
  return '#ef4444'; // red
}
