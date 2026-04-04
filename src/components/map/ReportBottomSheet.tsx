'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import type { WeatherReport } from '@/lib/types';
import type { DayFilter } from '@/hooks/useReports';
import ReportCard from '@/components/reports/ReportCard';

interface ReportBottomSheetProps {
  reports: WeatherReport[];
  selectedReport: WeatherReport | null;
  onSelectReport: (report: WeatherReport | null) => void;
  onViewDetail: (report: WeatherReport) => void;
  selectedDay?: DayFilter;
}

function getDayTitle(reports: WeatherReport[], day: DayFilter = 'today'): string {
  const count = reports.length;
  if (day === 'yesterday') {
    return `${count} rapport${count !== 1 ? 's' : ''} hier`;
  }
  if (day === 'tomorrow') {
    return `${count} prévision${count !== 1 ? 's' : ''} pour demain`;
  }
  return `${count} rapport${count !== 1 ? 's' : ''} actif${count !== 1 ? 's' : ''}`;
}

export default function ReportBottomSheet({
  reports,
  selectedReport,
  onSelectReport,
  onViewDetail,
  selectedDay = 'today',
}: ReportBottomSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedReport) setExpanded(true);
  }, [selectedReport]);

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
            : getDayTitle(reports, selectedDay)}
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
            {reports.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">
                {selectedDay === 'yesterday'
                  ? 'Aucun rapport hier.'
                  : selectedDay === 'tomorrow'
                  ? 'Aucune prévision pour demain. Soyez le premier !'
                  : 'Aucun rapport dans cette zone. Soyez le premier !'}
              </p>
            ) : (
              reports.slice(0, 10).map((report) => (
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
