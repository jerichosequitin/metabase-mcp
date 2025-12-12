/**
 * Validation utilities for the Metabase MCP server.
 */

import { ErrorCode, McpError } from '../types/core.js';

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
 * Parse and validate positive integer with detailed error message
 */
export function parseAndValidatePositiveInteger(
  value: unknown,
  fieldName: string,
  requestId: string,
  logWarn: (message: string, data?: unknown, error?: Error) => void
): number {
  // Try to coerce to number if it's a string
  let numValue: number;
  if (typeof value === 'string') {
    numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      logWarn(`Invalid ${fieldName} parameter - cannot parse as number`, { requestId, value });
      throw new McpError(ErrorCode.InvalidParams, `${fieldName} must be a number`);
    }
  } else if (typeof value === 'number') {
    numValue = value;
  } else {
    logWarn(`Invalid ${fieldName} parameter - must be a number`, { requestId, value });
    throw new McpError(ErrorCode.InvalidParams, `${fieldName} must be a number`);
  }

  if (!Number.isInteger(numValue)) {
    logWarn(`Invalid ${fieldName} parameter - must be an integer`, { requestId, value });
    throw new McpError(ErrorCode.InvalidParams, `${fieldName} must be an integer`);
  }

  if (numValue <= 0) {
    logWarn(`Invalid ${fieldName} parameter - must be a positive number`, { requestId, value });
    throw new McpError(ErrorCode.InvalidParams, `${fieldName} must be a positive number`);
  }

  return numValue;
}

/**
 * Parse and validate non-negative integer (>= 0) with detailed error message
 */
export function parseAndValidateNonNegativeInteger(
  value: unknown,
  fieldName: string,
  requestId: string,
  logWarn: (message: string, data?: unknown, error?: Error) => void
): number {
  // Try to coerce to number if it's a string
  let numValue: number;
  if (typeof value === 'string') {
    numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      logWarn(`Invalid ${fieldName} parameter - cannot parse as number`, { requestId, value });
      throw new McpError(ErrorCode.InvalidParams, `${fieldName} must be a number`);
    }
  } else if (typeof value === 'number') {
    numValue = value;
  } else {
    logWarn(`Invalid ${fieldName} parameter - must be a number`, { requestId, value });
    throw new McpError(ErrorCode.InvalidParams, `${fieldName} must be a number`);
  }

  if (!Number.isInteger(numValue)) {
    logWarn(`Invalid ${fieldName} parameter - must be an integer`, { requestId, value });
    throw new McpError(ErrorCode.InvalidParams, `${fieldName} must be an integer`);
  }

  if (numValue < 0) {
    logWarn(`Invalid ${fieldName} parameter - must be non-negative`, { requestId, value });
    throw new McpError(ErrorCode.InvalidParams, `${fieldName} must be non-negative (>= 0)`);
  }

  return numValue;
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
 * Validate row limit with range checking (for execute command)
 */
export function validateRowLimit(
  value: unknown,
  fieldName: string,
  requestId: string,
  logWarn: (message: string, data?: unknown, error?: Error) => void,
  min: number = 1,
  max: number = 500
): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    const errorMessage = `Invalid ${fieldName} parameter: ${value}. Must be between ${min} and ${max}.`;
    logWarn(errorMessage, { requestId });
    throw new McpError(ErrorCode.InvalidParams, errorMessage);
  }
}
