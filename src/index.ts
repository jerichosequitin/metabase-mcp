#!/usr/bin/env node

/**
 *
 * Entry point for the Metabase MCP Server.
 *
 */

/* eslint-disable no-console */

import { MetabaseServer } from './server.js';
import { handleAuthCommand } from './commands/auth.js';

// Global error handlers for uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'fatal',
      message: 'Uncaught exception detected',
      error: error.message,
      stack: error.stack,
    })
  );
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, _promise: Promise<unknown>) => {
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'fatal',
      message: 'Unhandled promise rejection detected',
      error: errorMessage,
    })
  );
});

/**
 * Main function to handle CLI arguments or start the MCP server
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Check for auth command
  if (args[0] === 'auth') {
    await handleAuthCommand(args.slice(1));
    return;
  }

  // Check for help flag
  if (args[0] === '--help' || args[0] === '-h') {
    console.log('Metabase MCP Server');
    console.log('===================\n');
    console.log('Usage:');
    console.log('  npx metabase-mcp              - Start the MCP server');
    console.log('  npx metabase-mcp auth <cmd>   - Authentication commands\n');
    console.log('Auth Commands:');
    console.log('  auth login   - Authenticate with Google SSO');
    console.log('  auth status  - Check authentication status');
    console.log('  auth logout  - Clear stored credentials\n');
    console.log('Environment Variables:');
    console.log('  METABASE_URL                  - Metabase instance URL (required)');
    console.log('  METABASE_API_KEY              - API key authentication');
    console.log('  METABASE_USER_EMAIL           - Email for session auth');
    console.log('  METABASE_PASSWORD             - Password for session auth');
    console.log('  METABASE_GOOGLE_CLIENT_ID     - Google OAuth Client ID');
    console.log('  METABASE_GOOGLE_CLIENT_SECRET - Google OAuth Client Secret (optional)');
    return;
  }

  // Start the Metabase MCP Server
  const server = new MetabaseServer();
  await server.run();
}

// Run main function
main().catch(error => {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'fatal',
      message: 'Fatal error during startup',
      error: error instanceof Error ? error.message : String(error),
    })
  );
  process.exit(1);
});
