import React, { useState, useEffect } from 'react';
import { useRouter } from '../../app/router/index.js';
import { TopBar } from '../../components/navigation/TopBar.js';
import { Button } from '../../components/ui/Button.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  Briefcase,
  ExternalLink,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { applicationsApiClient } from '../../features/applications/applications.api.js';
import {
  ApplicationPreparationPackage,
  ApplicationReviewItem,
} from '../../../server/services/applicationPreparation/applicationPreparationTypes.js';

export const PrepareApplicationScreen: React.FC = () => {
  const { params, navigate } = useRouter();
  const jobId = params.jobId || params.applicationId;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [prepPackage, setPrepPackage] = useState<ApplicationPreparationPackage | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'resume' | 'cover_letter' | 'questions'>('overview');
  const [resolvingItemId, setResolvingItemId] = useState<string | null>(null);
  const [candidateAnswerInput, setCandidateAnswerInput] = useState<string>('');
  const [submittingResolution, setSubmittingResolution] = useState<boolean>(false);

  useEffect(() => {
    if (!jobId) {
      setError('No target job specified for application preparation.');
      setLoading(false);
      return;
    }

    const initPreparation = async () => {
      try {
        setLoading(true);
        setError(null);
        // Try getting existing preparation or initialize a fresh one
        let data: ApplicationPreparationPackage;
        try {
          data = await applicationsApiClient.getPreparation(jobId);
        } catch {
          data = await applicationsApiClient.prepareApplication(jobId);
        }
        setPrepPackage(data);
      } catch (err: any) {
        setError(err.message || 'Failed to prepare application materials.');
      } finally {
        setLoading(false);
      }
    };

    initPreparation();
  }, [jobId]);

  const handleResolveReview = async (item: ApplicationReviewItem) => {
    if (!prepPackage || !candidateAnswerInput.trim()) return;

    try {
      setSubmittingResolution(true);
      const updated = await applicationsApiClient.resolveReviewItem(
        prepPackage.preparation.id,
        item.id,
        candidateAnswerInput.trim()
      );
      setPrepPackage(updated);
      setResolvingItemId(null);
      setCandidateAnswerInput('');
    } catch (err: any) {
      alert(`Error resolving review item: ${err.message}`);
    } finally {
      setSubmittingResolution(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
        <TopBar showBack title="Application Preparation" />
        <main className="max-w-md mx-auto w-full px-4 pt-16 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500">Tailoring verified application package...</p>
        </main>
      </div>
    );
  }

  if (error || !prepPackage) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
        <TopBar showBack title="Application Preparation" />
        <main className="max-w-md mx-auto w-full px-4 pt-8">
          <EmptyState
            title="Preparation unavailable"
            description={error || 'Could not prepare materials for this job.'}
            actionLabel="Back to Jobs"
            onAction={() => navigate('/app/jobs')}
          />
        </main>
      </div>
    );
  }

  const { preparation, activeVersion, reviewItems, job } = prepPackage;
  const pendingReviews = reviewItems.filter((r) => r.status === 'PENDING');
  const isReady = preparation.isReadyForApplication && pendingReviews.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 lg:pb-12">
      <TopBar showBack title="Prepare Application" />

      <main className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-4 md:pt-6 space-y-5">
        {/* Header Opportunity Card */}
        <div className="rounded-[22px] bg-white border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-500">{job.companyName}</span>
              <h1 className="text-base font-bold text-slate-900 leading-snug">{job.title}</h1>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                <span>{job.workplaceType}</span>
                <span>•</span>
                <span>{job.locationText}</span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  isReady
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {isReady ? 'Ready for Application' : 'Review Required'}
              </span>
              <div className="text-[10px] text-slate-400 mt-1">
                Version {activeVersion?.versionNumber || 1}
              </div>
            </div>
          </div>

          {/* Readiness Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 text-xs ${
              isReady
                ? 'bg-emerald-50/70 border-emerald-200/60 text-emerald-800'
                : 'bg-amber-50/70 border-amber-200/60 text-amber-900'
            }`}
          >
            {isReady ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-semibold">
                {isReady
                  ? 'All application materials are truthful and verified.'
                  : `${pendingReviews.length} item(s) require candidate verification.`}
              </p>
              <p className="text-[11px] opacity-90 mt-0.5">
                {isReady
                  ? 'Ready for handoff to Application Lifecycle (Module 09).'
                  : 'We never submit or fabricate answers without your explicit input.'}
              </p>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex rounded-xl bg-slate-200/70 p-1 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'overview' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('resume')}
            className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'resume' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
            }`}
          >
            Tailored Resume
          </button>
          <button
            onClick={() => setActiveTab('cover_letter')}
            className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'cover_letter' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
            }`}
          >
            Cover Letter
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'questions' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
            }`}
          >
            Questions
          </button>
        </div>

        {/* Tab 1: Overview & Review Tasks */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Pending Tasks */}
            {pendingReviews.length > 0 && (
              <div className="rounded-[22px] bg-white border border-amber-200/80 p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Items Requiring Candidate Action ({pendingReviews.length})</span>
                </div>

                <div className="space-y-3">
                  {pendingReviews.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900">{item.title}</div>
                          <div className="text-slate-600 mt-0.5">{item.description}</div>
                        </div>
                        <span className="text-[10px] uppercase font-bold bg-amber-200/80 text-amber-800 px-2 py-0.5 rounded-full shrink-0">
                          Blocking
                        </span>
                      </div>

                      {resolvingItemId === item.id ? (
                        <div className="pt-2 border-t border-amber-200/50 space-y-2">
                          <input
                            type="text"
                            value={candidateAnswerInput}
                            onChange={(e) => setCandidateAnswerInput(e.target.value)}
                            placeholder="Provide your verified answer..."
                            className="w-full h-9 bg-white border border-amber-300 rounded-lg px-3 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setResolvingItemId(null);
                                setCandidateAnswerInput('');
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={!candidateAnswerInput.trim() || submittingResolution}
                              onClick={() => handleResolveReview(item)}
                            >
                              Confirm Answer
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1 flex justify-end">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setResolvingItemId(item.id);
                              setCandidateAnswerInput('');
                            }}
                          >
                            Provide Answer
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Application Artifact Checklist */}
            <div className="rounded-[22px] bg-white border border-slate-200/90 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Package Checklist
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-800 font-medium">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Tailored Resume</span>
                  </div>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Generated
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-800 font-medium">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Tailored Cover Letter</span>
                  </div>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Generated
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-800 font-medium">
                    <HelpCircle className="w-4 h-4 text-purple-600" />
                    <span>Application Questions</span>
                  </div>
                  <span
                    className={
                      pendingReviews.length === 0
                        ? 'text-emerald-600 font-semibold flex items-center gap-1'
                        : 'text-amber-600 font-semibold flex items-center gap-1'
                    }
                  >
                    {pendingReviews.length === 0 ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> All Verified
                      </>
                    ) : (
                      `${pendingReviews.length} Need Review`
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Tailored Resume */}
        {activeTab === 'resume' && activeVersion?.tailoredResume && (
          <div className="rounded-[22px] bg-white border border-slate-200/90 p-5 shadow-xs space-y-4 text-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900">{activeVersion.tailoredResume.fullName}</h2>
              <p className="text-slate-500 font-medium">{activeVersion.tailoredResume.headline}</p>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-slate-700 leading-relaxed">
              <span className="font-semibold text-blue-900">Summary: </span>
              {activeVersion.tailoredResume.summary}
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-slate-400">
                Tailored Experience
              </h3>
              {activeVersion.tailoredResume.experience.map((exp, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{exp.roleTitle}</span>
                    <span className="text-slate-500 font-normal">{exp.company}</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    {exp.bullets.map((b, bIdx) => (
                      <li key={bIdx}>{b.text}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Tailored Cover Letter */}
        {activeTab === 'cover_letter' && activeVersion?.tailoredCoverLetter && (
          <div className="rounded-[22px] bg-white border border-slate-200/90 p-5 shadow-xs space-y-3 text-xs text-slate-700 leading-relaxed font-sans">
            <p className="font-bold text-slate-900">{activeVersion.tailoredCoverLetter.salutation}</p>
            <p>{activeVersion.tailoredCoverLetter.openingParagraph}</p>
            <p>{activeVersion.tailoredCoverLetter.experienceParagraph}</p>
            <p>{activeVersion.tailoredCoverLetter.skillsAlignmentParagraph}</p>
            <p>{activeVersion.tailoredCoverLetter.closingParagraph}</p>
            <p className="whitespace-pre-wrap font-medium text-slate-900 mt-4">
              {activeVersion.tailoredCoverLetter.signOff}
            </p>
          </div>
        )}

        {/* Tab 4: Questions */}
        {activeTab === 'questions' && activeVersion && (
          <div className="space-y-3">
            {activeVersion.applicationAnswers.map((qa) => (
              <div
                key={qa.id}
                className="p-4 rounded-[20px] bg-white border border-slate-200/90 shadow-xs space-y-2 text-xs"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="font-bold text-slate-900">{qa.question}</div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      qa.status === 'READY'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {qa.status}
                  </span>
                </div>
                <div className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {qa.answerText || <span className="italic text-amber-700">Answer required from candidate</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
