import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  AuthContextValue,
  AuthState,
  AuthUser,
  AuthSession,
  AuthError,
  SignUpResult,
  OnboardingStatus,
} from './auth.types.js';
import { authService, mapUser } from './auth.service.js';

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    status: 'INITIALIZING',
    user: null,
    session: null,
    loading: true,
    error: null,
    isAuthenticated: false,
    isConfigured: authService.isConfigured(),
  });

  // Initialize session on mount
  useEffect(() => {
    let isMounted = true;

    async function initializeSession() {
      if (!authService.isConfigured()) {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            status: 'UNAUTHENTICATED',
            loading: false,
            isConfigured: false,
          }));
        }
        return;
      }

      try {
        const { session, error } = await authService.getSession();
        if (!isMounted) return;

        if (error) {
          setState((prev) => ({
            ...prev,
            status: 'AUTHENTICATION_ERROR',
            error,
            loading: false,
          }));
          return;
        }

        if (session && session.user) {
          setState({
            status: 'AUTHENTICATED',
            user: mapUser(session.user),
            session,
            loading: false,
            error: null,
            isAuthenticated: true,
            isConfigured: true,
          });
        } else {
          setState({
            status: 'UNAUTHENTICATED',
            user: null,
            session: null,
            loading: false,
            error: null,
            isAuthenticated: false,
            isConfigured: true,
          });
        }
      } catch (err) {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            status: 'UNAUTHENTICATED',
            loading: false,
          }));
        }
      }
    }

    initializeSession();

    // Subscribe to Supabase Auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        if (newSession && newSession.user) {
          setState({
            status: 'AUTHENTICATED',
            user: mapUser(newSession.user),
            session: newSession,
            loading: false,
            error: null,
            isAuthenticated: true,
            isConfigured: true,
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setState({
          status: 'UNAUTHENTICATED',
          user: null,
          session: null,
          loading: false,
          error: null,
          isAuthenticated: false,
          isConfigured: authService.isConfigured(),
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const result = await authService.signIn(email, password);
    if (result.error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: result.error || null,
        status: 'AUTHENTICATION_ERROR',
      }));
      return { success: false, error: result.error };
    }

    if (result.user && result.session) {
      setState({
        status: 'AUTHENTICATED',
        user: result.user,
        session: result.session,
        loading: false,
        error: null,
        isAuthenticated: true,
        isConfigured: true,
      });
      return { success: true };
    }

    setState((prev) => ({ ...prev, loading: false }));
    return { success: false, error: { message: 'Failed to establish session.' } };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const result = await authService.signUp(email, password, fullName);

    if (result.error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: result.error || null,
        status: 'AUTHENTICATION_ERROR',
      }));
      return { success: false, error: result.error };
    }

    const signUpResult: SignUpResult = {
      user: result.user,
      session: result.session,
      requiresConfirmation: result.requiresConfirmation,
    };

    if (result.session && result.user) {
      setState({
        status: 'AUTHENTICATED',
        user: result.user,
        session: result.session,
        loading: false,
        error: null,
        isAuthenticated: true,
        isConfigured: true,
      });
    } else {
      setState((prev) => ({ ...prev, loading: false }));
    }

    return { success: true, result: signUpResult };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const result = await authService.signInWithGoogle();
    if (result.error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: result.error || null,
      }));
      return { success: false, error: result.error };
    }
    return { success: true };
  }, []);

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    await authService.signOut();
    setState({
      status: 'UNAUTHENTICATED',
      user: null,
      session: null,
      loading: false,
      error: null,
      isAuthenticated: false,
      isConfigured: authService.isConfigured(),
    });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const result = await authService.resetPassword(email);
    setState((prev) => ({ ...prev, loading: false, error: result.error || null }));
    return result;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const result = await authService.updatePassword(password);
    setState((prev) => ({ ...prev, loading: false, error: result.error || null }));
    return result;
  }, []);

  const resendConfirmationEmail = useCallback(async (email: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const result = await authService.resendConfirmationEmail(email);
    setState((prev) => ({ ...prev, loading: false, error: result.error || null }));
    return result;
  }, []);

  const getOnboardingStatus = useCallback(async (): Promise<OnboardingStatus> => {
    return authService.getOnboardingStatus(state.user);
  }, [state.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
      resendConfirmationEmail,
      clearError,
      getOnboardingStatus,
    }),
    [
      state,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
      resendConfirmationEmail,
      clearError,
      getOnboardingStatus,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
