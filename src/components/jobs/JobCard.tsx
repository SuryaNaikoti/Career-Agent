import React from 'react';
import { useRouter } from '../../app/router/index.js';
import { Bookmark, CheckCircle2, Star, MapPin, IndianRupee, Clock } from 'lucide-react';
import { Job } from '../../types/job.js';
import { cn } from '../../lib/utils/cn.js';

export interface JobCardProps {
  job: Job;
  onBookmarkToggle?: (jobId: string) => void;
  compact?: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onBookmarkToggle,
  compact = false,
}) => {
  const { navigate } = useRouter();

  return (
    <div
      onClick={() => navigate(`/app/jobs/${job.id}`)}
      className="rounded-[22px] bg-white border border-slate-200/80 p-4 sm:p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:border-blue-300 hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)] transition-all cursor-pointer active:scale-[0.99] group"
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Company monogram */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base text-white shrink-0 shadow-2xs"
            style={{ backgroundColor: job.companyColor || '#0F172A' }}
          >
            {job.companyLetter}
          </div>

          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500 truncate">{job.company}</div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate mt-0.5 group-hover:text-blue-600 transition-colors">
              {job.title}
            </h3>
          </div>
        </div>

        {/* Match Percentage Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold tracking-tight',
              job.matchPercentage >= 90
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200/70'
            )}
          >
            {job.matchPercentage >= 90 ? (
              <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-600 text-white" />
            ) : (
              <Star className="w-3.5 h-3.5 fill-indigo-600 text-white" />
            )}
            <span className="tabular-numbers">{job.matchPercentage}% Match</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookmarkToggle?.(job.id);
            }}
            aria-label="Bookmark job"
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors min-w-[36px] min-h-[36px]',
              job.isBookmarked
                ? 'text-blue-600 bg-blue-50'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            )}
          >
            <Bookmark className={cn('w-4 h-4', job.isBookmarked && 'fill-current')} />
          </button>
        </div>
      </div>

      {/* Middle Specs Row: Salary, Location, Time */}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 mt-3.5 text-xs text-slate-600">
        <span className="inline-flex items-center gap-0.5 font-semibold text-slate-800">
          <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
          {job.salary.display}
        </span>
        <span className="text-slate-300">·</span>
        <span className="inline-flex items-center gap-1 font-medium">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          {job.location}
        </span>
        <span className="text-slate-300">·</span>
        <span className="inline-flex items-center gap-1 text-slate-400">
          <Clock className="w-3 h-3" />
          {job.postedAt}
        </span>
      </div>

      {/* Skills list */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3.5 pt-3 border-t border-slate-100">
          {job.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700"
            >
              {skill}
            </span>
          ))}
          {job.skills.length > 4 && (
            <span className="text-[11px] font-medium px-1.5 py-0.5 text-slate-400">
              +{job.skills.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
