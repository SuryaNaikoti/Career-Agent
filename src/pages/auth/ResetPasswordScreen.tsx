import React, { useState } from 'react';
import { useRouter } from '../../app/router/index.js';
import { useAuth } from '../../features/authentication/auth.context.js';
import { validatePassword, validatePasswordConfirmation } from '../../features/authentication/auth.validation.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Sparkles, Lock, CheckCircle2, ArrowLeft } from 'lucide-react';

export const ResetPasswordScreen: React.FC = () => {
  const { navigate } = useRouter();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const passErr = validatePassword(password);
    if (passErr) {
      setError(passErr);
      return;
    }

    const matchErr = validatePasswordConfirmation(password, confirmPassword);
    if (matchErr) {
      setError(matchErr);
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/app/home');
      }, 2000);
    } else {
      setError(result.error?.message || 'Failed to update password.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-between p-6">
      {/* Top Header */}
      <div className="w-full max-w-5xl mx-auto pt-2 flex items-center justify-between">
        <button
          onClick={() => navigate('/auth')}
          className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-xl"
          aria-label="Back to sign in"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 fill-white" />
          </div>
          <span className="text-sm font-bold text-slate-900 tracking-tight">Career Agent</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Main Content */}
      <div className="my-auto py-8 w-full max-w-md md:max-w-lg mx-auto bg-white/80 md:bg-white md:shadow-xl md:border md:border-slate-200/80 md:rounded-3xl p-6 md:p-8 space-y-5">
        {success ? (
          <div className="text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Password Updated!</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Your password has been changed successfully. Redirecting you to your Career Agent dashboard...
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Reset your password
              </h1>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Enter and confirm your new password below.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="new-password">
                  New Password
                </label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  leftIcon={<Lock className="w-4 h-4" />}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="confirm-new-password">
                  Confirm New Password
                </label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  leftIcon={<Lock className="w-4 h-4" />}
                />
              </div>

              <div className="pt-2">
                <Button fullWidth size="lg" variant="primary" type="submit" isLoading={loading}>
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-slate-400">
        Career Agent Identity & Account Security
      </div>
    </div>
  );
};
