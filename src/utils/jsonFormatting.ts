/**
 * JSON formatting utility for MCP responses
 */

import { config } from '../config.js';

/**
 * Formats a value as JSON string for MCP responses.
 * Uses compact format by default, beautified when JSON_BEAUTIFY=true.
 *
 * @param data - The data to format as JSON
 * @returns JSON string (compact or beautified based on config)
 */
export function formatJson(data: unknown): string {
  return config.JSON_BEAUTIFY ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}
