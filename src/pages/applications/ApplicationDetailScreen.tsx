import React from 'react';
import { useRouter } from '../../app/router/index.js';
import { TopBar } from '../../components/navigation/TopBar.js';
import { CheckCircle2, Calendar, FileText, Video, ExternalLink, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { DEMO_APPLICATIONS } from '../../../mock/demo-data/applications.js';

export const ApplicationDetailScreen: React.FC = () => {
  const { params, navigate } = useRouter();
  const applicationId = params.applicationId;
  const application =
    DEMO_APPLICATIONS.find((a) => a.id === applicationId) || DEMO_APPLICATIONS[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      <TopBar showBack title={application.job.company} />

      <main className="max-w-[430px] mx-auto w-full px-4 pt-4 space-y-4">
        {/* Header Summary Card */}
        <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">{application.job.company}</span>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                {application.job.title}
              </h1>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
              {application.status}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
            {application.applicationCode && (
              <span>ID: <strong className="font-mono text-slate-800">{application.applicationCode}</strong></span>
            )}
            <span>·</span>
            <span>Match: <strong className="text-blue-600">{application.matchScore}%</strong></span>
          </div>
        </div>

        {/* Interview Box (if applicable) */}
        {application.interviewDetails && (
          <div className="rounded-[22px] bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 border border-indigo-100 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>Interview Scheduled</span>
            </div>

            <div className="text-sm font-bold text-slate-900">
              {application.interviewDetails.time} · {application.interviewDetails.date}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Video className="w-3.5 h-3.5 text-blue-600" />
              <span>{application.interviewDetails.type}</span>
            </div>

            {application.interviewDetails.meetingLink && (
              <Button
                size="sm"
                fullWidth
                variant="primary"
                onClick={() => {
                  alert('Video link will launch in candidate calendar.');
                }}
                rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Join Video Meeting
              </Button>
            )}
          </div>
        )}

        {/* Tailored Application Documents */}
        <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Tailored Documents
          </h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900">
                    {application.tailoredResumeName || 'Tailored_Resume.pdf'}
                  </div>
                  <div className="text-[10px] text-slate-400">Auto-tailored from verified candidate facts</div>
                </div>
              </div>
              <button
                onClick={() => navigate('/app/resume')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                View
              </button>
            </div>

            {application.coverLetterAvailable && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Cover Letter</div>
                    <div className="text-[10px] text-slate-400">Position tailored statement</div>
                  </div>
                </div>
                <button
                  onClick={() => alert('Cover letter preview')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  View
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Screening Questions Answered */}
        {application.screeningAnswers && application.screeningAnswers.length > 0 && (
          <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Screening Answers
            </h3>

            <div className="space-y-2.5">
              {application.screeningAnswers.map((item) => (
                <div key={item.questionId} className="p-3 rounded-xl bg-slate-50 text-xs space-y-1">
                  <div className="font-medium text-slate-500">{item.question}</div>
                  <div className="font-semibold text-slate-900">{item.answer}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Timeline */}
        <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Application Timeline
          </h3>

          <div className="space-y-4">
            {application.timeline.map((event, idx) => (
              <div key={event.id} className="flex items-start gap-3 text-xs">
                {event.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : event.status === 'current' ? (
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    ●
                  </span>
                ) : (
                  <Clock className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">{event.title}</span>
                    <span className="text-[10px] text-slate-400">{event.timestamp}</span>
                  </div>
                  {event.description && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{event.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ask Career Agent Action */}
        <Button
          fullWidth
          variant="secondary"
          onClick={() => navigate('/app/agent')}
          leftIcon={<Sparkles className="w-4 h-4 text-blue-600" />}
        >
          Ask Career Agent about this application
        </Button>
      </main>
    </div>
  );
};
