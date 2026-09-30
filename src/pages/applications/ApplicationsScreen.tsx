import React, { useState, useMemo } from 'react';
import { TopBar } from '../../components/navigation/TopBar.js';
import { ApplicationCard } from '../../components/applications/ApplicationCard.js';
import { Tabs } from '../../components/ui/Tabs.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { FileText, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { useRouter } from '../../app/router/index.js';
import { DEMO_APPLICATIONS } from '../../../mock/demo-data/applications.js';

export const ApplicationsScreen: React.FC = () => {
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState('all');

  const filterTabs = [
    { id: 'all', label: 'All', badge: DEMO_APPLICATIONS.length },
    {
      id: 'ready',
      label: 'Ready',
      badge: DEMO_APPLICATIONS.filter((a) => a.status === 'Ready').length,
    },
    {
      id: 'submitted',
      label: 'Submitted',
      badge: DEMO_APPLICATIONS.filter((a) => a.status === 'Submitted').length,
    },
    {
      id: 'interview',
      label: 'Interview',
      badge: DEMO_APPLICATIONS.filter((a) => a.status === 'Interview').length,
    },
  ];

  const filteredApplications = useMemo(() => {
    if (activeTab === 'all') return DEMO_APPLICATIONS;
    if (activeTab === 'ready') return DEMO_APPLICATIONS.filter((a) => a.status === 'Ready');
    if (activeTab === 'submitted') return DEMO_APPLICATIONS.filter((a) => a.status === 'Submitted');
    if (activeTab === 'interview') return DEMO_APPLICATIONS.filter((a) => a.status === 'Interview');
    return DEMO_APPLICATIONS;
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      <TopBar title="Applications" />

      <main className="max-w-[430px] mx-auto w-full px-4 pt-4 space-y-4">
        {/* Status Category Tabs */}
        <Tabs
          items={filterTabs}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id)}
        />

        {/* Info header */}
        <div className="flex items-center justify-between px-1 text-xs text-slate-500">
          <span>Tracking active hiring pipelines</span>
          <span className="font-semibold text-slate-700">Gmail Sync Active</span>
        </div>

        {/* Application Cards */}
        {filteredApplications.length > 0 ? (
          <div className="space-y-3">
            {filteredApplications.map((app) => (
              <ApplicationCard key={app.id} application={app} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="No applications in this category"
            description="No applications here yet. Your Career Agent will keep everything organized once you start applying."
            actionLabel="Discover new jobs"
            onAction={() => navigate('/app/jobs')}
          />
        )}
      </main>
    </div>
  );
};
