import { formatDistanceToNow, differenceInHours, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

export function timeAgo(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
}

export function expiresIn(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const hours = differenceInHours(expires, now);
  const minutes = differenceInMinutes(expires, now) % 60;

  if (hours <= 0 && minutes <= 0) return 'Expire';
  if (hours > 0) return `Expire dans ${hours}h${minutes > 0 ? `${minutes}m` : ''}`;
  return `Expire dans ${minutes}m`;
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) <= new Date();
}

export function formatWind(speed: number | null, gust: number | null): string {
  if (!speed) return '-';
  let s = `${speed} km/h`;
  if (gust && gust > speed) s += ` (raf. ${gust})`;
  return s;
}

export function formatTemperature(temp: number | null): string {
  if (temp === null || temp === undefined) return '-';
  return `${temp}°C`;
}

export function formatAltitude(alt: number | null): string {
  if (!alt) return '-';
  return `${alt} m`;
}

export function formatVisibility(vis: number | null): string {
  if (!vis) return '-';
  return `${vis} km`;
}

export function formatCloudCeiling(ceiling: number | null): string {
  if (!ceiling) return '-';
  return `${ceiling} m`;
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}
