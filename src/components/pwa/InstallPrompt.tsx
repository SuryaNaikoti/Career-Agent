import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall.js';
import { Download, Share2, PlusSquare, ArrowRight, X } from 'lucide-react';
import { Button } from '../ui/Button.js';

export interface InstallPromptProps {
  onDismiss?: () => void;
  variant?: 'banner' | 'modal' | 'full';
  onContinueInBrowser?: () => void;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({
  onDismiss,
  variant = 'banner',
  onContinueInBrowser,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running in standalone mode, do not prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (isInstallable) {
      setIsInstalling(true);
      await install();
      setIsInstalling(false);
    } else {
      // In dev or unsupported browsers, show informative prompt
      setShowIOSGuide(true);
    }
  };

  if (variant === 'full') {
    return (
      <div className="flex flex-col items-center justify-between min-h-screen px-6 py-10 max-w-md mx-auto text-center">
        <div className="w-full flex justify-end">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
              aria-label="Skip install"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex flex-col items-center my-auto">
          {/* Brand Logo Icon */}
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-xl shadow-blue-500/25 flex items-center justify-center mb-6">
            <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center">
              <img src="/icon.svg" alt="Career Agent" className="w-14 h-14" />
            </div>
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-3">
            Mobile Web App
          </span>

          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
            Meet your Career Agent.
          </h1>

          <p className="text-sm text-slate-500 mt-2.5 max-w-xs leading-relaxed">
            Your AI-powered career assistant is ready to help you find better opportunities.
          </p>

          {/* Quick value props */}
          <div className="mt-8 space-y-2.5 text-left w-full max-w-xs">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-xs font-semibold text-slate-700">Native mobile speed & offline support</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span className="text-xs font-semibold text-slate-700">Real-time interview alerts & tracking</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="text-xs font-semibold text-slate-700">100% free and private to your account</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-3 pt-6">
          <Button
            size="lg"
            fullWidth
            onClick={handleInstallClick}
            isLoading={isInstalling}
            leftIcon={<Download className="w-5 h-5" />}
          >
            Install Career Agent
          </Button>

          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={onContinueInBrowser}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Continue in browser
          </Button>
        </div>

        {/* iOS / Browser Guided Sheet */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl text-left border border-slate-100">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900">Install to Home Screen</h3>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                For the best mobile experience on your device:
              </p>

              <div className="space-y-3.5">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    1
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed">
                    Tap the <strong className="font-semibold text-slate-900 inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 inline" /> Share</strong> button in your browser toolbar.
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    2
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed">
                    Scroll down and tap <strong className="font-semibold text-slate-900 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    3
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed">
                    Tap <strong className="font-semibold text-slate-900">Add</strong> in the top right to complete installation.
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button fullWidth variant="secondary" onClick={() => setShowIOSGuide(false)}>
                  Got it
                </Button>
                {onContinueInBrowser && (
                  <Button fullWidth variant="primary" onClick={onContinueInBrowser}>
                    Open App
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Compact banner variant
  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
          <img src="/icon.svg" alt="" className="w-4 h-4" />
        </div>
        <div className="truncate">
          <p className="text-xs font-semibold truncate leading-tight">Install Career Agent</p>
          <p className="text-[11px] text-blue-100 truncate">Add to home screen for instant access</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <button
          onClick={handleInstallClick}
          className="text-xs font-bold bg-white text-blue-600 px-3 py-1 rounded-lg shadow-xs hover:bg-blue-50 transition-colors"
        >
          Install
        </button>
        {onDismiss && (
          <button onClick={onDismiss} className="text-white/80 hover:text-white p-1" aria-label="Dismiss">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
