/**
 * CLI authentication commands for Google SSO
 *
 * Usage:
 *   npx metabase-mcp auth login   - Authenticate with Google SSO
 *   npx metabase-mcp auth status  - Check authentication status
 *   npx metabase-mcp auth logout  - Clear stored credentials
 */

/* eslint-disable no-console */

import config, { getGoogleOAuthConfig, AuthMethod, determineAuthMethod } from '../config.js';
import { tokenStore, performLogin } from '../auth/index.js';
import type { AuthStatus } from '../types/auth.js';

/**
 * Format duration in human-readable form
 */
function formatDuration(ms: number): string {
  if (ms < 0) {
    return 'expired';
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

/**
 * Get current authentication status
 */
export async function getAuthStatus(): Promise<AuthStatus> {
  const authMethod = determineAuthMethod();

  // API Key auth
  if (authMethod === AuthMethod.API_KEY) {
    return {
      authenticated: true,
      method: 'api_key',
      metabaseUrl: config.METABASE_URL,
    };
  }

  // Session auth (email/password)
  if (authMethod === AuthMethod.SESSION) {
    return {
      authenticated: true, // Assumes valid if configured
      method: 'session',
      metabaseUrl: config.METABASE_URL,
      userEmail: config.METABASE_USER_EMAIL,
    };
  }

  // Google SSO auth
  if (authMethod === AuthMethod.GOOGLE_SSO) {
    const auth = await tokenStore.load();

    if (!auth) {
      return {
        authenticated: false,
        method: 'google_sso',
        metabaseUrl: config.METABASE_URL,
      };
    }

    // Check if URL matches
    if (auth.metabaseUrl !== config.METABASE_URL) {
      return {
        authenticated: false,
        method: 'google_sso',
        metabaseUrl: config.METABASE_URL,
      };
    }

    const now = Date.now();
    const isExpired = auth.sessionExpiresAt && auth.sessionExpiresAt < now;

    return {
      authenticated: !isExpired,
      method: 'google_sso',
      metabaseUrl: auth.metabaseUrl,
      expiresAt: auth.sessionExpiresAt,
      expiresIn: auth.sessionExpiresAt ? formatDuration(auth.sessionExpiresAt - now) : undefined,
    };
  }

  return {
    authenticated: false,
    method: 'none',
  };
}

/**
 * Handle the 'login' command
 */
export async function handleLogin(): Promise<void> {
  const oauthConfig = getGoogleOAuthConfig();

  if (!oauthConfig) {
    console.error('Error: Google SSO not configured.');
    console.error('Set METABASE_GOOGLE_CLIENT_ID environment variable to enable Google SSO.');
    console.error('\nAlternatively, you can use:');
    console.error('  - METABASE_API_KEY for API key authentication');
    console.error('  - METABASE_USER_EMAIL and METABASE_PASSWORD for session authentication');
    process.exit(1);
  }

  console.log('Metabase MCP - Google SSO Login');
  console.log('================================\n');
  console.log(`Metabase URL: ${config.METABASE_URL}`);
  console.log(`Token storage: ${tokenStore.getStoragePath()}\n`);

  try {
    await performLogin();
    console.log('\nYou can now use the MCP server with Google SSO authentication.');
  } catch (error) {
    console.error('\nLogin failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Handle the 'status' command
 */
export async function handleStatus(): Promise<void> {
  console.log('Metabase MCP - Authentication Status');
  console.log('=====================================\n');

  const status = await getAuthStatus();

  console.log(`Metabase URL: ${status.metabaseUrl || 'Not configured'}`);
  console.log(`Auth Method:  ${status.method}`);
  console.log(`Status:       ${status.authenticated ? 'Authenticated' : 'Not authenticated'}`);

  if (status.userEmail) {
    console.log(`User Email:   ${status.userEmail}`);
  }

  if (status.expiresAt) {
    console.log(`Expires:      ${new Date(status.expiresAt).toLocaleString()}`);
    console.log(`Expires In:   ${status.expiresIn}`);
  }

  if (status.method === 'google_sso') {
    console.log(`\nToken Store:  ${tokenStore.getStoragePath()}`);
  }

  if (!status.authenticated && status.method === 'google_sso') {
    console.log('\nRun "npx metabase-mcp auth login" to authenticate.');
  }
}

/**
 * Handle the 'logout' command
 */
export async function handleLogout(): Promise<void> {
  console.log('Metabase MCP - Logout');
  console.log('=====================\n');

  const auth = await tokenStore.load();

  if (!auth) {
    console.log('No stored credentials found.');
    return;
  }

  await tokenStore.clear();
  console.log('Stored credentials cleared successfully.');
  console.log(`Removed: ${tokenStore.getStoragePath()}`);
}

/**
 * Main entry point for auth commands
 */
export async function handleAuthCommand(args: string[]): Promise<void> {
  const command = args[0];

  switch (command) {
    case 'login':
      await handleLogin();
      break;

    case 'status':
      await handleStatus();
      break;

    case 'logout':
      await handleLogout();
      break;

    default:
      console.log('Metabase MCP - Authentication Commands');
      console.log('======================================\n');
      console.log('Usage:');
      console.log('  npx metabase-mcp auth login   - Authenticate with Google SSO');
      console.log('  npx metabase-mcp auth status  - Check authentication status');
      console.log('  npx metabase-mcp auth logout  - Clear stored credentials');
      console.log('\nEnvironment Variables:');
      console.log('  METABASE_URL                  - Metabase instance URL (required)');
      console.log('  METABASE_GOOGLE_CLIENT_ID     - Google OAuth Client ID');
      console.log(
        '  METABASE_GOOGLE_CLIENT_SECRET - Google OAuth Client Secret (optional, for refresh)'
      );
      process.exit(command ? 1 : 0);
  }
}
