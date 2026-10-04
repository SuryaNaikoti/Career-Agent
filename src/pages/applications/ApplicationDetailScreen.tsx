import React, { useState, useEffect } from 'react';
import { useRouter } from '../../app/router/index.js';
import { TopBar } from '../../components/navigation/TopBar.js';
import { CheckCircle2, Calendar, FileText, Video, ExternalLink, ArrowRight, Clock, Sparkles, AlertCircle, Send, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { applicationsApiClient } from '../../features/applications/applications.api.js';
import { DEMO_APPLICATIONS } from '../../../mock/demo-data/applications.js';

export const ApplicationDetailScreen: React.FC = () => {
  const { params, navigate } = useRouter();
  const applicationId = params.applicationId;
  const [detailData, setDetailData] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (!applicationId) return;
    applicationsApiClient.getApplicationDetail(applicationId)
      .then((data) => setDetailData(data))
      .catch(() => setDetailData(null));
  }, [applicationId]);

  const fallbackApp = DEMO_APPLICATIONS.find((a) => a.id === applicationId) || DEMO_APPLICATIONS[0];

  const app = detailData?.application;
  const job = detailData?.job;
  const humanTask = detailData?.humanTasks?.[0];
  const history = detailData?.history || [];

  const company = job?.companyName || fallbackApp.job.company;
  const title = job?.title || fallbackApp.job.title;
  const status = app?.status || fallbackApp.status;

  const handleConfirmHumanSubmission = async () => {
    if (!app) return;
    setIsSubmitting(true);
    try {
      await applicationsApiClient.confirmHumanSubmission(app.id, {
        externalApplicationId: confirmationInput || undefined,
      });
      const refreshed = await applicationsApiClient.getApplicationDetail(app.id);
      setDetailData(refreshed);
      setShowConfirmModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to confirm submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectSubmit = async () => {
    if (!app) return;
    setIsSubmitting(true);
    try {
      await applicationsApiClient.submitApplication(app.id, { candidateConfirmed: true });
      const refreshed = await applicationsApiClient.getApplicationDetail(app.id);
      setDetailData(refreshed);
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 lg:pb-12">
      <TopBar showBack title={company} />

      <main className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-4 md:pt-6 space-y-5">
        {/* Header Summary Card */}
        <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">{company}</span>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                {title}
              </h1>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              status === 'SUBMITTED' ? 'text-emerald-700 bg-emerald-50 border-emerald-200/60' :
              status === 'HUMAN_ACTION_REQUIRED' ? 'text-amber-700 bg-amber-50 border-amber-200/60' :
              'text-blue-700 bg-blue-50 border-blue-200/60'
            }`}>
              {status}
            </span>
          </div>

          {/* Submission Verification & Provenance Status Banner */}
          {status === 'SUBMITTED' && (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              app?.isVerifiedSubmission && app?.submissionVerificationSource === 'AUTHORIZED_ADAPTER'
                ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                : 'bg-blue-50/70 border-blue-200/80 text-blue-900'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${
                  app?.isVerifiedSubmission ? 'text-emerald-600' : 'text-blue-600'
                }`} />
                <span className="font-medium">
                  {app?.isVerifiedSubmission && app?.submissionVerificationSource === 'AUTHORIZED_ADAPTER'
                    ? 'Submitted — verified by Career Agent ATS integration'
                    : 'Submitted — confirmed by you (human workflow)'}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
            {app?.externalApplicationId ? (
              <div className="flex items-center justify-between">
                <span>
                  Reference ID: <strong className="font-mono text-slate-800">{app.externalApplicationId}</strong>
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                  app.externalApplicationIdProvenance === 'SYSTEM_VERIFIED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  Source: {app.externalApplicationIdProvenance === 'SYSTEM_VERIFIED' ? 'System Verified' : 'Candidate Provided'}
                </span>
              </div>
            ) : app?.idempotencyKey ? (
              <div>
                <span>Ref: <strong className="font-mono text-slate-700 text-[10px]">{app.idempotencyKey.slice(0, 16)}...</strong></span>
              </div>
            ) : null}

            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
              <span>Method: <strong className="text-slate-700">{app?.submissionMethod || 'Direct Gateway'}</strong></span>
            </div>
          </div>
        </div>

        {/* Human Action Required Banner */}
        {status === 'HUMAN_ACTION_REQUIRED' && humanTask && (
          <div className="rounded-[22px] bg-amber-50/80 border border-amber-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Human Action Required</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              {humanTask.reason}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <a
                href={humanTask.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all"
              >
                <span>Open Application on Company Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => setShowConfirmModal(true)}
                leftIcon={<Check className="w-4 h-4 text-emerald-600" />}
              >
                I have submitted this application
              </Button>
            </div>
          </div>
        )}

        {/* Direct Submission Action for Ready Applications */}
        {status === 'READY_FOR_SUBMISSION' && (
          <div className="rounded-[22px] bg-blue-50/70 border border-blue-200/80 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">
              Ready for Submission
            </h3>
            <p className="text-xs text-blue-900 leading-relaxed">
              Your application materials are verified and grounded in candidate truth. Authorized API submission can be dispatched directly.
            </p>
            <Button
              variant="primary"
              size="md"
              fullWidth
              isLoading={isSubmitting}
              onClick={handleDirectSubmit}
              rightIcon={<Send className="w-4 h-4" />}
            >
              Submit Application Now
            </Button>
          </div>
        )}

        {/* Interview Box (if applicable) */}
        {fallbackApp.interviewDetails && (
          <div className="rounded-[22px] bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 border border-indigo-100 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>Interview Scheduled</span>
            </div>

            <div className="text-sm font-bold text-slate-900">
              {fallbackApp.interviewDetails.time} · {fallbackApp.interviewDetails.date}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Video className="w-3.5 h-3.5 text-blue-600" />
              <span>{fallbackApp.interviewDetails.type}</span>
            </div>

            {fallbackApp.interviewDetails.meetingLink && (
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
                    {fallbackApp.tailoredResumeName || 'Tailored_Resume.pdf'}
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

            {fallbackApp.coverLetterAvailable && (
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
        {fallbackApp.screeningAnswers && fallbackApp.screeningAnswers.length > 0 && (
          <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Screening Answers
            </h3>

            <div className="space-y-2.5">
              {fallbackApp.screeningAnswers.map((item: any) => (
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
            Application Timeline & Audit History
          </h3>

          <div className="space-y-4">
            {history.length > 0 ? (
              history.map((h: any, idx: number) => (
                <div key={h.id || idx} className="flex items-start gap-3 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{h.newStatus}</span>
                      <span className="text-[10px] text-slate-400">{new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{h.reason}</p>
                    <div className="text-[9px] text-slate-400 mt-0.5">Actor: {h.actorType}</div>
                  </div>
                </div>
              ))
            ) : (
              fallbackApp.timeline.map((event) => (
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
              ))
            )}
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              Confirm Submission
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Please confirm that you have submitted the application on the employer's portal. If an external application ID or confirmation code was provided, you may enter it below:
            </p>
            <input
              type="text"
              placeholder="e.g. APP-948210 (Optional)"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 font-mono"
            />
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                fullWidth
                isLoading={isSubmitting}
                onClick={handleConfirmHumanSubmission}
              >
                Confirm Submitted
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
