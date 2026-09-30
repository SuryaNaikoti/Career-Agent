import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { logger } from '../logging/logger.js';

export interface SafeServerUser {
  id: string;
  email?: string;
  emailConfirmed: boolean;
  userMetadata?: Record<string, unknown>;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      authUser?: SafeServerUser;
    }
  }
}

let serverSupabaseClient: SupabaseClient | null = null;

function getServerSupabase(): SupabaseClient | null {
  if (serverSupabaseClient) {
    return serverSupabaseClient;
  }

  // Support both standard server env vars and public Vite env vars
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

  if (url && key && url.startsWith('https://') && url !== 'https://your-project-ref.supabase.co') {
    serverSupabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serverSupabaseClient;
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7).trim();
}

/**
 * Derives authenticated user identity strictly from the Bearer token.
 * Never trusts user IDs or emails passed in query parameters or request bodies.
 */
export async function getAuthenticatedUser(req: Request): Promise<SafeServerUser | null> {
  const token = extractBearerToken(req);
  if (!token) {
    return null;
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    // If Supabase is not configured yet, no valid tokens can be verified
    return null;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      emailConfirmed: Boolean(user.email_confirmed_at || (user as { confirmed_at?: string }).confirmed_at),
      userMetadata: user.user_metadata || {},
    };
  } catch (err) {
    logger.warn('Token verification error', { error: String(err) });
    return null;
  }
}

/**
 * Express middleware to enforce authentication on protected endpoints
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({
      authenticated: false,
      error: 'Unauthorized: Valid Bearer token required',
    });
    return;
  }

  req.authUser = user;
  next();
}
