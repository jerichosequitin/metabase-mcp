/**
 * Google OAuth authentication handler for Metabase SSO
 *
 * Handles the OAuth flow:
 * 1. Generate authorization URL
 * 2. Start local callback server
 * 3. Exchange authorization code for tokens
 * 4. Exchange Google ID token for Metabase session
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL, URLSearchParams } from 'url';
import { randomBytes } from 'crypto';
import config, { getGoogleOAuthConfig } from '../config.js';
import { tokenStore } from './tokenStore.js';
import type {
  GoogleTokens,
  StoredAuth,
  OAuthCallbackResult,
  MetabaseSessionResult,
} from '../types/auth.js';

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Metabase session duration (14 days default)
const METABASE_SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Generate a random state parameter for CSRF protection
 */
function generateState(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate the Google OAuth authorization URL
 */
export function getAuthorizationUrl(): { url: string; state: string } {
  const oauthConfig = getGoogleOAuthConfig();

  if (!oauthConfig) {
    throw new Error('Google SSO not configured. Set METABASE_GOOGLE_CLIENT_ID.');
  }

  const state = generateState();

  const params = new URLSearchParams({
    client_id: oauthConfig.clientId,
    redirect_uri: oauthConfig.redirectUri,
    response_type: 'code',
    scope: oauthConfig.scopes.join(' '),
    state,
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Force consent to get refresh token
  });

  return {
    url: `${GOOGLE_AUTH_URL}?${params.toString()}`,
    state,
  };
}

/**
 * Start a local HTTP server to capture the OAuth callback
 */
export function startCallbackServer(
  expectedState: string,
  timeoutMs: number = 120000
): Promise<OAuthCallbackResult> {
  const oauthConfig = getGoogleOAuthConfig();

  if (!oauthConfig) {
    throw new Error('Google SSO not configured');
  }

  return new Promise((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const reqUrl = new URL(req.url || '/', `http://localhost:${oauthConfig.callbackPort}`);

      if (reqUrl.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = reqUrl.searchParams.get('code');
      const state = reqUrl.searchParams.get('state');
      const error = reqUrl.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
              <h1>Authentication Failed</h1>
              <p>Error: ${error}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (!code || !state) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
              <h1>Authentication Failed</h1>
              <p>Missing authorization code or state</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        server.close();
        reject(new Error('Missing authorization code or state'));
        return;
      }

      if (state !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
              <h1>Authentication Failed</h1>
              <p>State mismatch - possible CSRF attack</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        server.close();
        reject(new Error('State mismatch - possible CSRF attack'));
        return;
      }

      // Success!
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1>Authentication Successful!</h1>
            <p>You can close this window and return to the terminal.</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
        </html>
      `);

      server.close();
      resolve({ code, state });
    });

    // Set timeout
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error(`OAuth callback timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    server.on('close', () => {
      clearTimeout(timeout);
    });

    server.on('error', err => {
      clearTimeout(timeout);
      reject(err);
    });

    server.listen(oauthConfig.callbackPort, () => {
      console.error(`OAuth callback server listening on port ${oauthConfig.callbackPort}`);
    });
  });
}

/**
 * Exchange authorization code for Google tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const oauthConfig = getGoogleOAuthConfig();

  if (!oauthConfig) {
    throw new Error('Google SSO not configured');
  }

  const params = new URLSearchParams({
    code,
    client_id: oauthConfig.clientId,
    redirect_uri: oauthConfig.redirectUri,
    grant_type: 'authorization_code',
  });

  // Add client secret if available (needed for refresh tokens)
  if (oauthConfig.clientSecret) {
    params.set('client_secret', oauthConfig.clientSecret);
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to exchange code for tokens: ${response.status} ${JSON.stringify(errorData)}`
    );
  }

  const data = (await response.json()) as {
    id_token: string;
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    idToken: data.id_token,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Exchange Google ID token for Metabase session
 */
export async function exchangeForMetabaseSession(idToken: string): Promise<MetabaseSessionResult> {
  const response = await fetch(`${config.METABASE_URL}/api/session/google_auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: idToken }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    // Handle specific error cases
    if (response.status === 401) {
      throw new Error(
        'Google authentication failed. Your Google account may not have access to this Metabase instance.'
      );
    }

    if (response.status === 400) {
      throw new Error(
        'Invalid Google token. This may happen if the token expired. Please try again.'
      );
    }

    throw new Error(
      `Failed to authenticate with Metabase: ${response.status} ${JSON.stringify(errorData)}`
    );
  }

  const data = (await response.json()) as { id: string };

  return {
    sessionToken: data.id,
    // Metabase sessions typically last 14 days
    expiresAt: Date.now() + METABASE_SESSION_DURATION_MS,
  };
}

/**
 * Refresh Google tokens using refresh token
 */
export async function refreshGoogleTokens(refreshToken: string): Promise<GoogleTokens> {
  const oauthConfig = getGoogleOAuthConfig();

  if (!oauthConfig || !oauthConfig.clientSecret) {
    throw new Error('Cannot refresh tokens: client secret not configured');
  }

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: oauthConfig.clientId,
    client_secret: oauthConfig.clientSecret,
    grant_type: 'refresh_token',
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to refresh Google tokens: ${response.status} ${JSON.stringify(errorData)}`
    );
  }

  const data = (await response.json()) as {
    id_token: string;
    access_token: string;
    expires_in: number;
  };

  return {
    idToken: data.id_token,
    accessToken: data.access_token,
    refreshToken, // Refresh token is not returned, keep the original
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Perform full login flow and store credentials
 */
export async function performLogin(): Promise<StoredAuth> {
  // Generate auth URL and state
  const { url, state } = getAuthorizationUrl();

  console.error('\nOpening browser for Google authentication...');
  console.error(`\nIf browser doesn't open, visit:\n${url}\n`);

  // Dynamically import 'open' to avoid bundling issues
  const open = (await import('open')).default;
  await open(url);

  // Start callback server and wait for response
  console.error('Waiting for authentication callback...');
  const { code } = await startCallbackServer(state);

  // Exchange code for Google tokens
  console.error('Exchanging authorization code for tokens...');
  const googleTokens = await exchangeCodeForTokens(code);

  // Exchange Google token for Metabase session
  console.error('Authenticating with Metabase...');
  const { sessionToken, expiresAt } = await exchangeForMetabaseSession(googleTokens.idToken);

  // Store authentication
  const auth: StoredAuth = {
    method: 'google_sso',
    metabaseUrl: config.METABASE_URL,
    sessionToken,
    sessionExpiresAt: expiresAt || Date.now() + METABASE_SESSION_DURATION_MS,
    googleTokens,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await tokenStore.save(auth);
  console.error(`\nAuthentication successful! Credentials saved to ${tokenStore.getStoragePath()}`);

  return auth;
}

/**
 * Attempt to refresh session using stored tokens
 */
export async function refreshSession(): Promise<string | null> {
  const googleTokens = await tokenStore.getGoogleTokens();

  if (!googleTokens) {
    return null;
  }

  // If Google tokens are expired and we have a refresh token, refresh them
  if (googleTokens.expiresAt < Date.now() && googleTokens.refreshToken) {
    try {
      const newTokens = await refreshGoogleTokens(googleTokens.refreshToken);
      const { sessionToken, expiresAt } = await exchangeForMetabaseSession(newTokens.idToken);

      // Update stored auth
      const auth = await tokenStore.load();
      if (auth) {
        auth.googleTokens = newTokens;
        auth.sessionToken = sessionToken;
        auth.sessionExpiresAt = expiresAt || Date.now() + METABASE_SESSION_DURATION_MS;
        await tokenStore.save(auth);
      }

      return sessionToken;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return null;
    }
  }

  // If Google tokens are still valid, just get a new Metabase session
  try {
    const { sessionToken, expiresAt } = await exchangeForMetabaseSession(googleTokens.idToken);
    await tokenStore.updateSession(sessionToken, expiresAt);
    return sessionToken;
  } catch {
    return null;
  }
}

/**
 * Get valid session token, refreshing if necessary
 */
export async function getValidSession(): Promise<string | null> {
  // First, try to get existing valid session
  const existingToken = await tokenStore.getSessionToken();
  if (existingToken) {
    return existingToken;
  }

  // Try to refresh
  return refreshSession();
}
