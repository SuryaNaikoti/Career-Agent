import React from 'react';
import { useRouter } from '../../app/router/index.js';
import { Calendar, Video, ChevronRight, Briefcase } from 'lucide-react';
import { UpcomingEvent } from '../../types/candidate.js';

export interface UpcomingInterviewCardProps {
  event: UpcomingEvent;
}

export const UpcomingInterviewCard: React.FC<UpcomingInterviewCardProps> = ({ event }) => {
  const { navigate } = useRouter();

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">Upcoming</h3>
        <button
          onClick={() => navigate('/app/applications')}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 min-h-[36px] flex items-center"
        >
          View all
        </button>
      </div>

      <div
        onClick={() => navigate('/app/applications/app-2')}
        className="rounded-[20px] bg-white border border-slate-200/80 p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:border-blue-200 transition-all cursor-pointer active:scale-[0.99] flex items-center gap-3.5 group"
      >
        {/* Calendar square badge */}
        <div className="w-13 h-14 rounded-2xl border border-blue-100 overflow-hidden shrink-0 shadow-2xs text-center flex flex-col">
          <div className="bg-blue-600 text-white text-[10px] font-bold py-0.5 tracking-wider uppercase">
            {event.dateMonth}
          </div>
          <div className="flex-1 bg-white text-slate-900 text-xl font-extrabold flex items-center justify-center">
            {event.dateDay}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-semibold truncate">
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span>{event.type}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
              <span>{event.timeElapsed}</span>
              {event.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
            </div>
          </div>

          <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
            {event.jobTitle}
          </div>
          <div className="text-xs text-slate-500 font-medium truncate">
            {event.company}
          </div>

          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1 font-medium">
              <Calendar className="w-3 h-3 text-slate-400" />
              {event.timeString}
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              <Video className="w-3 h-3 text-slate-400" />
              {event.format}
            </span>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </div>
  );
};
