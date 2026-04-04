'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useReports } from '@/hooks/useReports';
import ReportDetail from '@/components/reports/ReportDetail';
import BottomNav from '@/components/shared/BottomNav';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { WeatherReport } from '@/lib/types';

export default function ReportDetailPage() {
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
    if (id) {
      setLoading(true);
      getReport(id)
        .then(setReport)
        .catch(() => router.push('/map'))
        .finally(() => setLoading(false));
    }
  }, [id, getReport, router]);

  const handleRefresh = async () => {
    if (id) {
      const updated = await getReport(id);
      setReport(updated);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!report) return null;

  return (
    <>
      <ReportDetail
        report={report}
        onBack={() => router.back()}
        onRefresh={handleRefresh}
      />
      <BottomNav />
    </>
  );
}
