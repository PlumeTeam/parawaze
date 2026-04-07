'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useReports } from '@/hooks/useReports';
import ReportForm from '@/components/reports/ReportForm';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { WeatherReport } from '@/lib/types';

export default function EditReportPage() {
  const { user, loading: authLoading } = useAuth();
  const { getReport } = useReports();
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (id && user) {
      setLoading(true);
      getReport(id)
        .then((data) => {
          // Only allow editing own reports
          if (data.author_id !== user.id) {
            router.push(`/report/${id}`);
            return;
          }
          setReport(data);
        })
        .catch(() => router.push('/map'))
        .finally(() => setLoading(false));
    }
  }, [id, user, getReport, router]);

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || !report) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-30 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Modifier le rapport</h1>
        </div>
      </header>

      <div className="px-4 pt-4">
        <Suspense fallback={<LoadingSpinner size="lg" />}>
          <ReportForm initialData={report} reportId={id} />
        </Suspense>
      </div>

      <BottomNav />
    </div>
  );
}
