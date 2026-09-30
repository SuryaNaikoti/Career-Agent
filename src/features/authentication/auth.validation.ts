import { AuthError } from './auth.types.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) {
    return 'Please enter your email address.';
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return 'Please enter a valid email address.';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Please enter a password.';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  return null;
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | null {
  if (!confirmation) {
    return 'Please confirm your password.';
  }
  if (password !== confirmation) {
    return 'Passwords do not match.';
  }
  return null;
}

/**
 * Translates raw Supabase and network errors into candidate-friendly messages.
 * Prevents raw internal database or API traces from leaking into UI.
 */
export function mapSupabaseError(err: unknown): AuthError {
  if (!err) {
    return { message: 'An unexpected error occurred. Please try again.' };
  }

  const raw = err as { message?: string; status?: number; code?: string };
  const rawMsg = (raw.message || '').toLowerCase();
  const code = raw.code || String(raw.status || '');

  // 1. Invalid login credentials
  if (rawMsg.includes('invalid login credentials') || rawMsg.includes('invalid_grant')) {
    return {
      code,
      message: "That email or password doesn't look right.",
      originalError: raw.message,
    };
  }

  // 2. User already registered
  if (rawMsg.includes('user already registered') || rawMsg.includes('already exists')) {
    return {
      code,
      message: 'An account with this email may already exist. Try signing in instead.',
      originalError: raw.message,
    };
  }

  // 3. Password requirements
  if (rawMsg.includes('password') && (rawMsg.includes('short') || rawMsg.includes('weak') || rawMsg.includes('least'))) {
    return {
      code,
      message: 'Please choose a stronger password (at least 6 characters).',
      originalError: raw.message,
    };
  }

  // 4. Email not confirmed
  if (rawMsg.includes('email not confirmed')) {
    return {
      code,
      message: 'Check your email to confirm your account before signing in.',
      originalError: raw.message,
    };
  }

  // 5. OAuth Provider not configured in Supabase
  if (
    rawMsg.includes('provider is not enabled') ||
    rawMsg.includes('unsupported provider') ||
    rawMsg.includes('oauth') && rawMsg.includes('not configured')
  ) {
    return {
      code: 'oauth_not_configured',
      message: 'Google Sign-In is not enabled yet in your Supabase Auth dashboard.',
      originalError: raw.message,
    };
  }

  // 6. Network connectivity
  if (rawMsg.includes('network') || rawMsg.includes('fetch') || rawMsg.includes('failed to fetch')) {
    return {
      code: 'network_error',
      message: "We couldn't reach Career Agent right now. Please check your connection and try again.",
      originalError: raw.message,
    };
  }

  // 7. Rate limits
  if (rawMsg.includes('rate limit') || rawMsg.includes('too many requests')) {
    return {
      code: 'rate_limit',
      message: 'Too many attempts in a short time. Please wait a moment and try again.',
      originalError: raw.message,
    };
  }

  return {
    code,
    message: raw.message || 'Something went wrong. Please try again.',
    originalError: raw.message,
  };
}
