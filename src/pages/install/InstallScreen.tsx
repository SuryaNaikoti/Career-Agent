import React from 'react';
import { useRouter } from '../../app/router/index.js';
import { InstallPrompt } from '../../components/pwa/InstallPrompt.js';

export const InstallScreen: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center">
      <InstallPrompt
        variant="full"
        onContinueInBrowser={() => navigate('/app/home')}
        onDismiss={() => navigate('/app/home')}
      />
    </div>
  );
};
