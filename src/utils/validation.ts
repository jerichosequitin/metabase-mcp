/**
 * Validation utilities for the Metabase MCP server.
 */

import { ErrorCode, McpError } from '../types/core.js';

/**
 * Validate that a value is a positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Validate that a string is not empty after trimming
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate positive integer with detailed error message
 */
export function validatePositiveInteger(
  value: unknown,
  fieldName: string,
  requestId: string,
  logWarn: (message: string, data?: unknown, error?: Error) => void
): asserts value is number {
  if (typeof value !== 'number') {
    logWarn(`Invalid ${fieldName} parameter - must be a number`, { requestId, value });
    throw new McpError(ErrorCode.InvalidParams, `${fieldName} must be a number`);
  }

  if (!Number.isInteger(value)) {
    logWarn(`Invalid ${fieldName} parameter - must be an integer`, { requestId, value });
    throw new McpError(ErrorCode.InvalidParams, `${fieldName} must be an integer`);
  }

  if (value <= 0) {
    logWarn(`Invalid ${fieldName} parameter - must be a positive number`, { requestId, value });
    throw new McpError(ErrorCode.InvalidParams, `${fieldName} must be a positive number`);
  }
}

/**
 * Validate non-empty string with detailed error message
 */
export function validateNonEmptyString(
  value: unknown,
  fieldName: string,
  requestId: string,
  logWarn: (message: string, data?: unknown, error?: Error) => void
): asserts value is string {
  if (typeof value !== 'string') {
    logWarn(`Invalid ${fieldName} parameter - must be a string`, { requestId, value });
    throw new McpError(ErrorCode.InvalidParams, `${fieldName} must be a string`);
  }

  if (value.trim() === '') {
    logWarn(`Invalid ${fieldName} parameter - cannot be empty`, { requestId, value });
    throw new McpError(ErrorCode.InvalidParams, `${fieldName} cannot be empty`);
  }
}

/**
 * Normalize string to lowercase for case-insensitive comparison
 */
export function normalizeString(value: string | undefined, defaultValue: string = ''): string {
  if (!value || typeof value !== 'string') {
    return defaultValue.toLowerCase();
  }
  return value.toLowerCase();
}

/**
 * Validate enum value with case-insensitive matching
 */
export function validateEnumValue<T extends string>(
  value: unknown,
  validValues: readonly T[],
  fieldName: string,
  requestId: string,
  logWarn: (message: string, data?: unknown, error?: Error) => void
): T {
  if (typeof value !== 'string') {
    logWarn(`Invalid ${fieldName} parameter - must be a string`, { requestId, value });
    throw new McpError(
      ErrorCode.InvalidParams,
      `${fieldName} must be one of: ${validValues.join(', ')}`
    );
  }

  const normalizedValue = value.toLowerCase();
  const validValue = validValues.find(v => v.toLowerCase() === normalizedValue);

  if (!validValue) {
    logWarn(`Invalid ${fieldName} parameter: ${value}`, { requestId, validValues });
    throw new McpError(
      ErrorCode.InvalidParams,
      `${fieldName} must be one of: ${validValues.join(', ')}`
    );
  }

  return validValue;
}

/**
 * Convert parameter to boolean safely
 */
export function toBooleanSafe(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return Boolean(value);
}

/**
 * Safely parse a number with fallback
 */
export function parseNumberSafe(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

/**
 * Validate row limit with range checking (for execute command)
 */
export function validateRowLimit(
  value: unknown,
  fieldName: string,
  requestId: string,
  logWarn: (message: string, data?: unknown, error?: Error) => void,
  min: number = 1,
  max: number = 2000
): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    const errorMessage = `Invalid ${fieldName} parameter: ${value}. Must be between ${min} and ${max}.`;
    logWarn(errorMessage, { requestId });
    throw new McpError(ErrorCode.InvalidParams, errorMessage);
  }
}
