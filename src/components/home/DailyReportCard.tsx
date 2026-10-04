import React, { useEffect, useState } from 'react';
import { useRouter } from '../../app/router/index.js';
import { reportsApiClient } from '../../features/notifications/notifications.api.js';
import { DailyCareerReportRecord } from '../../../server/services/notification/notificationTypes.js';
import { Sparkles, ArrowRight, Calendar, AlertCircle } from 'lucide-react';

export const DailyReportCard: React.FC = () => {
  const { navigate } = useRouter();
  const [report, setReport] = useState<DailyCareerReportRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    reportsApiClient
      .getTodayReport()
      .then((data) => {
        if (isMounted) setReport(data);
      })
      .catch(() => {
        if (isMounted) setReport(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-[22px] bg-white border border-slate-200/80 p-4 shadow-xs animate-pulse space-y-2">
        <div className="h-4 w-32 bg-slate-100 rounded" />
        <div className="h-3 w-48 bg-slate-100 rounded" />
      </div>
    );
  }

  const facts = report?.summaryData;
  if (!facts) return null;

  return (
    <div
      onClick={() => navigate('/app/report')}
      className="rounded-[22px] bg-gradient-to-br from-white via-indigo-50/20 to-blue-50/30 border border-indigo-100/70 p-4 shadow-xs hover:border-indigo-200 transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 fill-white" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900">
            Today's Career Report
          </span>
        </div>
        <div className="text-[10px] font-semibold text-slate-400">
          {facts.periodDate}
        </div>
      </div>

      {/* Metric highlights */}
      <div className="grid grid-cols-3 gap-2 py-1">
        <div className="rounded-xl bg-white/80 border border-slate-100 p-2 text-center">
          <div className="text-base font-extrabold text-slate-900">
            {facts.newRecommendedJobsCount}
          </div>
          <div className="text-[9px] font-semibold text-slate-500">New Matches</div>
        </div>

        <div className="rounded-xl bg-white/80 border border-slate-100 p-2 text-center">
          <div className="text-base font-extrabold text-indigo-600">
            {facts.interviewsCount}
          </div>
          <div className="text-[9px] font-semibold text-slate-500">Interviews</div>
        </div>

        <div className="rounded-xl bg-white/80 border border-slate-100 p-2 text-center">
          <div className={`text-base font-extrabold ${facts.openTasksCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {facts.openTasksCount}
          </div>
          <div className="text-[9px] font-semibold text-slate-500">Actions</div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-indigo-100/40 text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-700">
        <span>View full daily summary</span>
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
};
