import React from 'react';
import { useRouter } from '../../app/router/index.js';
import { TopBar } from '../../components/navigation/TopBar.js';
import { JobMatchCard } from '../../components/jobs/JobMatchCard.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { DEMO_JOBS } from '../../../mock/demo-data/jobs.js';

export const JobDetailScreen: React.FC = () => {
  const { params, navigate } = useRouter();
  const jobId = params.jobId;
  const job = DEMO_JOBS.find((j) => j.id === jobId) || DEMO_JOBS[0];

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
        <TopBar showBack title="Job Details" />
        <main className="max-w-md mx-auto w-full px-4 pt-8">
          <EmptyState
            title="Job not found"
            description="The requested job opportunity may have expired or was withdrawn by the employer."
            actionLabel="Back to Jobs"
            onAction={() => navigate('/app/jobs')}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      <TopBar showBack title={job.company} />

      <main className="max-w-[430px] mx-auto w-full px-4 pt-4 space-y-4">
        <JobMatchCard
          job={job}
          onPrepareApplication={() => navigate('/app/agent')}
        />
      </main>
    </div>
  );
};
