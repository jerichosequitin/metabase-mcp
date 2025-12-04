/**
 * Configuration management with environment variable validation
 */

import 'dotenv/config';
import { z } from 'zod';
import { homedir } from 'os';
import { join } from 'path';

// Helper function to expand system variables
function expandSystemVariables(path: string | undefined): string {
  // If no path is provided, use default
  if (!path) {
    return join(homedir(), 'Downloads', 'Metabase');
  }

  const homeDir = homedir();
  const desktopDir = join(homeDir, 'Desktop');
  const documentsDir = join(homeDir, 'Documents');
  const downloadsDir = join(homeDir, 'Downloads');

  return path
    .replace(/\$\{HOME\}/g, homeDir)
    .replace(/\$\{DESKTOP\}/g, desktopDir)
    .replace(/\$\{DOCUMENTS\}/g, documentsDir)
    .replace(/\$\{DOWNLOADS\}/g, downloadsDir)
    .replace(/\$HOME/g, homeDir)
    .replace(/^~/, homeDir);
}

// Default paths for Google SSO token storage
const DEFAULT_AUTH_STORE_PATH = join(homedir(), '.metabase-mcp', 'auth.json');
const DEFAULT_OAUTH_CALLBACK_PORT = 9876;

// Environment variable schema
const envSchema = z
  .object({
    METABASE_URL: z.string().url('METABASE_URL must be a valid URL'),
    METABASE_API_KEY: z.string().optional(),
    METABASE_USER_EMAIL: z.string().email().optional(),
    METABASE_PASSWORD: z.string().min(1).optional(),
    // Google SSO configuration
    METABASE_GOOGLE_CLIENT_ID: z.string().optional(),
    METABASE_GOOGLE_CLIENT_SECRET: z.string().optional(),
    METABASE_AUTH_STORE_PATH: z
      .string()
      .default(DEFAULT_AUTH_STORE_PATH)
      .transform(expandSystemVariables),
    METABASE_OAUTH_CALLBACK_PORT: z
      .string()
      .default(String(DEFAULT_OAUTH_CALLBACK_PORT))
      .transform(val => parseInt(val, 10))
      .pipe(z.number().int().min(1024).max(65535)),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    CACHE_TTL_MS: z
      .string()
      .default('600000')
      .transform(val => parseInt(val, 10))
      .pipe(z.number().positive()), // 10 minutes
    REQUEST_TIMEOUT_MS: z
      .string()
      .default('600000')
      .transform(val => parseInt(val, 10))
      .pipe(z.number().positive()), // 10 minutes
    EXPORT_DIRECTORY: z.string().default('${DOWNLOADS}/Metabase').transform(expandSystemVariables),
  })
  .refine(
    data =>
      data.METABASE_API_KEY ||
      (data.METABASE_USER_EMAIL && data.METABASE_PASSWORD) ||
      data.METABASE_GOOGLE_CLIENT_ID,
    {
      message:
        'One of the following must be provided: METABASE_API_KEY, both METABASE_USER_EMAIL and METABASE_PASSWORD, or METABASE_GOOGLE_CLIENT_ID for Google SSO',
      path: ['METABASE_API_KEY'],
    }
  );

// Check if we're running a CLI command that doesn't need full validation
function isCliOnlyMode(): boolean {
  const args = process.argv.slice(2);
  return args[0] === '--help' || args[0] === '-h' || args[0] === 'auth';
}

// Parse and validate environment variables
function validateEnvironment() {
  // For CLI-only commands, use relaxed validation with defaults
  if (isCliOnlyMode()) {
    const cliEnv = {
      ...process.env,
      // Provide defaults for CLI mode to avoid validation errors
      METABASE_URL: process.env.METABASE_URL || 'http://localhost:3000',
      // Use a placeholder for Google Client ID if not set (allows auth status to work)
      METABASE_GOOGLE_CLIENT_ID:
        process.env.METABASE_GOOGLE_CLIENT_ID || '__cli_mode_placeholder__',
    };
    try {
      return envSchema.parse(cliEnv);
    } catch {
      // If validation still fails in CLI mode, return minimal defaults
      return {
        METABASE_URL: cliEnv.METABASE_URL,
        METABASE_API_KEY: process.env.METABASE_API_KEY,
        METABASE_USER_EMAIL: process.env.METABASE_USER_EMAIL,
        METABASE_PASSWORD: process.env.METABASE_PASSWORD,
        METABASE_GOOGLE_CLIENT_ID: process.env.METABASE_GOOGLE_CLIENT_ID,
        METABASE_GOOGLE_CLIENT_SECRET: process.env.METABASE_GOOGLE_CLIENT_SECRET,
        METABASE_AUTH_STORE_PATH: DEFAULT_AUTH_STORE_PATH,
        METABASE_OAUTH_CALLBACK_PORT: DEFAULT_OAUTH_CALLBACK_PORT,
        NODE_ENV: 'development' as const,
        LOG_LEVEL: 'info' as const,
        CACHE_TTL_MS: 600000,
        REQUEST_TIMEOUT_MS: 600000,
        EXPORT_DIRECTORY: join(homedir(), 'Downloads', 'Metabase'),
      };
    }
  }

  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
}

// Create default test config for test environment
function createTestConfig() {
  return {
    METABASE_URL: 'http://localhost:3000',
    METABASE_API_KEY: 'test-api-key',
    METABASE_USER_EMAIL: undefined,
    METABASE_PASSWORD: undefined,
    METABASE_GOOGLE_CLIENT_ID: undefined,
    METABASE_GOOGLE_CLIENT_SECRET: undefined,
    METABASE_AUTH_STORE_PATH: DEFAULT_AUTH_STORE_PATH,
    METABASE_OAUTH_CALLBACK_PORT: DEFAULT_OAUTH_CALLBACK_PORT,
    NODE_ENV: 'test' as const,
    LOG_LEVEL: 'info' as const,
    CACHE_TTL_MS: 600000,
    REQUEST_TIMEOUT_MS: 600000,
    EXPORT_DIRECTORY: join(homedir(), 'Downloads', 'Metabase'),
  };
}

// Export validated configuration or test config
export const config =
  process.env.NODE_ENV === 'test' || process.env.VITEST
    ? createTestConfig()
    : validateEnvironment();

// Authentication method enum
export enum AuthMethod {
  SESSION = 'session',
  API_KEY = 'api_key',
  GOOGLE_SSO = 'google_sso',
}

// Logger level enum
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

// Determine authentication method
export function determineAuthMethod(): AuthMethod {
  if (config.METABASE_API_KEY) {
    return AuthMethod.API_KEY;
  }
  if (config.METABASE_GOOGLE_CLIENT_ID) {
    return AuthMethod.GOOGLE_SSO;
  }
  return AuthMethod.SESSION;
}

export const authMethod: AuthMethod = determineAuthMethod();

// Google SSO configuration helper
export function getGoogleOAuthConfig() {
  if (!config.METABASE_GOOGLE_CLIENT_ID) {
    return null;
  }
  return {
    clientId: config.METABASE_GOOGLE_CLIENT_ID,
    clientSecret: config.METABASE_GOOGLE_CLIENT_SECRET,
    redirectUri: `http://localhost:${config.METABASE_OAUTH_CALLBACK_PORT}/callback`,
    scopes: ['openid', 'email', 'profile'],
    authStorePath: config.METABASE_AUTH_STORE_PATH,
    callbackPort: config.METABASE_OAUTH_CALLBACK_PORT,
  };
}

export default config;
