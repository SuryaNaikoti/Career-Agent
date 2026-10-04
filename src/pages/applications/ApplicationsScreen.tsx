import React, { useState, useMemo, useEffect } from 'react';
import { TopBar } from '../../components/navigation/TopBar.js';
import { ApplicationCard } from '../../components/applications/ApplicationCard.js';
import { Tabs } from '../../components/ui/Tabs.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { FileText, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { useRouter } from '../../app/router/index.js';
import { applicationsApiClient } from '../../features/applications/applications.api.js';

export const ApplicationsScreen: React.FC = () => {
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    applicationsApiClient.listApplications()
      .then((data) => {
        if (isMounted) {
          setApplications(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setApplications([]);
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, []);

  const filterTabs = [
    { id: 'all', label: 'All', badge: applications.length },
    {
      id: 'ready',
      label: 'Ready',
      badge: applications.filter((a) => a.status === 'READY_FOR_SUBMISSION').length,
    },
    {
      id: 'action',
      label: 'Needs Action',
      badge: applications.filter((a) => a.status === 'HUMAN_ACTION_REQUIRED').length,
    },
    {
      id: 'submitted',
      label: 'Submitted',
      badge: applications.filter((a) => a.status === 'SUBMITTED').length,
    },
  ];

  const filteredApplications = useMemo(() => {
    if (activeTab === 'all') return applications;
    if (activeTab === 'ready') return applications.filter((a) => a.status === 'READY_FOR_SUBMISSION');
    if (activeTab === 'action') return applications.filter((a) => a.status === 'HUMAN_ACTION_REQUIRED');
    if (activeTab === 'submitted') return applications.filter((a) => a.status === 'SUBMITTED');
    return applications;
  }, [activeTab, applications]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 lg:pb-12">
      <TopBar title="Applications" />

      <main className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-4 md:pt-6 space-y-5">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
