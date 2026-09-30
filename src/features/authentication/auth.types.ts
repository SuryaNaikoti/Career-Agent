import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

export type AuthStatus =
  | 'INITIALIZING'
  | 'AUTHENTICATED'
  | 'UNAUTHENTICATED'
  | 'AUTHENTICATION_ERROR';

export type AuthMode =
  | 'signin'
  | 'signup'
  | 'forgot_password'
  | 'email_confirmation';

export interface AuthUser {
  id: string;
  email?: string;
  emailConfirmed: boolean;
  userMetadata?: Record<string, unknown>;
  createdAt?: string;
}

export type AuthSession = Session;

export interface AuthError {
  code?: string;
  message: string;
  originalError?: unknown;
}

export interface SignUpResult {
  user: AuthUser | null;
  session: AuthSession | null;
  requiresConfirmation: boolean;
}

export interface OnboardingStatus {
  isCompleted: boolean;
  currentStep?: number;
}

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  error: AuthError | null;
  isAuthenticated: boolean;
  isConfigured: boolean;
}

export interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: AuthError }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; result?: SignUpResult; error?: AuthError }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: AuthError }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: AuthError }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: AuthError }>;
  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; error?: AuthError }>;
  clearError: () => void;
  getOnboardingStatus: () => Promise<OnboardingStatus>;
}
