/**
 * Format a timestamp as "HH:mm · il y a Xh" format
 * Shows exact time + relative time in French
 * Examples:
 * - "14h32 · il y a 3h" (3 hours ago)
 * - "14h32 · il y a 45min" (45 minutes ago)
 * - "Hier à 14h32 (il y a 1j)" (yesterday)
 * - "07/04 à 14h32 (il y a 3j)" (3 days ago)
 */
export function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  // Calculate time difference
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Format exact time
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const exactTime = `${hours}h${minutes}`;

  // Format relative time
  let relativeTime = '';
  if (diffMinutes < 1) {
    relativeTime = 'à l\'instant';
  } else if (diffMinutes < 60) {
    relativeTime = `il y a ${diffMinutes}min`;
  } else if (diffHours < 24) {
    relativeTime = `il y a ${diffHours}h`;
  } else if (diffDays === 1) {
    relativeTime = 'il y a 1j';
  } else if (diffDays < 7) {
    relativeTime = `il y a ${diffDays}j`;
  } else {
    // For older dates, just show the date
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month} à ${exactTime}`;
  }

  return `${exactTime} · ${relativeTime}`;
}
