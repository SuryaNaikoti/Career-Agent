import React from 'react';
import {
  MapPin,
  Briefcase,
  DollarSign,
  Bookmark,
  XCircle,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { EnrichedJobCardData } from '../../../server/services/jobExperience/jobExperienceTypes.js';

interface JobCardProps {
  data?: EnrichedJobCardData;
  job?: any;
  compact?: boolean;
  onClick?: () => void;
  onSaveToggle?: (e: React.MouseEvent) => void;
  onBookmarkToggle?: (jobId: string) => void;
  onDismiss?: (e: React.MouseEvent) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  data,
  job: legacyJob,
  compact = false,
  onClick,
  onSaveToggle,
  onBookmarkToggle,
  onDismiss,
}) => {
  // Normalize between new EnrichedJobCardData and legacy job object
  const job = data?.job || {
    id: legacyJob?.id,
    title: legacyJob?.title,
    companyName: legacyJob?.company,
    locationText: legacyJob?.location,
    workplaceType: legacyJob?.workMode || 'REMOTE',
    salaryText: legacyJob?.salary?.display,
    sourceId: legacyJob?.source || 'platform',
  };

  const match = data?.match;
  const isSaved = data ? data.isSaved : Boolean(legacyJob?.isBookmarked);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSaveToggle) {
      onSaveToggle(e);
    } else if (onBookmarkToggle && legacyJob?.id) {
      onBookmarkToggle(legacyJob.id);
    }
  };

  return (
    <div
      onClick={onClick}
      className="rounded-[22px] bg-white border border-slate-200/80 p-4 sm:p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:border-blue-300 hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)] transition-all cursor-pointer active:scale-[0.99] group space-y-3.5 relative"
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center shrink-0 text-base">
            {job.companyName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-500 truncate">{job.companyName}</div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate mt-0.5 group-hover:text-blue-600 transition-colors">
              {job.title}
            </h3>
          </div>
        </div>

        {/* Action Buttons: Save & Dismiss */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleToggle}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isSaved
                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title={isSaved ? 'Unsave Job' : 'Save Job'}
            aria-label={isSaved ? 'Unsave Job' : 'Save Job'}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Dismiss Job"
              aria-label="Dismiss Job"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Meta Badges */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
          {job.workplaceType}
        </span>
        <div className="flex items-center gap-1 text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>{job.locationText}</span>
        </div>
        {job.salaryText ? (
          <div className="flex items-center gap-1 font-medium text-emerald-700">
            <DollarSign className="w-3.5 h-3.5" />
            <span>{job.salaryText}</span>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px]">Salary not disclosed</span>
        )}
      </div>

      {/* Module 06 Match Badge or Status */}
      {match ? (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>{Math.round(match.score)}% Match</span>
            </div>
            <span className="text-[11px] font-medium text-slate-600">
              {match.matchStatus.replace(/_/g, ' ')}
            </span>
          </div>

          {match.criticalBlockers > 0 ? (
            <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Blocker
            </span>
          ) : match.requiredGaps > 0 ? (
            <span className="text-[11px] text-amber-700 font-medium">
              {match.requiredGaps} gap{match.requiredGaps > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-[11px] text-emerald-600 font-medium">Strong fit</span>
          )}
        </div>
      ) : (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Match available on opening</span>
          <span>Source: {job.sourceId}</span>
        </div>
      )}
    </div>
  );
};
