import React, { useState, useEffect } from 'react';
import { TopBar } from '../../components/navigation/TopBar.js';
import { useRouter } from '../../app/router/index.js';
import { Tabs } from '../../components/ui/Tabs.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { JobCard } from '../../components/jobs/JobCard.js';
import {
  Search,
  SlidersHorizontal,
  Bookmark,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { jobsApiClient } from '../../features/jobs/jobs.api.js';
import { EnrichedJobCardData } from '../../../server/services/jobExperience/jobExperienceTypes.js';

export const JobsScreen: React.FC = () => {
  const { navigate } = useRouter();

  // Search & Navigation state
  const [activeView, setActiveView] = useState<'discover' | 'recommended' | 'saved'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [workplaceFilter, setWorkplaceFilter] = useState<'all' | 'REMOTE' | 'HYBRID' | 'ONSITE'>('all');
  const [employmentFilter, setEmploymentFilter] = useState<'all' | 'FULL_TIME' | 'CONTRACT' | 'INTERNSHIP'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'salary_high'>('relevance');

  // Data state
  const [feedJobs, setFeedJobs] = useState<EnrichedJobCardData[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<EnrichedJobCardData[]>([]);
  const [savedJobs, setSavedJobs] = useState<EnrichedJobCardData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const viewTabs = [
    { id: 'discover', label: 'Discover' },
    { id: 'recommended', label: 'Recommended' },
    { id: 'saved', label: 'Saved' },
  ];

  const workplaceTabs = [
    { id: 'all', label: 'All Modes' },
    { id: 'REMOTE', label: 'Remote' },
    { id: 'HYBRID', label: 'Hybrid' },
    { id: 'ONSITE', label: 'On-site' },
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeView === 'discover') {
        const res = await jobsApiClient.getCandidateFeed({
          q: searchQuery || undefined,
          workplace: workplaceFilter !== 'all' ? workplaceFilter : undefined,
          employment: employmentFilter !== 'all' ? employmentFilter : undefined,
          sortBy,
        });
        setFeedJobs(res.jobs || []);
      } else if (activeView === 'recommended') {
        const res = await jobsApiClient.getRecommendedJobs();
        setRecommendedJobs(res || []);
      } else if (activeView === 'saved') {
        const rawSaved = await jobsApiClient.getSavedJobs();
        setSavedJobs(
          rawSaved.map((j: any) => ({
            job: j,
            isSaved: true,
            isDismissed: false,
          }))
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Could not load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [activeView, searchQuery, workplaceFilter, employmentFilter, sortBy]);

  const handleSaveToggle = async (jobId: string, currentSaved: boolean) => {
    try {
      if (currentSaved) {
        await jobsApiClient.unsaveJob(jobId);
      } else {
        await jobsApiClient.saveJob(jobId);
      }

      // Optimistically update list
      const updateList = (list: EnrichedJobCardData[]) =>
        list.map((item) =>
          item.job.id === jobId ? { ...item, isSaved: !currentSaved } : item
        );

      setFeedJobs(updateList);
      setRecommendedJobs(updateList);
      if (currentSaved && activeView === 'saved') {
        setSavedJobs((prev) => prev.filter((item) => item.job.id !== jobId));
      }
    } catch (err: any) {
      console.error('Failed to toggle save state', err);
    }
  };

  const handleDismiss = async (jobId: string) => {
    try {
      await jobsApiClient.dismissJob(jobId);
      setFeedJobs((prev) => prev.filter((j) => j.job.id !== jobId));
      setRecommendedJobs((prev) => prev.filter((j) => j.job.id !== jobId));
    } catch (err: any) {
      console.error('Failed to dismiss job', err);
    }
  };

  const currentJobs =
    activeView === 'discover'
      ? feedJobs
      : activeView === 'recommended'
      ? recommendedJobs
      : savedJobs;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 lg:pb-12">
      <TopBar title="Opportunities" />

      <main className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-4 md:pt-6 space-y-5">
        {/* Navigation Tabs (Discover / Recommended / Saved) */}
        <Tabs
          items={viewTabs}
          activeId={activeView}
          onChange={(id) => setActiveView(id as any)}
        />

        {/* Search & Sort Controls (only on Discover) */}
        {activeView === 'discover' && (
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roles, skills, or companies..."
                className="w-full h-11 bg-white text-slate-900 placeholder:text-slate-400 text-xs font-medium rounded-xl border border-slate-200/90 pl-10 pr-10 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-semibold text-slate-400 hover:text-slate-700"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Filters & Sorting Bar */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
              <Tabs
                items={workplaceTabs}
                activeId={workplaceFilter}
                onChange={(id) => setWorkplaceFilter(id as any)}
              />

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 shrink-0"
              >
                <option value="relevance">Sort: Relevance</option>
                <option value="newest">Sort: Newest</option>
                <option value="salary_high">Sort: Salary (High)</option>
              </select>
            </div>
          </div>
        )}

        {/* Results Count Header */}
        <div className="flex items-center justify-between px-1 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>
              Showing <strong className="text-slate-800 tabular-numbers">{currentJobs.length}</strong>{' '}
              {activeView === 'saved'
                ? 'saved positions'
                : activeView === 'recommended'
                ? 'recommendations'
                : 'opportunities'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Live platform inventory</span>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-800 flex-1">
              <p className="font-semibold">Unable to load opportunities</p>
              <p className="mt-0.5">{error}</p>
            </div>
            <button
              onClick={loadData}
              className="p-1 text-red-600 hover:text-red-800 cursor-pointer"
              title="Retry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Job Cards Stream */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-500">Loading opportunities...</p>
          </div>
        ) : currentJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentJobs.map((item) => (
              <JobCard
                key={item.job.id}
                data={item}
                onClick={() => {
                  jobsApiClient.recordJobView(item.job.id);
                  navigate(`/app/jobs/${item.job.id}`);
                }}
                onSaveToggle={(e) => {
                  e.stopPropagation();
                  handleSaveToggle(item.job.id, item.isSaved);
                }}
                onDismiss={
                  activeView !== 'saved'
                    ? (e) => {
                        e.stopPropagation();
                        handleDismiss(item.job.id);
                      }
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Compass className="w-7 h-7" />}
            title={
              activeView === 'saved'
                ? 'No saved jobs'
                : activeView === 'recommended'
                ? 'No recommendations yet'
                : 'No opportunities found'
            }
            description={
              activeView === 'saved'
                ? 'Bookmark positions you want to revisit and apply to later.'
                : activeView === 'recommended'
                ? 'Complete your candidate profile and target roles to unlock personalized recommendations.'
                : 'Try broadening your search query or adjusting your filters.'
            }
          />
        )}
      </main>
    </div>
  );
};
