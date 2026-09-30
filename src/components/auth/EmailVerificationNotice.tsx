import React, { useState } from 'react';
import { Mail, Check, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { useAuth } from '../../features/authentication/auth.context.js';

export interface EmailVerificationNoticeProps {
  email: string;
  onBackToSignIn: () => void;
}

export const EmailVerificationNotice: React.FC<EmailVerificationNoticeProps> = ({
  email,
  onBackToSignIn,
}) => {
  const { resendConfirmationEmail } = useAuth();
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResend = async () => {
    setResending(true);
    setResendError(null);
    const result = await resendConfirmationEmail(email);
    setResending(false);

    if (result.success) {
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } else {
      setResendError(result.error?.message || 'Failed to resend confirmation email.');
    }
  };

  return (
    <div className="space-y-6 text-center animate-in fade-in duration-300">
      <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
        <Mail className="w-8 h-8" />
      </div>

      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Check your email.
        </h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
          We sent a confirmation link to <strong className="text-slate-800 font-semibold">{email}</strong>. Please tap the link to verify your account and begin using your Career Agent.
        </p>
      </div>

      {resendSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-200/60">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Confirmation link resent successfully.</span>
        </div>
      )}

      {resendError && (
        <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
          {resendError}
        </div>
      )}

      <div className="space-y-2.5 pt-2">
        <Button
          fullWidth
          size="md"
          variant="secondary"
          onClick={handleResend}
          isLoading={resending}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Resend confirmation email
        </Button>

        <Button
          fullWidth
          size="md"
          variant="ghost"
          onClick={onBackToSignIn}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to sign in
        </Button>
      </div>
    </div>
  );
};
