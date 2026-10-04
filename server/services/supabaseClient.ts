import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { DatabaseNotConfiguredError } from '../core/errors/appError.js';
import { logger } from '../core/logging/logger.js';

export { DatabaseNotConfiguredError };

let serviceSupabaseClient: SupabaseClient | null = null;
let testDatabaseDouble: SupabaseClient | null = null;

/**
 * For testing purposes ONLY: allows automated test suites to supply a test double
 * without creating in-memory production fallbacks.
 */
export function setTestDatabaseDouble(double: SupabaseClient | null): void {
  testDatabaseDouble = double;
}

export function getServiceSupabase(): SupabaseClient | null {
  if (testDatabaseDouble) {
    return testDatabaseDouble;
  }

  if (serviceSupabaseClient) {
    return serviceSupabaseClient;
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

  if (url && key && url.startsWith('https://') && url !== 'https://your-project-ref.supabase.co') {
    serviceSupabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serviceSupabaseClient;
}

export function requireDatabaseClient(): SupabaseClient {
  const client = getServiceSupabase();
  if (!client) {
    throw new DatabaseNotConfiguredError();
  }
  return client;
}

