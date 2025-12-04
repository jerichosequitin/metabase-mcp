/**
 * Authentication type definitions for Google SSO support
 */

/**
 * Google OAuth tokens received after authentication
 */
export interface GoogleTokens {
  /** Google ID token (JWT) used to authenticate with Metabase */
  idToken: string;
  /** Google access token */
  accessToken: string;
  /** Google refresh token (if offline access was granted) */
  refreshToken?: string;
  /** Token expiration timestamp (Unix ms) */
  expiresAt: number;
}

/**
 * Stored authentication data persisted to disk
 */
export interface StoredAuth {
  /** Authentication method used */
  method: 'google_sso';
  /** Metabase instance URL this auth is for */
  metabaseUrl: string;
  /** Metabase session token */
  sessionToken: string;
  /** Session expiration timestamp (Unix ms) - Metabase sessions typically last 14 days */
  sessionExpiresAt: number;
  /** Google OAuth tokens for refresh */
  googleTokens: GoogleTokens;
  /** Timestamp when auth was stored */
  createdAt: number;
  /** Timestamp when auth was last refreshed */
  updatedAt: number;
}

/**
 * OAuth callback server response
 */
export interface OAuthCallbackResult {
  /** Authorization code from Google */
  code: string;
  /** State parameter for CSRF protection */
  state: string;
}

/**
 * Google OAuth configuration
 */
export interface GoogleOAuthConfig {
  /** Google OAuth Client ID */
  clientId: string;
  /** Google OAuth Client Secret (required for refresh tokens) */
  clientSecret?: string;
  /** Redirect URI for OAuth callback */
  redirectUri: string;
  /** OAuth scopes to request */
  scopes: string[];
}

/**
 * Result of exchanging Google tokens for Metabase session
 */
export interface MetabaseSessionResult {
  /** Metabase session token */
  sessionToken: string;
  /** Session expiration (if provided by Metabase) */
  expiresAt?: number;
}

/**
 * Authentication status for CLI display
 */
export interface AuthStatus {
  /** Whether authentication is configured and valid */
  authenticated: boolean;
  /** Authentication method in use */
  method: 'api_key' | 'session' | 'google_sso' | 'none';
  /** Metabase instance URL */
  metabaseUrl?: string;
  /** User email (if known) */
  userEmail?: string;
  /** Session/token expiration */
  expiresAt?: number;
  /** Human-readable expiration description */
  expiresIn?: string;
}
