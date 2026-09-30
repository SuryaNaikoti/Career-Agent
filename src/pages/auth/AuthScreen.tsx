import React, { useState, useMemo } from 'react';
import { useRouter } from '../../app/router/index.js';
import { useAuth } from '../../features/authentication/auth.context.js';
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from '../../features/authentication/auth.validation.js';
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton.js';
import { EmailVerificationNotice } from '../../components/auth/EmailVerificationNotice.js';
import { ConfigMissingBanner } from '../../components/auth/ConfigMissingBanner.js';
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';

export const AuthScreen: React.FC = () => {
  const { navigate } = useRouter();
  const { signIn, signUp, resetPassword, isConfigured, getOnboardingStatus } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password' | 'email_verification'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Parse safe internal redirect destination
  const redirectTarget = useMemo(() => {
    if (typeof window === 'undefined') return '/app/home';
    const params = new URLSearchParams(window.location.search);
    const rawRedirect = params.get('redirect');
    // Security check: Must start with / and not with // to prevent open redirect vulnerabilities
    if (rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) {
      return rawRedirect;
    }
    return '/app/home';
  }, []);

  const handlePostAuthSuccess = async () => {
    const onboarding = await getOnboardingStatus();
    if (!onboarding.isCompleted && redirectTarget === '/app/home') {
      navigate('/onboarding');
    } else {
      navigate(redirectTarget);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailErr = validateEmail(email);
    if (emailErr) {
      setErrorMessage(emailErr);
      return;
    }

    const passErr = validatePassword(password);
    if (passErr) {
      setErrorMessage(passErr);
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (result.success) {
      await handlePostAuthSuccess();
    } else {
      setErrorMessage(result.error?.message || 'Failed to sign in.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailErr = validateEmail(email);
    if (emailErr) {
      setErrorMessage(emailErr);
      return;
    }

    const passErr = validatePassword(password);
    if (passErr) {
      setErrorMessage(passErr);
      return;
    }

    const matchErr = validatePasswordConfirmation(password, confirmPassword);
    if (matchErr) {
      setErrorMessage(matchErr);
      return;
    }

    setLoading(true);
    const result = await signUp(email, password, fullName);
    setLoading(false);

    if (result.success) {
      if (result.result?.requiresConfirmation) {
        setMode('email_verification');
      } else {
        await handlePostAuthSuccess();
      }
    } else {
      setErrorMessage(result.error?.message || 'Failed to create account.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailErr = validateEmail(email);
    if (emailErr) {
      setErrorMessage(emailErr);
      return;
    }

    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);

    if (result.success) {
      setForgotSuccess(true);
    } else {
      setErrorMessage(result.error?.message || 'Failed to send recovery email.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6 max-w-[430px] mx-auto select-none">
      {/* Top Header */}
      <div className="pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 fill-white" />
          </div>
          <span className="text-base font-bold text-slate-900 tracking-tight">Career Agent</span>
        </div>

        {mode !== 'signin' && mode !== 'email_verification' && (
          <button
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            Sign in
          </button>
        )}
      </div>

      {/* Main Authentication Flow */}
      <div className="my-auto py-6 space-y-5">
        {!isConfigured && <ConfigMissingBanner />}

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 border border-red-200/90 text-xs text-red-700 font-medium leading-relaxed animate-in fade-in"
          >
            {errorMessage}
          </div>
        )}

        {/* State 1: SIGN IN */}
        {mode === 'signin' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Welcome back.
              </h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Your career agent is ready to continue working for you.
              </p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="signin-email">
                  Email
                </label>
                <Input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  leftIcon={<Mail className="w-4 h-4" />}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700" htmlFor="signin-password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setErrorMessage(null);
                      setForgotSuccess(false);
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              <Button
                fullWidth
                size="lg"
                variant="primary"
                type="submit"
                isLoading={loading}
              >
                Sign in
              </Button>
            </form>

            <div className="relative flex items-center justify-center my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-slate-50 px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Or
              </span>
            </div>

            <GoogleAuthButton
              redirectPath={redirectTarget}
              onError={(msg) => setErrorMessage(msg)}
            />

            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">Don't have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Create account
              </button>
            </div>
          </div>
        )}

        {/* State 2: CREATE ACCOUNT */}
        {mode === 'signup' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Create your Career Agent.
              </h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Let's build your AI-powered career workspace.
              </p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="signup-email">
                  Email
                </label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  leftIcon={<Mail className="w-4 h-4" />}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="signup-password">
                  Password
                </label>
                <Input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="signup-confirm-password">
                  Confirm Password
                </label>
                <Input
                  id="signup-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  leftIcon={<Lock className="w-4 h-4" />}
                />
              </div>

              <Button
                fullWidth
                size="lg"
                variant="primary"
                type="submit"
                isLoading={loading}
              >
                Create account
              </Button>
            </form>

            <div className="relative flex items-center justify-center my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-slate-50 px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Or
              </span>
            </div>

            <GoogleAuthButton
              redirectPath={redirectTarget}
              onError={(msg) => setErrorMessage(msg)}
            />

            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">Already have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Sign in
              </button>
            </div>
          </div>
        )}

        {/* State 3: FORGOT PASSWORD */}
        {mode === 'forgot_password' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Reset your password.
              </h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Enter your email address and we'll send you a password recovery link.
              </p>
            </div>

            {forgotSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-center space-y-2">
                <h4 className="text-xs font-bold text-emerald-900">Check your inbox</h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  We've sent a recovery link to <strong>{email}</strong>. Tap the link in your email to reset your password.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setMode('signin')}
                  className="mt-2"
                >
                  Back to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="forgot-email">
                    Email address
                  </label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                    leftIcon={<Mail className="w-4 h-4" />}
                  />
                </div>

                <Button
                  fullWidth
                  size="lg"
                  variant="primary"
                  type="submit"
                  isLoading={loading}
                >
                  Send recovery link
                </Button>

                <Button
                  fullWidth
                  size="md"
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                  }}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back to sign in
                </Button>
              </form>
            )}
          </div>
        )}

        {/* State 4: EMAIL VERIFICATION REQUIRED */}
        {mode === 'email_verification' && (
          <EmailVerificationNotice
            email={email}
            onBackToSignIn={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-400">
        By continuing, you agree to Career Agent's Terms of Service and Privacy Policy.
      </div>
    </div>
  );
};
