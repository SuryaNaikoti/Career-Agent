/**
 * Security Foundation
 * 
 * Rules:
 * - Server secrets are never exposed to the client.
 * - Client input is strictly validated.
 * - Authorization decisions are strictly server-side authoritative.
 */

export interface SecurityContext {
  userId?: string;
  candidateId?: string;
  role?: 'candidate' | 'admin';
  isAuthenticated: boolean;
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
}

export function validateBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7).trim();
}
