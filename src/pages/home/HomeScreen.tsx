import React, { useState } from 'react';
import { useRouter } from '../../app/router/index.js';
import { TopBar } from '../../components/navigation/TopBar.js';
import { useAuth } from '../../features/authentication/auth.context.js';
import { CareerAgentStatusCard } from '../../components/home/CareerAgentStatusCard.js';
import { ActivityCardsGrid } from '../../components/home/ActivityCardsGrid.js';
import { UpcomingInterviewCard } from '../../components/home/UpcomingInterviewCard.js';
import { DailyReportCard } from '../../components/home/DailyReportCard.js';
import { JobCard } from '../../components/jobs/JobCard.js';
import { Sparkles, ArrowRight, Search, FileText, Briefcase, Bot } from 'lucide-react';
import { DEMO_AGENT_STATUS } from '../../../mock/demo-data/agent.js';
import { DEMO_METRICS, DEMO_UPCOMING_EVENT, DEMO_CANDIDATE } from '../../../mock/demo-data/candidate.js';
import { DEMO_JOBS } from '../../../mock/demo-data/jobs.js';

export const HomeScreen: React.FC = () => {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [commandInput, setCommandInput] = useState('');
  const [jobs, setJobs] = useState(DEMO_JOBS);

  // Derive candidate name dynamically from authenticated user or fallback cleanly
  const candidateName =
    (user?.userMetadata?.full_name as string) ||
    (user?.email ? user.email.split('@')[0] : DEMO_CANDIDATE.name);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    navigate('/app/agent');
  };

  const handleBookmarkToggle = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, isBookmarked: !j.isBookmarked } : j))
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 lg:pb-12">
      {/* Sticky Mobile Top Bar */}
      <TopBar />

      <main className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-4 md:pt-6 space-y-6">
        {/* Greeting & AI Companion Lockup */}
        <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 p-5 border border-blue-100/60 shadow-xs">
          <div className="flex items-start justify-between">
            <div className="max-w-[65%]">
              <div className="text-xs font-semibold text-slate-500">Good morning,</div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                {candidateName} 👋
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed mt-2">
                Your AI career agent is working for you. Let's make progress today.
              </p>
            </div>

            {/* AI Companion Floating Mascot Emblem */}
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 bg-blue-400/10 rounded-full blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 p-0.5 shadow-lg shadow-blue-500/20">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex flex-col items-center justify-center text-white relative overflow-hidden">
                  <div className="absolute top-1 right-1">
                    <Sparkles className="w-3 h-3 text-blue-300" />
                  </div>
                  <Bot className="w-9 h-9 text-blue-400 drop-shadow-md" />
                  <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-blue-200">
                    <span>Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Command Box */}
        <section className="space-y-2.5">
          <form
            onSubmit={handleCommandSubmit}
            className="relative rounded-2xl bg-white border border-slate-200 shadow-sm p-2 flex items-center gap-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 fill-blue-600" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-slate-800 leading-tight">
                What should I find for you?
              </div>
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="e.g. Find senior React jobs in Hyderabad..."
                className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none mt-0.5"
              />
            </div>

            <button
              type="submit"
              aria-label="Send query to agent"
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs hover:bg-blue-700 active:scale-95 transition-all shrink-0"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Action Horizontal Mobile Carousel */}
          <div className="-mx-4 px-4 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 touch-pan-x">
            <button
              onClick={() => navigate('/app/jobs')}
              className="inline-flex items-center gap-2 px-3.5 h-10 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all whitespace-nowrap shrink-0 active:scale-[0.98]"
            >
              <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Find Jobs</span>
            </button>

            <button
              onClick={() => navigate('/app/resume')}
              className="inline-flex items-center gap-2 px-3.5 h-10 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all whitespace-nowrap shrink-0 active:scale-[0.98]"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Improve My Resume</span>
            </button>

            <button
              onClick={() => navigate('/app/applications')}
              className="inline-flex items-center gap-2 px-3.5 h-10 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all whitespace-nowrap shrink-0 active:scale-[0.98]"
            >
              <Briefcase className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Track Applications</span>
            </button>

            {/* Trailing clearance spacer so final item is never clipped at the right edge */}
            <div className="w-2 shrink-0" aria-hidden="true" />
          </div>
        </section>

        {/* Daily Career Report Card (Module 12) */}
        <section>
          <DailyReportCard />
        </section>

        {/* Career Agent Status Card */}
        <section>
          <CareerAgentStatusCard status={DEMO_AGENT_STATUS} />
        </section>

        {/* Today's Activity Stats Grid */}
        <section>
          <ActivityCardsGrid metrics={DEMO_METRICS} />
        </section>

        {/* Upcoming Interview Card */}
        <section>
          <UpcomingInterviewCard event={DEMO_UPCOMING_EVENT} />
        </section>

        {/* Recommended Jobs Section */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Recommended for you</h3>
            <button
              onClick={() => navigate('/app/jobs')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 min-h-[36px] flex items-center"
            >
              View all
            </button>
          </div>

          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onBookmarkToggle={handleBookmarkToggle}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
