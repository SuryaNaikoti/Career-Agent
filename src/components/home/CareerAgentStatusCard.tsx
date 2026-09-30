import React from 'react';
import { useRouter } from '../../app/router/index.js';
import { Bot, CheckCircle2, ChevronRight, MapPin, IndianRupee, Send } from 'lucide-react';
import { CareerAgentStatus } from '../../types/agent.js';

export interface CareerAgentStatusCardProps {
  status: CareerAgentStatus;
}

export const CareerAgentStatusCard: React.FC<CareerAgentStatusCardProps> = ({ status }) => {
  const { navigate } = useRouter();

  return (
    <div
      onClick={() => navigate('/app/agent')}
      className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/50 border border-blue-100/80 p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)] cursor-pointer transition-all hover:border-blue-300 active:scale-[0.99] group"
    >
      {/* Decorative ambient gradient backdrop & paper airplane motif */}
      <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-blue-100/40 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute right-4 top-10 opacity-20 group-hover:opacity-30 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300 text-blue-600 pointer-events-none">
        <Send className="w-16 h-16 rotate-12" />
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 tracking-tight">Career Agent</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {status.statusLabel}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/app/agent');
          }}
          className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-0.5 min-h-[36px] transition-colors"
        >
          Manage <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Target search parameters */}
      <div className="mt-4 relative z-10">
        <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          Searching for
        </div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight mt-0.5">
          {status.currentSearchTitle}
        </h2>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-600 font-medium">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {status.location}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
            {status.salaryExpectation}
          </span>
        </div>
      </div>

      {/* Agent capabilities pills */}
      <div className="mt-4 pt-3.5 border-t border-slate-100/90 grid grid-cols-2 gap-2 relative z-10">
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Job Search</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Matching</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Resume Tailoring</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Gmail Tracking</span>
        </div>
      </div>
    </div>
  );
};
