import React, { useState } from 'react';
import { useRouter } from '../../app/router/index.js';
import { CheckCircle2, AlertCircle, Bookmark, Share2, ArrowRight, IndianRupee, MapPin, Briefcase } from 'lucide-react';
import { Job } from '../../types/job.js';
import { Button } from '../ui/Button.js';
import { cn } from '../../lib/utils/cn.js';

export interface JobMatchCardProps {
  job: Job;
  onPrepareApplication?: (job: Job) => void;
}

export const JobMatchCard: React.FC<JobMatchCardProps> = ({
  job,
  onPrepareApplication,
}) => {
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState<'match' | 'details' | 'company'>('match');

  return (
    <div className="rounded-[24px] bg-white border border-slate-200/90 p-5 shadow-[0_8px_25px_rgba(15,23,42,0.06)]">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white shrink-0 shadow-xs"
            style={{ backgroundColor: job.companyColor || '#0F172A' }}
          >
            {job.companyLetter}
          </div>
          <div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-600 text-white" />
              <span>{job.matchPercentage}% Match</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
              {job.title}
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">{job.company}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            aria-label="Bookmark"
            className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <Bookmark className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Meta Specs Grid */}
      <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100/80 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
          <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
          <span>{job.salary.display}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
          <span>{job.experienceRequired}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>{job.location}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span>Full Time · {job.workMode}</span>
        </div>
      </div>

      {/* Segmented Detail Tabs */}
      <div className="flex border-b border-slate-200 mt-4 mb-3">
        <button
          onClick={() => setActiveTab('match')}
          className={cn(
            'flex-1 pb-2.5 text-xs font-semibold tracking-tight text-center border-b-2 transition-colors min-h-[36px]',
            activeTab === 'match'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          Why it matches
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={cn(
            'flex-1 pb-2.5 text-xs font-semibold tracking-tight text-center border-b-2 transition-colors min-h-[36px]',
            activeTab === 'details'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          Job details
        </button>
        <button
          onClick={() => setActiveTab('company')}
          className={cn(
            'flex-1 pb-2.5 text-xs font-semibold tracking-tight text-center border-b-2 transition-colors min-h-[36px]',
            activeTab === 'company'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          Company
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'match' && job.matchAnalysis && (
        <div className="space-y-4">
          {/* Matching Factors */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Strengths & Matches
            </div>
            <div className="space-y-2">
              {job.matchAnalysis.matchingFactors.map((factor, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Potential Gaps */}
          {job.matchAnalysis.potentialGaps.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Potential gaps to address in application</span>
              </div>
              <div className="space-y-1.5">
                {job.matchAnalysis.potentialGaps.map((gap, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{gap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'details' && (
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>{job.description}</p>
          {job.responsibilities && (
            <div>
              <div className="font-semibold text-slate-900 mb-1.5">Key Responsibilities:</div>
              <ul className="list-disc pl-4 space-y-1">
                {job.responsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'company' && (
        <div className="text-xs text-slate-600 leading-relaxed space-y-2">
          <p className="font-semibold text-slate-900">{job.company}</p>
          <p>Verified hiring employer partnering with Career Agent for qualified technical roles in India and remote distributed teams.</p>
        </div>
      )}

      {/* CTA Bottom Row */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
        <Button
          fullWidth
          variant="primary"
          onClick={() => {
            if (onPrepareApplication) {
              onPrepareApplication(job);
            } else {
              navigate('/app/agent');
            }
          }}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Prepare Application
        </Button>
      </div>
    </div>
  );
};
