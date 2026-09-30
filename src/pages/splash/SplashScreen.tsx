import React, { useEffect } from 'react';
import { useRouter } from '../../app/router/index.js';
import { useAuth } from '../../features/authentication/auth.context.js';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';

export const SplashScreen: React.FC = () => {
  const { navigate } = useRouter();
  const { status, getOnboardingStatus } = useAuth();

  useEffect(() => {
    // Only resolve navigation once session status has left INITIALIZING state
    if (status === 'INITIALIZING') return;

    const timer = setTimeout(async () => {
      if (status === 'AUTHENTICATED') {
        const onboarding = await getOnboardingStatus();
        if (!onboarding.isCompleted) {
          navigate('/onboarding');
        } else {
          navigate('/app/home');
        }
      } else {
        navigate('/auth');
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [status, navigate, getOnboardingStatus]);

  const handleManualEnter = async () => {
    if (status === 'AUTHENTICATED') {
      const onboarding = await getOnboardingStatus();
      if (!onboarding.isCompleted) {
        navigate('/onboarding');
      } else {
        navigate('/app/home');
      }
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen p-8 max-w-[430px] mx-auto text-center select-none bg-gradient-to-b from-white via-slate-50 to-blue-50/50">
      <div />

      <div className="flex flex-col items-center my-auto animate-in fade-in zoom-in-95 duration-500">
        {/* Animated Brand Sparkle Icon */}
        <div className="relative w-24 h-24 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/30 mb-6">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500" />
          <Sparkles className="w-12 h-12 fill-white relative z-10 animate-pulse" />
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-300 blur-xs" />
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Career <span className="text-blue-600">Agent</span>
        </h1>

        <p className="text-sm font-medium text-slate-500 mt-2 max-w-xs leading-relaxed">
          Your AI Career Agent
        </p>

        <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-blue-600/80 bg-blue-50/80 px-3.5 py-1.5 rounded-full border border-blue-100">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          <span>
            {status === 'INITIALIZING'
              ? 'Checking your session...'
              : status === 'AUTHENTICATED'
              ? 'Session verified. Welcome back.'
              : 'Workspace ready.'}
          </span>
        </div>
      </div>

      <div className="w-full space-y-2">
        <Button
          fullWidth
          size="lg"
          variant="primary"
          onClick={handleManualEnter}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          {status === 'AUTHENTICATED' ? 'Enter Career Agent' : 'Get Started'}
        </Button>
      </div>
    </div>
  );
};
