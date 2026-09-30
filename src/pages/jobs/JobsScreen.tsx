import React, { useState, useMemo } from 'react';
import { TopBar } from '../../components/navigation/TopBar.js';
import { JobCard } from '../../components/jobs/JobCard.js';
import { Tabs } from '../../components/ui/Tabs.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { DEMO_JOBS } from '../../../mock/demo-data/jobs.js';

export const JobsScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [jobs, setJobs] = useState(DEMO_JOBS);

  const filterTabs = [
    { id: 'all', label: 'All Matches', badge: jobs.length },
    { id: 'high_match', label: '90%+ Match', badge: jobs.filter((j) => j.matchPercentage >= 90).length },
    { id: 'remote', label: 'Remote', badge: jobs.filter((j) => j.workMode === 'Remote').length },
    { id: 'hybrid', label: 'Hybrid', badge: jobs.filter((j) => j.workMode === 'Hybrid').length },
  ];

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search filter
      const matchesSearch =
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Tab filter
      if (filterTab === 'high_match') return job.matchPercentage >= 90;
      if (filterTab === 'remote') return job.workMode === 'Remote';
      if (filterTab === 'hybrid') return job.workMode === 'Hybrid';

      return true;
    });
  }, [jobs, searchQuery, filterTab]);

  const handleBookmarkToggle = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, isBookmarked: !j.isBookmarked } : j))
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      <TopBar title="Opportunities" />

      <main className="max-w-[430px] mx-auto w-full px-4 pt-4 space-y-4">
        {/* Search Header */}
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

        {/* Filter Tabs */}
        <Tabs
          items={filterTabs}
          activeId={filterTab}
          onChange={(id) => setFilterTab(id)}
        />

        {/* Results Header */}
        <div className="flex items-center justify-between px-1 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>
              Showing <strong className="text-slate-800 tabular-numbers">{filteredJobs.length}</strong> AI matched jobs
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Sorted by match score</span>
        </div>

        {/* Job Cards List */}
        {filteredJobs.length > 0 ? (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onBookmarkToggle={handleBookmarkToggle}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Search className="w-6 h-6" />}
            title="No matching opportunities found"
            description="Your Career Agent couldn't find a strong match with these current filters. Try resetting search criteria."
            actionLabel="Reset filters"
            onAction={() => {
              setSearchQuery('');
              setFilterTab('all');
            }}
          />
        )}
      </main>
    </div>
  );
};
