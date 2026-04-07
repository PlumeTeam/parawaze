import type { WindDirection, BadgeLevel, PilotLevel, Gender, WingCategory } from '@/lib/types';

export const WIND_DIRECTIONS: WindDirection[] = [
  'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'variable',
];

export const WIND_DIRECTION_LABELS: Record<WindDirection, string> = {
  N: 'Nord',
  NE: 'Nord-Est',
  E: 'Est',
  SE: 'Sud-Est',
  S: 'Sud',
  SW: 'Sud-Ouest',
  W: 'Ouest',
  NW: 'Nord-Ouest',
  variable: 'Variable',
};

export const WIND_DIRECTION_DEGREES: Record<WindDirection, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
  variable: 0,
};

export const REPORT_TYPE_LABELS: Record<string, string> = {
  observation: 'Observation en direct',
  forecast: 'Prevision',
  image_share: 'Partage photo',
};

export const REPORT_TYPE_ICONS: Record<string, string> = {
  observation: '👁️',
  forecast: '🔮',
  image_share: '📷',
};

export const BADGE_LABELS: Record<BadgeLevel, string> = {
  beginner: 'Debutant',
  observer: 'Observateur',
  expert: 'Expert',
  legend: 'Legende',
};

export const BADGE_COLORS: Record<BadgeLevel, string> = {
  beginner: '#94a3b8',
  observer: '#0EA5E9',
  expert: '#F97316',
  legend: '#a855f7',
};

export const FLYABILITY_LABELS: Record<number, string> = {
  1: 'Dangereux',
  2: 'Difficile',
  3: 'Moyen',
  4: 'Bon',
  5: 'Excellent',
};

export const THERMAL_LABELS: Record<number, string> = {
  1: 'Nul',
  2: 'Faible',
  3: 'Moyen',
  4: 'Bon',
  5: 'Excellent',
};

export const TURBULENCE_LABELS: Record<number, string> = {
  1: 'Calme',
  2: 'Leger',
  3: 'Modere',
  4: 'Fort',
  5: 'Severe',
};

export const REPORT_EXPIRY_HOURS = 48;

export const PILOT_LEVEL_LABELS: Record<PilotLevel, string> = {
  debutant: 'Débutant',
  progression: 'En progression',
  autonome: 'Autonome',
  confirme: 'Confirmé',
  expert: 'Expert',
  competition: 'Compétition',
};

export const PILOT_LEVEL_COLORS: Record<PilotLevel, string> = {
  debutant: '#94a3b8',
  progression: '#3b82f6',
  autonome: '#22c55e',
  confirme: '#f97316',
  expert: '#ef4444',
  competition: '#a855f7',
};

export const GENDER_LABELS: Record<Gender, string> = {
  homme: 'Homme',
  femme: 'Femme',
  autre: 'Autre',
  non_precise: 'Ne souhaite pas préciser',
};

export const WING_CATEGORY_LABELS: Record<WingCategory, string> = {
  A: 'A',
  B: 'B',
  'B+': 'B+',
  C: 'C',
  D: 'D',
  CCC: 'CCC',
  biplace: 'Biplace',
};

export const COMMON_CERTIFICATIONS = [
  'Brevet Initial',
  'Brevet de Pilote',
  'Brevet de Pilote Confirmé',
  'Biqualification',
  'Moniteur',
  'IPPI 3',
  'IPPI 4',
  'IPPI 5',
];
