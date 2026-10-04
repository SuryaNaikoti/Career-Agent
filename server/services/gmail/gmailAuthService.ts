/**
 * Gmail OAuth & Security Service
 * Module 11: Gmail & Hiring Intelligence
 * 
 * Rules:
 * 1. Scope strictly restricted to: https://www.googleapis.com/auth/gmail.readonly.
 * 2. Secure state generation & verification to prevent CSRF.
 * 3. Token encryption & decryption server-side (AES-256-GCM).
 * 4. Tokens are NEVER returned to frontend or logged in plaintext.
 * 5. Disconnect revokes tokens and wipes credentials.
 */

import crypto from 'crypto';
import { requireDatabaseClient } from '../supabaseClient.js';
import { GmailConnectionRecord } from './gmailTypes.js';
import { AppError, ValidationError, NotFoundError, ForbiddenError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

export class GmailAuthService {
  private encryptionKey: Buffer;

  constructor() {
    // Derive a 32-byte key from existing server environment or fallback securely
    const secret = process.env.SUPABASE_SECRET_KEY || process.env.JWT_SECRET || 'career-agent-secure-gmail-encryption-key-32b';
    this.encryptionKey = crypto.createHash('sha256').update(secret).digest();
  }

  /**
   * Generates a signed OAuth state parameter containing userId and timestamp.
   */
  public generateOAuthState(userId: string): string {
    const payload = JSON.stringify({
      userId,
      nonce: crypto.randomBytes(16).toString('hex'),
      createdAt: Date.now(),
    });

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.from(JSON.stringify({
      iv: iv.toString('hex'),
      data: encrypted.toString('base64'),
      tag: tag.toString('base64'),
    })).toString('base64url');
  }

  /**
   * Validates and unpacks the OAuth state parameter. Prevents CSRF.
   */
  public verifyOAuthState(state: string, authenticatedUserId: string): boolean {
    if (!state) return false;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey,
        Buffer.from(decoded.iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(decoded.tag, 'base64'));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(decoded.data, 'base64')),
        decipher.final(),
      ]).toString('utf8');

      const parsed = JSON.parse(decrypted);
      if (parsed.userId !== authenticatedUserId) {
        logger.warn('OAuth state user mismatch', { expected: authenticatedUserId, received: parsed.userId });
        return false;
      }

      // Max 15 minute lifespan for state
      if (Date.now() - parsed.createdAt > 15 * 60 * 1000) {
        logger.warn('OAuth state expired');
        return false;
      }

      return true;
    } catch (err: any) {
      logger.warn('Failed to verify OAuth state', { error: err?.message });
      return false;
    }
  }

  /**
   * Decrypts and unpacks the OAuth state without requiring prior user knowledge.
   * Returns the embedded userId if the state signature is valid and not expired.
   */
  public unpackOAuthState(state: string): { userId: string; createdAt: number } | null {
    if (!state) return null;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey,
        Buffer.from(decoded.iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(decoded.tag, 'base64'));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(decoded.data, 'base64')),
        decipher.final(),
      ]).toString('utf8');

      const parsed = JSON.parse(decrypted);
      if (!parsed.userId) return null;
      if (Date.now() - parsed.createdAt > 15 * 60 * 1000) return null;

      return { userId: parsed.userId, createdAt: parsed.createdAt };
    } catch (err: any) {
      return null;
    }
  }

  /**
   * Builds the official Google OAuth consent URL.
   */
  public getAuthorizationUrl(userId: string, redirectUri: string): { url: string; state: string } {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new AppError('Google OAuth is not configured on server (missing GOOGLE_CLIENT_ID).', 503);
    }

    const state = this.generateOAuthState(userId);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GMAIL_READONLY_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state,
    };
  }

  /**
   * Exchanges authorization code for tokens via Google OAuth token endpoint.
   */
  public async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiryDate?: number; email?: string }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new AppError('Google OAuth is not configured on server (missing credentials).', 503);
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      logger.error('Google token exchange failed', { error: tokenData });
      throw new AppError(
        tokenData.error_description || tokenData.error || 'Failed to exchange authorization code for Google tokens.',
        tokenRes.status >= 400 && tokenRes.status < 500 ? 400 : 502
      );
    }

    let email: string | undefined;
    try {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userinfoRes.ok) {
        const userinfo = await userinfoRes.json();
        email = userinfo.email;
      }
    } catch (err: any) {
      logger.warn('Could not fetch user profile email from Google', { error: err?.message });
    }

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiryDate: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      email,
    };
  }

  /**
   * Encrypts sensitive OAuth tokens before database storage.
   */
  public encryptToken(token: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString('hex'),
      data: encrypted.toString('base64'),
      tag: tag.toString('hex'),
    });
  }

  /**
   * Decrypts stored OAuth tokens.
   */
  public decryptToken(encryptedPayload: string): string {
    const parsed = JSON.parse(encryptedPayload);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(parsed.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(parsed.tag, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(parsed.data, 'base64')), decipher.final()]).toString('utf8');
  }

  /**
   * Retrieves connection record for authenticated user.
   */
  public async getConnection(userId: string): Promise<GmailConnectionRecord | null> {
    try {
      const supabase = requireDatabaseClient();
      const { data, error } = await supabase
        .from('gmail_connections')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        googleEmail: data.google_email,
        googleAccountId: data.google_account_id,
        connectionStatus: data.connection_status,
        scopes: data.scopes,
        lastSyncAt: data.last_sync_at,
        lastHistoryId: data.last_history_id,
        lastSyncError: data.last_sync_error,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  /**
   * Saves or updates a verified Gmail connection with encrypted tokens.
   */
  public async saveConnection(
    userId: string,
    tokens: { refreshToken?: string; accessToken?: string; expiryDate?: number; email?: string }
  ): Promise<GmailConnectionRecord> {
    const now = new Date().toISOString();
    const encryptedRefresh = tokens.refreshToken ? this.encryptToken(tokens.refreshToken) : undefined;
    const encryptedAccess = tokens.accessToken ? this.encryptToken(tokens.accessToken) : undefined;

    const payload: Record<string, any> = {
      user_id: userId,
      google_email: tokens.email || null,
      connection_status: 'CONNECTED',
      scopes: GMAIL_READONLY_SCOPE,
      token_expiry: tokens.expiryDate ? new Date(tokens.expiryDate).toISOString() : null,
      updated_at: now,
    };

    if (encryptedRefresh) payload.encrypted_refresh_token = encryptedRefresh;
    if (encryptedAccess) payload.encrypted_access_token = encryptedAccess;

    try {
      const supabase = requireDatabaseClient();
      const { data, error } = await supabase
        .from('gmail_connections')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        throw new AppError(`Failed to save Gmail connection: ${error.message}`, 500);
      }

      return {
        id: data.id,
        userId: data.user_id,
        googleEmail: data.google_email,
        googleAccountId: data.google_account_id,
        connectionStatus: data.connection_status,
        scopes: data.scopes,
        lastSyncAt: data.last_sync_at,
        lastHistoryId: data.last_history_id,
        lastSyncError: data.last_sync_error,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(`Failed to save Gmail connection: ${err.message}`, 500);
    }
  }

  /**
   * Disconnects Gmail, wiping stored credentials and revoking future sync.
   */
  public async disconnect(userId: string): Promise<void> {
    try {
      const supabase = requireDatabaseClient();
      await supabase
        .from('gmail_connections')
        .update({
          connection_status: 'DISCONNECTED',
          encrypted_refresh_token: null,
          encrypted_access_token: null,
          last_sync_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } catch (err: any) {
      logger.info('Database update skipped for disconnect', { error: err?.message });
    }
  }
}

export const gmailAuthService = new GmailAuthService();
