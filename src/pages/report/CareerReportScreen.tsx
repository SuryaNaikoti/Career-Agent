import React, { useEffect, useState } from 'react';
import { useRouter } from '../../app/router/index.js';
import { TopBar } from '../../components/navigation/TopBar.js';
import { Button } from '../../components/ui/Button.js';
import { reportsApiClient } from '../../features/notifications/notifications.api.js';
import { DailyCareerReportRecord } from '../../../server/services/notification/notificationTypes.js';
import {
  Calendar,
  Sparkles,
  ArrowRight,
  Briefcase,
  AlertCircle,
  PartyPopper,
  XCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';

export const CareerReportScreen: React.FC = () => {
  const { navigate } = useRouter();
  const [report, setReport] = useState<DailyCareerReportRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadReport = async (force = false) => {
    try {
      if (force) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await reportsApiClient.getTodayReport(force);
      setReport(data);
    } catch (err: any) {
      alert(err.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const facts = report?.summaryData;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 lg:pb-12">
      <TopBar title="Daily Career Report" showBack onBack={() => navigate('/app/home')} />

      <main className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-4 md:pt-6 space-y-5">
        {/* Header Lockup */}
        <div className="rounded-[24px] bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">
                Daily Summary
              </span>
            </div>
            <button
              onClick={() => loadReport(true)}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-indigo-200 transition-colors"
              aria-label="Refresh report"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <h1 className="text-xl font-extrabold tracking-tight mt-3">
            {facts?.periodDate ? `Report for ${facts.periodDate}` : 'Loading Report...'}
          </h1>
          <p className="text-xs text-indigo-200/80 mt-1">
            Timezone: {facts?.timezone || 'UTC'} • Grounded in confirmed facts
          </p>
        </div>

        {/* AI Narrative Summary Card (if available) */}
        {report?.generatedSummary && (
          <div className="rounded-[22px] bg-white border border-indigo-100 p-5 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>AI Executive Summary</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
              {report.generatedSummary}
            </p>
          </div>
        )}

        {/* Priorities Section */}
        {facts && facts.priorities.length > 0 && (
          <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Today's Priorities
            </h2>
            <div className="space-y-2">
              {facts.priorities.map((p, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-800">
                  <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    {idx + 1}
                  </div>
                  <span className="leading-snug pt-0.5">{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* High-Impact Events: Interviews & Offers */}
        {facts && (facts.interviews.length > 0 || facts.offers.length > 0) && (
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              Interviews & Offers
            </h2>

            {facts.interviews.map((inv, idx) => (
              <div
                key={idx}
                onClick={() => inv.applicationId ? navigate(`/app/applications/${inv.applicationId}`) : navigate('/app/hiring')}
                className="rounded-[20px] bg-white border border-indigo-100 p-4 shadow-xs flex items-center justify-between cursor-pointer hover:border-indigo-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                    🎯
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{inv.company}</div>
                    <div className="text-[11px] text-slate-500">
                      {inv.role || 'Interview'}{inv.date ? ` • ${inv.date} ${inv.time || ''}` : ''}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}

            {facts.offers.map((off, idx) => (
              <div
                key={idx}
                onClick={() => navigate('/app/hiring')}
                className="rounded-[20px] bg-white border border-emerald-100 p-4 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    🎉
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{off.company}</div>
                    <div className="text-[11px] text-emerald-600 font-semibold">
                      {off.compensationAmount ? `${off.compensationCurrency || ''} ${off.compensationAmount.toLocaleString()}` : 'Job Offer Received'}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        )}

        {/* Action Required: Open Human Tasks */}
        {facts && facts.openTasks.length > 0 && (
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700 px-1 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Action Items Requiring Candidate Attention</span>
            </h2>

            {facts.openTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/app/tasks/${t.id}`)}
                className="rounded-[20px] bg-white border border-amber-200/80 p-4 shadow-xs flex items-center justify-between cursor-pointer hover:border-amber-300"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">{t.title}</div>
                  <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                    Priority: {t.priority}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-xs py-1 px-3">
                  Review
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Applications Activity Summary */}
        {facts && (
          <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Application Pipeline Activity
            </h2>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 p-2.5">
                <div className="text-lg font-extrabold text-slate-900">
                  {facts.applicationsSubmittedCount}
                </div>
                <div className="text-[10px] font-semibold text-slate-500">Submitted Yesterday</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5">
                <div className="text-lg font-extrabold text-slate-900">
                  {facts.applicationsUpdatedCount}
                </div>
                <div className="text-[10px] font-semibold text-slate-500">Status Updates</div>
              </div>
            </div>
            <div className="pt-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/app/applications')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                View all active applications →
              </Button>
            </div>
          </div>
        )}

        {/* New Job Recommendations */}
        {facts && facts.newRecommendedJobs.length > 0 && (
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              Top Recommended Matches ({facts.newRecommendedJobsCount})
            </h2>

            {facts.newRecommendedJobs.map((j) => (
              <div
                key={j.id}
                onClick={() => navigate(`/app/jobs/${j.id}`)}
                className="rounded-[20px] bg-white border border-slate-200/80 p-4 shadow-xs flex items-center justify-between cursor-pointer hover:border-slate-300"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">{j.title}</div>
                  <div className="text-[11px] text-slate-500">
                    {j.companyName}{j.locationText ? ` • ${j.locationText}` : ''}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
