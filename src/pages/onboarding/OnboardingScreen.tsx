import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../../app/router/index.js';
import { onboardingApi } from '../../features/onboarding/onboarding.api.js';
import { OnboardingSession, OnboardingMessage } from '../../types/onboarding.types.js';
import { OnboardingProgressNav } from '../../components/onboarding/OnboardingProgressNav.js';
import { FactConfirmationCard } from '../../components/onboarding/FactConfirmationCard.js';
import { ProfileReviewCard } from '../../components/onboarding/ProfileReviewCard.js';
import { Send, Sparkles, ArrowLeft, Bot, User, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { cn } from '../../lib/utils/cn.js';

export const OnboardingScreen: React.FC = () => {
  const { navigate } = useRouter();
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session?.messages, session?.pendingFacts]);

  // Initialize or resume onboarding session on mount
  useEffect(() => {
    let isMounted = true;

    async function initOnboarding() {
      try {
        setIsInitializing(true);
        setErrorMessage(null);
        const { session: startedSession } = await onboardingApi.start();
        if (isMounted) {
          setSession(startedSession);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err?.message || 'Failed to start career intake. Please refresh or try again.');
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    initOnboarding();

    return () => {
      isMounted = false;
    };
  }, []);

  // Send candidate message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !session || isLoading) return;

    setInputText('');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await onboardingApi.sendMessage(session.sessionId, text);
      setSession(response.session);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send response. Please try again.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Confirm pending facts
  const handleConfirmFacts = async (factIds: string[]) => {
    if (!session || isLoading) return;

    setIsLoading(true);
    try {
      const res = await onboardingApi.confirmFacts(session.sessionId, factIds);
      setSession(res.session);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to confirm facts.');
    } finally {
      setIsLoading(false);
    }
  };

  // Correct a pending fact
  const handleCorrectFact = async (factId: string, newValue: string) => {
    if (!session || isLoading) return;

    try {
      const res = await onboardingApi.correctFact(session.sessionId, factId, newValue);
      setSession(res.session);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save correction.');
    }
  };

  // Final completion
  const handleComplete = async () => {
    if (!session || isLoading) return;

    setIsLoading(true);
    try {
      const res = await onboardingApi.complete(session.sessionId);
      setSession(res.session);
      navigate('/app/home');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to finalize profile setup.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-blue-600 flex items-center justify-center animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800">Initializing Career Agent</h3>
          <p className="text-xs text-slate-500">Preparing your personalized career interview...</p>
        </div>
      </div>
    );
  }

  const currentStage = session?.currentStage || 'INTRO';
  const completedStages = session?.completedStages || [];
  const pendingFacts = session?.pendingFacts || [];
  const isProfileReviewStage = currentStage === 'PROFILE_REVIEW' || currentStage === 'CONFIRMATION';

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      {/* Desktop Responsive Outer Wrapper */}
      <div className="w-full max-w-5xl flex bg-white min-h-screen shadow-md md:rounded-2xl md:my-6 md:min-h-[850px] overflow-hidden border md:border-slate-200">
        {/* Desktop Left Progress Navigation Sidebar (Hidden on mobile) */}
        <div className="hidden md:flex">
          <OnboardingProgressNav
            currentStage={currentStage}
            completedStages={completedStages}
            variant="desktop"
          />
        </div>

        {/* Main Conversation & Intake Pane (100% on mobile, flex-1 on desktop) */}
        <div className="flex-1 flex flex-col bg-slate-50 min-h-screen md:min-h-full">
          {/* Top Sticky Header */}
          <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shrink-0">
            <div className="flex items-center justify-between gap-3 mb-2">
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-850 hover:bg-slate-100 rounded-xl transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-800 tracking-tight">AI Career Interview</span>
              </div>

              <button
                type="button"
                onClick={() => navigate('/app/home')}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 py-1"
              >
                Skip
              </button>
            </div>

            {/* Mobile Progress Bar (Visible on mobile only) */}
            <div className="md:hidden">
              <OnboardingProgressNav
                currentStage={currentStage}
                completedStages={completedStages}
                variant="mobile"
              />
            </div>
          </header>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mx-4 mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="font-bold underline ml-2">
                Dismiss
              </button>
            </div>
          )}

          {/* Conversation Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {session?.messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';

              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2.5 max-w-[90%] md:max-w-[80%]',
                    isAssistant ? 'mr-auto items-start' : 'ml-auto flex-row-reverse items-end'
                  )}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs',
                      isAssistant
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-white'
                    )}
                  >
                    {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-3.5 h-3.5" />}
                  </div>

                  <div className="space-y-2">
                    <div
                      className={cn(
                        'p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed shadow-xs',
                        isAssistant
                          ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-sm'
                          : 'bg-blue-600 text-white rounded-br-sm'
                      )}
                    >
                      {msg.content}
                    </div>

                    {/* Quick Reply Chips if provided */}
                    {isAssistant && msg.quickReplies && msg.quickReplies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.quickReplies.map((reply) => (
                          <button
                            key={reply}
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleSendMessage(reply)}
                            className="px-3 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-medium shadow-xs transition-colors active:scale-95 disabled:opacity-50"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Pending Fact Confirmation Card */}
            {pendingFacts.length > 0 && (
              <FactConfirmationCard
                facts={pendingFacts}
                onConfirm={handleConfirmFacts}
                onCorrect={handleCorrectFact}
                isLoading={isLoading}
              />
            )}

            {/* Final Profile Review Card */}
            {isProfileReviewStage && (
              <ProfileReviewCard
                confirmedFacts={session?.confirmedFacts || []}
                onFinalConfirm={handleComplete}
                isLoading={isLoading}
              />
            )}

            {/* Thinking / Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                <span>Career Agent is analyzing and formulating next question...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Sticky Composer Bar */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200/80 p-3 md:p-4 z-10 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 max-w-3xl mx-auto"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your career answer..."
                disabled={isLoading || isProfileReviewStage}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[44px]"
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!inputText.trim() || isLoading || isProfileReviewStage}
                isLoading={isLoading}
                aria-label="Send message"
                className="px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
