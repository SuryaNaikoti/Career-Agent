import { supabase, isSupabaseConfigured } from '../../lib/supabase/client.js';
import { AuthUser, AuthSession, SignUpResult, OnboardingStatus, AuthError } from './auth.types.js';
import { mapSupabaseError } from './auth.validation.js';

export function mapUser(rawUser: { id: string; email?: string; email_confirmed_at?: string; confirmed_at?: string; user_metadata?: Record<string, unknown>; created_at?: string } | null): AuthUser | null {
  if (!rawUser) return null;
  return {
    id: rawUser.id,
    email: rawUser.email,
    emailConfirmed: Boolean(rawUser.email_confirmed_at || rawUser.confirmed_at),
    userMetadata: rawUser.user_metadata || {},
    createdAt: rawUser.created_at,
  };
}

export const authService = {
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  async signUp(
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ user: AuthUser | null; session: AuthSession | null; requiresConfirmation: boolean; error?: AuthError }> {
    if (!isSupabaseConfigured()) {
      return {
        user: null,
        session: null,
        requiresConfirmation: false,
        error: {
          code: 'not_configured',
          message: 'Supabase credentials are not configured in your environment (.env).',
        },
      };
    }

    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/app/home` : undefined;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: fullName ? { full_name: fullName.trim() } : {},
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        return { user: null, session: null, requiresConfirmation: false, error: mapSupabaseError(error) };
      }

      const user = mapUser(data.user);
      const session = data.session;
      // If user exists but session is null, email confirmation is active in Supabase project
      const requiresConfirmation = Boolean(user && !session && !user.emailConfirmed);

      return { user, session, requiresConfirmation };
    } catch (err) {
      return { user: null, session: null, requiresConfirmation: false, error: mapSupabaseError(err) };
    }
  },

  async signIn(
    email: string,
    password: string
  ): Promise<{ user: AuthUser | null; session: AuthSession | null; error?: AuthError }> {
    if (!isSupabaseConfigured()) {
      return {
        user: null,
        session: null,
        error: {
          code: 'not_configured',
          message: 'Supabase credentials are not configured in your environment (.env).',
        },
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { user: null, session: null, error: mapSupabaseError(error) };
      }

      return {
        user: mapUser(data.user),
        session: data.session,
      };
    } catch (err) {
      return { user: null, session: null, error: mapSupabaseError(err) };
    }
  },

  async signInWithGoogle(
    internalRedirectPath?: string
  ): Promise<{ success: boolean; error?: AuthError }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: {
          code: 'not_configured',
          message: 'Supabase credentials are not configured in your environment (.env).',
        },
      };
    }

    try {
      const validPath = internalRedirectPath && internalRedirectPath.startsWith('/') ? internalRedirectPath : '/app/home';
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}${validPath}` : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return { success: false, error: mapSupabaseError(error) };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: mapSupabaseError(err) };
    }
  },

  async signOut(): Promise<{ error?: AuthError }> {
    if (!isSupabaseConfigured()) {
      return {};
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { error: mapSupabaseError(error) };
      }
      return {};
    } catch (err) {
      return { error: mapSupabaseError(err) };
    }
  },

  async getSession(): Promise<{ session: AuthSession | null; error?: AuthError }> {
    if (!isSupabaseConfigured()) {
      return { session: null };
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        return { session: null, error: mapSupabaseError(error) };
      }
      return { session: data.session };
    } catch (err) {
      return { session: null, error: mapSupabaseError(err) };
    }
  },

  async getUser(): Promise<{ user: AuthUser | null; error?: AuthError }> {
    if (!isSupabaseConfigured()) {
      return { user: null };
    }

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        return { user: null, error: mapSupabaseError(error) };
      }
      return { user: mapUser(data.user) };
    } catch (err) {
      return { user: null, error: mapSupabaseError(err) };
    }
  },

  async resetPassword(email: string): Promise<{ success: boolean; error?: AuthError }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: {
          code: 'not_configured',
          message: 'Supabase credentials are not configured in your environment (.env).',
        },
      };
    }

    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { success: false, error: mapSupabaseError(error) };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: mapSupabaseError(err) };
    }
  },

  async updatePassword(password: string): Promise<{ success: boolean; error?: AuthError }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: {
          code: 'not_configured',
          message: 'Supabase credentials are not configured in your environment (.env).',
        },
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        return { success: false, error: mapSupabaseError(error) };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: mapSupabaseError(err) };
    }
  },

  async resendConfirmationEmail(email: string): Promise<{ success: boolean; error?: AuthError }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: {
          code: 'not_configured',
          message: 'Supabase credentials are not configured in your environment (.env).',
        },
      };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });

      if (error) {
        return { success: false, error: mapSupabaseError(error) };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: mapSupabaseError(err) };
    }
  },

  /**
   * Temporary abstraction for Module 03 (AI Onboarding).
   * Checks user metadata or returns default.
   */
  async getOnboardingStatus(user: AuthUser | null): Promise<OnboardingStatus> {
    if (!user) {
      return { isCompleted: false };
    }
    const metaCompleted = user.userMetadata?.onboarding_completed;
    return {
      isCompleted: Boolean(metaCompleted === true),
      currentStep: typeof user.userMetadata?.onboarding_step === 'number' ? user.userMetadata.onboarding_step : 1,
    };
  },

  onAuthStateChange(callback: (event: string, session: AuthSession | null) => void) {
    if (!isSupabaseConfigured()) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },
};
