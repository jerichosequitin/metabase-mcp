/**
 * Request handling utilities for the Metabase MCP server.
 */

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15);
}
