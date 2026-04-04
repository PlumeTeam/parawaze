import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ParaWaze - Météo collaborative parapente',
  description: 'La météo collaborative des pilotes de parapente. Partagez et consultez les conditions en temps réel.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ParaWaze',
  },
  icons: {
    icon: '/icons/icon-192.png',
  },
  openGraph: {
    title: 'ParaWaze - Météo collaborative parapente',
    description: 'La météo collaborative des pilotes de parapente',
    type: 'website',
    url: 'https://parawaze.vercel.app',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#111827',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
