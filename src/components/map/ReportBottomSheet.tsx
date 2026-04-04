'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import type { WeatherReport } from '@/lib/types';
import ReportCard from '@/components/reports/ReportCard';

interface ReportBottomSheetProps {
  reports: WeatherReport[];
  selectedReport: WeatherReport | null;
  onSelectReport: (report: WeatherReport | null) => void;
  onViewDetail: (report: WeatherReport) => void;
}

export default function ReportBottomSheet({
  reports,
  selectedReport,
  onSelectReport,
  onViewDetail,
}: ReportBottomSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedReport) setExpanded(true);
  }, [selectedReport]);

  const activeReports = reports.filter((r) => r.is_active);

  return (
    <div
      ref={sheetRef}
      className={`fixed bottom-16 left-0 right-0 z-40 bg-white rounded-t-2xl shadow-2xl transition-all duration-300 ${
        expanded ? 'max-h-[60vh]' : 'max-h-[140px]'
      }`}
    >
      {/* Handle bar */}
      <div
        className="flex items-center justify-center py-2 cursor-pointer"
        onClick={() => {
          if (selectedReport) {
            onSelectReport(null);
            setExpanded(false);
          } else {
            setExpanded(!expanded);
          }
        }}
      >
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-700">
          {selectedReport
            ? selectedReport.location_name || 'Rapport'
            : `${activeReports.length} rapport${activeReports.length !== 1 ? 's' : ''} actif${activeReports.length !== 1 ? 's' : ''}`}
        </h3>
        <div className="flex items-center gap-2">
          {selectedReport && (
            <button
              onClick={() => {
                onSelectReport(null);
                setExpanded(false);
              }}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto px-4 pb-4" style={{ maxHeight: 'calc(60vh - 60px)' }}>
        {selectedReport ? (
          <ReportCard
            report={selectedReport}
            onClick={() => onViewDetail(selectedReport)}
            expanded
          />
        ) : (
          <div className="space-y-3">
            {activeReports.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">
                Aucun rapport dans cette zone. Soyez le premier !
              </p>
            ) : (
              activeReports.slice(0, 10).map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onClick={() => onViewDetail(report)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
