import React, { useState, useEffect } from 'react';
import { useRouter } from '../../app/router/index.js';
import { TopBar } from '../../components/navigation/TopBar.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Button } from '../../components/ui/Button.js';
import {
  MapPin,
  Briefcase,
  ExternalLink,
  Building2,
  DollarSign,
  AlertCircle,
  Calendar,
  Share2,
  Bookmark,
} from 'lucide-react';
import { jobsApiClient } from '../../features/jobs/jobs.api.js';
import { matchingApiClient } from '../../features/matching/matching.api.js';
import { CanonicalJob } from '../../../server/services/job/jobTypes.js';
import { JobMatchResult } from '../../../server/services/matching/matchingTypes.js';

export const JobDetailScreen: React.FC = () => {
  const { params, navigate } = useRouter();
  const jobId = params.jobId;

  const [job, setJob] = useState<CanonicalJob | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const [matchData, setMatchData] = useState<JobMatchResult | null>(null);
  const [matchLoading, setMatchLoading] = useState<boolean>(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const loadMatch = async (id: string, force = false) => {
    try {
      setMatchLoading(true);
      setMatchError(null);
      const res = force
        ? await matchingApiClient.recalculateJobMatch(id)
        : await matchingApiClient.getJobMatch(id);
      setMatchData(res);
    } catch (err: any) {
      setMatchError(err?.message || 'Match analysis unavailable');
    } finally {
      setMatchLoading(false);
    }
  };

  const recalculateMatch = () => {
    if (jobId) {
      loadMatch(jobId, true);
    }
  };

  useEffect(() => {
    if (!jobId) return;

    const loadJob = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await jobsApiClient.getJob(jobId);
        setJob(data);
        loadMatch(jobId);
      } catch (err: any) {
        setError(err.message || 'Job not found');
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
        <TopBar showBack title="Job Details" />
        <main className="max-w-md mx-auto w-full px-4 pt-16 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500">Loading opportunity details...</p>
        </main>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
        <TopBar showBack title="Job Details" />
        <main className="max-w-md mx-auto w-full px-4 pt-8">
          <EmptyState
            title="Job not found"
            description={error || 'The requested opportunity could not be retrieved from canonical inventory.'}
            actionLabel="Back to Opportunities"
            onAction={() => navigate('/app/jobs')}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 lg:pb-12">
      <TopBar showBack title={job.companyName} />

      <main className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-4 md:pt-6 space-y-5">
        {/* Header Card */}
        <div className="rounded-[24px] bg-white border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 font-bold text-lg flex items-center justify-center shrink-0">
                {job.companyName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  {job.title}
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">{job.companyName}</p>
              </div>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 shrink-0">
              {job.workplaceType}
            </span>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{job.locationText}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span>{job.employmentType}</span>
            </div>
            {job.salaryText && (
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{job.salaryText}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Source: {job.sourceId}</span>
            </div>
          </div>

          {/* Direct External Apply & Preparation Actions */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                variant="primary"
                fullWidth
                disabled={job.status === 'CLOSED'}
                onClick={() => {
                  // Clean handoff to Module 08 Application Preparation
                  navigate(`/app/applications/prepare?jobId=${job.id}`);
                }}
              >
                {job.status === 'CLOSED' ? 'Position Closed' : 'Prepare Application'}
              </Button>

              <button
                onClick={async () => {
                  if (jobId) {
                    if (isSaved) {
                      await jobsApiClient.unsaveJob(jobId);
                      setIsSaved(false);
                    } else {
                      await jobsApiClient.saveJob(jobId);
                      setIsSaved(true);
                    }
                  }
                }}
                className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                  isSaved
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title={isSaved ? 'Unsave Job' : 'Save Job'}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            </div>

            <div className="flex gap-2">
              {job.applyUrl && (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => window.open(job.applyUrl!, '_blank')}
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Direct Apply Site
                </Button>
              )}
              <Button
                variant="secondary"
                fullWidth={!job.applyUrl}
                onClick={() => window.open(job.sourceUrl, '_blank')}
              >
                Original Posting
              </Button>
            </div>
          </div>
        </div>

        {/* Module 06: Your Match Card */}
        <div className="rounded-[24px] bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-5 shadow-lg border border-blue-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Your Match Intelligence
              </span>
              <span className="text-[10px] bg-blue-800/80 text-blue-200 px-2 py-0.5 rounded-full font-mono">
                {matchData?.scoringVersion || 'v1.0.0'}
              </span>
            </div>
            {matchLoading && (
              <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
            )}
          </div>

          {matchData ? (
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-3xl font-extrabold text-white tracking-tight">
                    {Math.round(matchData.overallScore)}
                    <span className="text-base font-normal text-blue-300"> / 100</span>
                  </div>
                  <div className="text-xs font-semibold text-emerald-400 mt-0.5">
                    {matchData.matchStatus.replace(/_/g, ' ')}
                  </div>
                </div>
                <button
                  onClick={recalculateMatch}
                  disabled={matchLoading}
                  className="text-[11px] text-blue-300 hover:text-white underline cursor-pointer"
                >
                  Recalculate
                </button>
              </div>

              <p className="text-xs text-blue-100/90 leading-relaxed">
                {matchData.summaryExplanation}
              </p>

              {/* Blockers alert */}
              {matchData.blockers.length > 0 && (
                <div className="p-3 bg-red-950/80 border border-red-500/40 rounded-xl space-y-1">
                  <div className="text-[11px] font-bold text-red-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Critical Requirement Blocker
                  </div>
                  <div className="text-[11px] text-red-200">
                    {matchData.blockers[0]}
                  </div>
                </div>
              )}

              {/* Component breakdown */}
              <div className="space-y-2 pt-2 border-t border-blue-800/60">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                  Why You Match
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {matchData.components.slice(0, 4).map((comp, idx) => (
                    <div key={idx} className="bg-blue-950/50 p-2 rounded-lg border border-blue-800/40">
                      <div className="text-[10px] text-blue-300 capitalize">
                        {comp.componentType.replace(/_/g, ' ').toLowerCase()}
                      </div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {Math.round(comp.rawScore)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skill Gaps */}
              {matchData.skillGaps.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-blue-800/60">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    Identified Skill Gaps
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {matchData.skillGaps.map((gap, i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          gap.gapType === 'TRANSFERABLE'
                            ? 'bg-indigo-900/90 text-indigo-200 border border-indigo-700'
                            : gap.importance === 'REQUIRED'
                            ? 'bg-red-900/60 text-red-200 border border-red-700'
                            : 'bg-amber-900/60 text-amber-200 border border-amber-700'
                        }`}
                      >
                        {gap.skillName} ({gap.gapType.toLowerCase()})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-blue-200/80">
              {matchError || 'Match analysis will appear after reviewing your career profile.'}
            </div>
          )}
        </div>

        {/* Description Section */}
        <div className="rounded-[24px] bg-white border border-slate-200/90 p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Job Description
          </h3>
          <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
            {job.descriptionText}
          </div>
        </div>
      </main>
    </div>
  );
};
