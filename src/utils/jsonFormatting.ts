/**
 * JSON formatting utility for MCP responses
 */

import { config } from '../config.js';

/**
 * Formats a value as JSON string for MCP responses.
 * Uses compact format by default, pretty-printed when LOG_LEVEL=debug.
 *
 * @param data - The data to format as JSON
 * @returns JSON string (compact or pretty-printed based on LOG_LEVEL)
 */
export function formatJson(data: unknown): string {
  return config.LOG_LEVEL === 'debug' ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}
