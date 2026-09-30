import React from 'react';
import { useRouter } from '../../app/router/index.js';
import { CheckCircle2, Clock, Calendar, ArrowRight, ChevronRight, FileCheck } from 'lucide-react';
import { JobApplication, ApplicationStatus } from '../../types/application.js';
import { Badge } from '../ui/Badge.js';
import { cn } from '../../lib/utils/cn.js';

export interface ApplicationCardProps {
  application: JobApplication;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({ application }) => {
  const { navigate } = useRouter();

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'Submitted':
        return (
          <Badge variant="match" icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />}>
            Submitted
          </Badge>
        );
      case 'Interview':
        return (
          <Badge variant="purple" icon={<Calendar className="w-3 h-3 text-indigo-600" />}>
            Interview Scheduled
          </Badge>
        );
      case 'Ready':
        return (
          <Badge variant="blue" icon={<FileCheck className="w-3 h-3 text-blue-600" />}>
            Ready to Submit
          </Badge>
        );
      case 'Screening':
        return (
          <Badge variant="warning" icon={<Clock className="w-3 h-3 text-amber-600" />}>
            Screening
          </Badge>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div
      onClick={() => navigate(`/app/applications/${application.id}`)}
      className="rounded-[22px] bg-white border border-slate-200/80 p-4 sm:p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:border-blue-200 transition-all cursor-pointer active:scale-[0.99] group"
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base text-white shrink-0 shadow-2xs"
            style={{ backgroundColor: application.job.companyColor || '#0F172A' }}
          >
            {application.job.companyLetter}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500 truncate">{application.job.company}</div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate mt-0.5 group-hover:text-blue-600 transition-colors">
              {application.job.title}
            </h3>
          </div>
        </div>

        <div className="shrink-0">{getStatusBadge(application.status)}</div>
      </div>

      {/* Meta Specs & Code */}
      <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-slate-100 text-xs text-slate-500">
        <div>
          {application.applicationCode ? (
            <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              {application.applicationCode}
            </span>
          ) : (
            <span>Match: <strong className="text-slate-800">{application.matchScore}%</strong></span>
          )}
        </div>
        <div className="text-[11px] text-slate-400">
          Updated {application.lastUpdated}
        </div>
      </div>

      {/* Next step note */}
      {application.nextStep && (
        <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 flex items-center justify-between gap-2">
          <span className="truncate">{application.nextStep}</span>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
        </div>
      )}
    </div>
  );
};
