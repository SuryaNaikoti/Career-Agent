import React, { useState } from 'react';
import { useRouter } from '../../app/router/index.js';
import { ArrowRight, ArrowLeft, Sparkles, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Progress } from '../../components/ui/Progress.js';

export const OnboardingScreen: React.FC = () => {
  const { navigate } = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      navigate('/app/home');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Top Header with Progress */}
      <div className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-xl"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-slate-500">
            Step {step} of {totalSteps}
          </span>
          <button
            onClick={() => navigate('/app/home')}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600"
          >
            Skip to demo
          </button>
        </div>

        <Progress value={(step / totalSteps) * 100} />
      </div>

      {/* Main Step Shell */}
      <div className="my-auto py-6 space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
          <Sparkles className="w-6 h-6 fill-blue-600" />
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {step === 1 && "Let's understand your career."}
            {step === 2 && 'What roles are you targeting?'}
            {step === 3 && 'Preferred locations & work style.'}
            {step === 4 && 'Salary expectations.'}
            {step === 5 && 'Upload your current resume.'}
            {step === 6 && 'Your Career Agent is ready.'}
          </h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            {step === 1 &&
              'Tell your agent about your current role and years of experience so it knows your background.'}
            {step === 2 &&
              'Specify target titles like Senior Frontend Developer, Lead React Engineer, or Staff UI Architect.'}
            {step === 3 &&
              'Choose your preferred cities (e.g. Hyderabad, Bangalore) and preferences for Remote or Hybrid.'}
            {step === 4 &&
              'Set your minimum compensation threshold so your agent filters out below-standard offers.'}
            {step === 5 &&
              'Your base resume will be analyzed without hallucination. We only verify and tailor facts.'}
            {step === 6 &&
              'All preferences saved! Your agent can now search, match, and tailor applications for you.'}
          </p>
        </div>

        {/* Foundation placeholder card showing future input structure */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>Interactive AI Intake Shell (Module 03)</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 leading-relaxed">
            Module 03 will introduce the conversational AI profile interviewer to extract and verify career facts without tedious manual form filling.
          </div>
        </div>
      </div>

      {/* Bottom Action Button */}
      <div className="pt-4">
        <Button
          fullWidth
          size="lg"
          variant="primary"
          onClick={handleNext}
          rightIcon={step === totalSteps ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        >
          {step === totalSteps ? 'Enter Career Agent' : 'Continue'}
        </Button>
      </div>
    </div>
  );
};
