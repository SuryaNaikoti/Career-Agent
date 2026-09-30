import React from 'react';
import { useRouter } from '../../app/router/index.js';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  Search,
  Check,
  Building,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Briefcase
} from 'lucide-react';
import { AgentConversationItem } from '../../types/agent.js';
import { JobCard } from '../jobs/JobCard.js';
import { JobMatchCard } from '../jobs/JobMatchCard.js';
import { HumanTaskCard } from './HumanTaskCard.js';
import { Button } from '../ui/Button.js';
import { cn } from '../../lib/utils/cn.js';

export interface AgentMessageProps {
  message: AgentConversationItem;
  onQuickAction?: (actionPrompt: string) => void;
  onPrepareAppForJob?: (jobId: string) => void;
  onSubmitApplication?: () => void;
}

export const AgentMessage: React.FC<AgentMessageProps> = ({
  message,
  onQuickAction,
  onPrepareAppForJob,
  onSubmitApplication,
}) => {
  const { navigate } = useRouter();

  // User message: right aligned
  if (message.sender === 'user') {
    return (
      <div className="flex justify-end my-3">
        <div className="max-w-[82%] bg-blue-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 text-sm font-medium shadow-sm leading-relaxed">
          {message.text}
        </div>
      </div>
    );
  }

  // Agent message: left aligned with Career Agent badge
  return (
    <div className="my-4 space-y-2.5">
      {/* Agent Brand Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 fill-white" />
        </div>
        <span className="text-xs font-bold text-slate-800 tracking-tight">Career Agent</span>
        <span className="text-[10px] text-slate-400">{message.timestamp}</span>
      </div>

      {/* Primary Message Content Based on Type */}
      <div className="space-y-3 pl-8">
        {/* Simple text or caption */}
        {message.text && (
          <div className="text-sm text-slate-800 font-medium leading-relaxed bg-white/60 p-1 rounded-xl">
            {message.text}
          </div>
        )}

        {/* 1. Welcome State: Quick Action Cards */}
        {message.type === 'welcome' && (
          <div className="space-y-2 pt-1">
            <div className="text-xs font-semibold text-slate-500 mb-2">What would you like to do?</div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => onQuickAction?.('Find senior React jobs in Hyderabad above ₹25L')}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-xs text-left transition-all group active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Find jobs for me
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Based on your profile & preferences
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
              </button>

              <button
                onClick={() => onQuickAction?.('Review and improve my resume for ATS scoring')}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-xs text-left transition-all group active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Improve my resume
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Make it ATS friendly and targeted
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
              </button>

              <button
                onClick={() => onQuickAction?.('Check my application statuses and interview responses')}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-xs text-left transition-all group active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Check my applications
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Latest updates and next steps
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* 2. Understanding Card */}
        {message.type === 'understanding' && message.understandingData && (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="space-y-2 text-xs font-medium text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{message.understandingData.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{message.understandingData.locations.join(', ')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{message.understandingData.minSalary}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{message.understandingData.experienceLevel}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <div className="text-[11px] font-semibold text-slate-400 mb-2">
                Searching across multiple sources...
              </div>
              <div className="grid grid-cols-2 gap-2">
                {message.understandingData.sources.map((src) => (
                  <div
                    key={src.name}
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-700"
                  >
                    <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{src.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. Searching Progress Card */}
        {message.type === 'searching_progress' && message.searchSteps && (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="space-y-2.5">
              {message.searchSteps.map((step) => (
                <div key={step.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{step.label}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{step.elapsedTime}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center text-xs text-blue-600 font-semibold flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <span>Finding the right opportunities for you...</span>
            </div>
          </div>
        )}

        {/* 4. Job Results in Chat */}
        {message.type === 'job_results' && message.jobs && (
          <div className="space-y-3">
            {message.jobs.map((job) => (
              <div key={job.id} className="space-y-2">
                <JobCard job={job} compact />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    fullWidth
                    variant="primary"
                    onClick={() => onPrepareAppForJob?.(job.id)}
                  >
                    Prepare Application
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/app/jobs/${job.id}`)}
                  >
                    View Job
                  </Button>
                </div>
              </div>
            ))}

            <button
              onClick={() => navigate('/app/jobs')}
              className="w-full py-2.5 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 min-h-[36px]"
            >
              View all 11 jobs <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 5. Job Detail in Chat */}
        {message.type === 'job_detail' && message.selectedJob && (
          <JobMatchCard
            job={message.selectedJob}
            onPrepareApplication={() => onPrepareAppForJob?.(message.selectedJob!.id)}
          />
        )}

        {/* 6. Application Preparation Checklist */}
        {message.type === 'application_prep' && message.prepSteps && (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-2.5">
            {message.prepSteps.map((step) => (
              <div key={step.id} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{step.label}</span>
              </div>
            ))}
            <div className="pt-2 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <span>Your application is ready for review! 🎉</span>
            </div>
          </div>
        )}

        {/* 7. Application Preview Card */}
        {message.type === 'application_preview' && message.selectedJob && (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Application Ready</h4>
                <p className="text-[11px] text-slate-500">Review everything before we submit</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {message.selectedJob.matchPercentage}% Match
              </span>
            </div>

            {/* Generated Items */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="font-semibold text-slate-800">Tailored Resume</div>
                    <div className="text-[10px] text-slate-400">Surya_Naikoti_AxisTech.pdf</div>
                  </div>
                </div>
                <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1">
                  Preview
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="font-semibold text-slate-800">Cover Letter</div>
                    <div className="text-[10px] text-slate-400">Personalized for this position</div>
                  </div>
                </div>
                <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1">
                  Preview
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-semibold text-slate-800">Screening Questions</div>
                    <div className="text-[10px] text-slate-400">4 / 4 answered</div>
                  </div>
                </div>
                <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1">
                  Review
                </button>
              </div>
            </div>

            <Button
              size="md"
              fullWidth
              variant="primary"
              onClick={onSubmitApplication}
            >
              Continue to Submit
            </Button>
          </div>
        )}

        {/* 8. Human Task Needs Input */}
        {message.type === 'human_task' && message.humanTask && (
          <HumanTaskCard task={message.humanTask} />
        )}

        {/* 9. Submission Success Card */}
        {message.type === 'submission_success' && (
          <div className="rounded-2xl bg-white border border-emerald-200/80 p-5 shadow-sm text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Application Submitted! 🎉</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Your application has been successfully submitted. I'll track this for you.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-emerald-700">Submitted</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Application ID</span>
                <span className="font-mono text-slate-800 font-semibold">{message.applicationCode || 'AXT-2024-0912'}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                fullWidth
                variant="primary"
                onClick={() => navigate('/app/applications')}
              >
                View Applications
              </Button>
              <Button
                size="sm"
                fullWidth
                variant="secondary"
                onClick={() => navigate('/app/jobs')}
              >
                Find Similar Jobs
              </Button>
            </div>
          </div>
        )}

        {/* 10. Follow-up Status Timeline */}
        {message.type === 'followup_status' && (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="text-xs font-semibold text-slate-900 mb-2">Live Application Timeline</div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-800">Application submitted</div>
                  <div className="text-[11px] text-slate-400">Sep 30, 10:42 AM</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  ●
                </span>
                <div>
                  <div className="font-bold text-blue-600">Under review</div>
                  <div className="text-[11px] text-slate-500">Expected response in 3–5 days</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 opacity-60">
                <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-600">Recruiter response / Interview</div>
                  <div className="text-[11px] text-slate-400">Next milestone</div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              I'll monitor your connected Gmail and notify you as soon as there is an update.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
