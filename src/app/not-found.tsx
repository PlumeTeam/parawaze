import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-500 via-sky-400 to-sky-600 flex flex-col items-center justify-center px-6 text-center">
      <svg width="64" height="64" viewBox="0 0 40 40" fill="none" className="mb-6">
        <path
          d="M20 4C18 4 8 18 8 24c0 4 3 8 8 8h0c1-3 3-5 4-5s3 2 4 5h0c5 0 8-4 8-8C32 18 22 4 20 4z"
          fill="white"
          fillOpacity="0.9"
        />
        <path
          d="M14 14c0 0 3-2 6-2s6 2 6 2"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      <h1 className="text-6xl font-bold text-white mb-2">404</h1>
      <h2 className="text-xl font-semibold text-white/90 mb-4">Page introuvable</h2>
      <p className="text-sky-100 mb-8 max-w-sm">
        Cette page n&apos;existe pas ou a été déplacée. Retournez à la carte pour consulter la météo.
      </p>

      <Link
        href="/map"
        className="px-6 py-3 rounded-xl bg-white text-sky-600 font-semibold shadow-lg hover:shadow-xl transition-all"
      >
        Retour à la carte
      </Link>
    </div>
  );
}
