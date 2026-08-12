#!/usr/bin/env node

/**
 *
 * Entry point for the Metabase MCP Server.
 *
 */

import { serveMetabaseStdio } from './server.js';

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

// Start the Metabase MCP Server
try {
  serveMetabaseStdio();
} catch (error) {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'fatal',
      message: 'Fatal error during server startup',
      error: error instanceof Error ? error.message : String(error),
    })
  );
  process.exit(1);
}
