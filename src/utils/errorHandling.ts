/**
 * Error handling utilities for the Metabase MCP server.
 */

import { ErrorCode, McpError, ErrorCategory, RecoveryAction } from '../types/core.js';
import { createErrorFromHttpResponse, ValidationErrorFactory } from './errorFactory.js';

/**
 * Extracts and cleans error messages from Metabase responses.
 * Metabase often includes SQL statements and technical details that aren't useful for users.
 *
 * Examples:
 * - 'Table "ORDERS" not found; SQL statement: SELECT...' -> 'Table "ORDERS" not found'
 * - 'Column "IDZ" not found; SQL statement: SELECT...' -> 'Column "IDZ" not found'
 * - 'Only SELECT statements are allowed...' -> (unchanged)
 */
export function extractCleanErrorMessage(error: string): string {
  if (!error) {
    return 'Unknown query error';
  }

  // Remove SQL statement details (everything after "; SQL statement:")
  let cleaned = error.split('; SQL statement:')[0].trim();

  // Remove Metabase query hash comments
  cleaned = cleaned.replace(/-- Metabase::.*$/gm, '').trim();

  // Remove H2 database error codes like [42102-214]
  cleaned = cleaned.replace(/\s*\[\d+-\d+\]\s*$/, '').trim();

  // Ensure it ends with a period if it doesn't have punctuation
  if (cleaned && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }

  return cleaned || 'Unknown query error';
}

/**
 * Error handling context for different operations
 */
export interface ErrorContext {
  operation: string;
  resourceType?: string;
  resourceId?: string | number;
  customMessages?: {
    [statusCode: string]: string;
  };
}

/**
 * Centralized error handling utility that creates consistent McpError instances
 * with detailed context and actionable guidance for AI agents
 */
export function handleApiError(
  error: any,
  context: ErrorContext,
  logError: (message: string, error: unknown) => void
): McpError {
  logError(`${context.operation} failed`, error);

  // Extract detailed error information
  let errorMessage = `${context.operation} failed`;
  let errorDetails = '';
  let statusCode = 'unknown';

  if (error?.response) {
    // HTTP error response - use the enhanced error factory
    statusCode = error.response.status?.toString() || 'unknown';
    const responseData = error.response.data || error.response;

    if (typeof responseData === 'string') {
      errorDetails = responseData;
    } else if (responseData?.message) {
      errorDetails = responseData.message;
    } else if (responseData?.error) {
      errorDetails = responseData.error;
    } else {
      errorDetails = JSON.stringify(responseData);
    }

    // Use the enhanced error factory for HTTP responses
    try {
      const httpStatus = parseInt(statusCode, 10);
      if (!isNaN(httpStatus)) {
        return createErrorFromHttpResponse(
          httpStatus,
          responseData,
          context.operation,
          context.resourceType,
          context.resourceId
        );
      }
    } catch (factoryError) {
      // Fall back to generic error handling if factory fails
      logError('Error factory failed, using generic error handling', factoryError);
    }

    errorMessage = `Metabase API error (${statusCode})`;

    // Check for custom messages first
    if (context.customMessages?.[statusCode]) {
      errorMessage += `: ${context.customMessages[statusCode]}`;
    } else {
      // Apply generic status code handling
      errorMessage += getStatusCodeMessage(statusCode, context);
    }
  } else if (error?.message) {
    errorDetails = error.message;
    errorMessage = getGenericErrorMessage(error.message, context);
  } else {
    errorDetails = String(error);
    errorMessage = `Unknown error occurred during ${context.operation.toLowerCase()}`;
  }

  // Log detailed error for debugging
  logError(
    `Detailed ${context.operation.toLowerCase()} error - Status: ${statusCode}, Details: ${errorDetails}`,
    error
  );

  return new McpError(ErrorCode.InternalError, errorMessage);
}

/**
 * Get standard error message based on HTTP status code
 */
function getStatusCodeMessage(statusCode: string, context: ErrorContext): string {
  const { operation, resourceType, resourceId } = context;

  switch (statusCode) {
    case '400':
      if (resourceType && resourceId) {
        if (
          resourceType === 'card' &&
          (operation.toLowerCase().includes('execute') ||
            operation.toLowerCase().includes('export'))
        ) {
          return `Invalid ${resourceType}_id parameter or card configuration issue. Ensure the ${resourceType} ID is valid and exists. If parameter issues persist, consider using ${operation.toLowerCase().includes('execute') ? 'execute_query' : 'export_query'} with the card's underlying SQL query instead.`;
        }
        return `Invalid ${resourceType}_id parameter. Ensure the ${resourceType} ID is valid and exists.`;
      }
      return `Invalid parameters or request format. Check your input parameters.`;

    case '401':
      return `Authentication failed. Check your API key or session token.`;

    case '403':
      if (resourceType) {
        return `Access denied. You may not have permission to access this ${resourceType}.`;
      }
      return `Access denied. You may not have sufficient permissions for this operation.`;

    case '404':
      if (resourceType && resourceId) {
        if (
          resourceType === 'card' &&
          (operation.toLowerCase().includes('execute') ||
            operation.toLowerCase().includes('export'))
        ) {
          return `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found. Check that the ${resourceType}_id (${resourceId}) is correct and the ${resourceType} exists. Alternatively, use ${operation.toLowerCase().includes('execute') ? 'execute_query' : 'export_query'} to run the SQL query directly against the database.`;
        }
        return `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found. Check that the ${resourceType}_id (${resourceId}) is correct and the ${resourceType} exists.`;
      }
      if (resourceType) {
        return `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found. Check that the ${resourceType} exists.`;
      }
      return `Metabase item not found. Check your parameters and ensure the item exists.`;

    case '413':
      return `Request payload too large. Try reducing the result set size or use query filters.`;

    case '500':
      if (
        operation.toLowerCase().includes('query') ||
        operation.toLowerCase().includes('execute')
      ) {
        if (
          resourceType === 'card' &&
          (operation.toLowerCase().includes('execute') ||
            operation.toLowerCase().includes('export'))
        ) {
          return `Database server error. The query may have caused a timeout or database issue. Try using ${operation.toLowerCase().includes('execute') ? 'execute_query' : 'export_query'} with the card's SQL query for better error handling and debugging capabilities.`;
        }
        return `Database server error. The query may have caused a timeout or database issue.`;
      }
      return `Metabase server error. The server may be experiencing issues.`;

    case '502':
    case '503':
      return `Metabase server temporarily unavailable. Try again later.`;

    default:
      return `Unexpected server response (${statusCode}). Please check the server status.`;
  }
}

/**
 * Get error message for non-HTTP errors
 */
function getGenericErrorMessage(errorMessage: string, context: ErrorContext): string {
  const { operation } = context;

  if (errorMessage.includes('timeout')) {
    return `${operation} timed out. Try again later or reduce the complexity of your request.`;
  }

  if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('network')) {
    return `Network error connecting to Metabase. Check your connection and Metabase URL.`;
  }

  if (errorMessage.includes('syntax') || errorMessage.includes('SQL')) {
    return `SQL syntax error. Check your query syntax and ensure all table/column names are correct.`;
  }

  if (errorMessage.includes('permission') || errorMessage.includes('access')) {
    return `Access denied. Check your permissions for this operation.`;
  }

  if (
    errorMessage.toLowerCase().includes('database connection') ||
    errorMessage.toLowerCase().includes('database timeout') ||
    errorMessage.toLowerCase().includes('connection refused') ||
    errorMessage.toLowerCase().includes('connection failed')
  ) {
    return `Database connection error. Ensure the database is accessible and your credentials are correct.`;
  }

  return `${operation} failed: ${errorMessage}`;
}

/**
 * Checks if a Metabase response contains embedded error information
 * and throws appropriate errors if found.
 *
 * Metabase sometimes returns HTTP 200 responses with error details embedded
 * in the response body rather than using proper HTTP error status codes.
 *
 * @param response - The response from Metabase API
 * @param context - Context information for error logging
 * @param logError - Error logging function
 * @throws {McpError} If the response contains parameter validation errors
 */
export function validateMetabaseResponse(
  response: any,
  context: { operation: string; resourceId?: string | number },
  logError: (message: string, data?: unknown) => void
): void {
  // Check if the response contains error information (Metabase returns 200 with embedded errors)
  if (response?.error_type === 'invalid-parameter') {
    logError(
      `${context.operation} parameter validation failed${context.resourceId ? ` for ${context.resourceId}` : ''}`,
      response
    );

    // Check for parameter errors in the via array
    const parameterErrors = response?.via?.filter(
      (error: any) => error?.error_type === 'invalid-parameter' && error?.['ex-data']
    );

    if (parameterErrors && parameterErrors.length > 0) {
      // Use the first parameter error found
      throw ValidationErrorFactory.cardParameterMismatch(parameterErrors[0]['ex-data']);
    }

    // Fallback: check top-level ex-data if via array doesn't contain parameter errors
    const errorDetails = response?.['ex-data'];
    if (errorDetails) {
      throw ValidationErrorFactory.cardParameterMismatch(errorDetails);
    }

    // Fallback to generic parameter error
    throw new McpError(
      ErrorCode.InvalidParams,
      `${context.operation} parameter validation failed: ${response.error || 'Invalid parameter values'}`,
      {
        category: ErrorCategory.VALIDATION,
        httpStatus: 400,
        userMessage: `${context.operation} parameter validation failed due to type mismatch.`,
        agentGuidance: `${context.operation} failed due to parameter validation errors. Check parameter types and values. Consider using execute_query with the card's SQL for more flexible parameter handling.`,
        recoveryAction: RecoveryAction.VALIDATE_INPUT,
        retryable: false,
        additionalContext: { response },
        troubleshootingSteps: [
          'Verify parameter types match expected parameter types',
          'Check parameter values are in the correct format',
          'Use the retrieve tool to get resource details and parameter requirements',
          "Consider using execute_query with the card's SQL for more flexible parameter handling",
        ],
      }
    );
  }

  // Check for query execution errors (status: 'failed' with error message)
  // Metabase returns 202 with these errors for invalid SQL (wrong table/column names, etc.)
  if (response?.status === 'failed' && response?.error) {
    const cleanedError = extractCleanErrorMessage(response.error);
    logError(`${context.operation} failed: ${cleanedError}`, response);
    throw new Error(`${context.operation} failed: ${cleanedError}`);
  }

  // Check for other common embedded error types (legacy handling)
  if (response?.error_type && response?.status === 'failed') {
    logError(
      `${context.operation} failed with embedded error${context.resourceId ? ` for ${context.resourceId}` : ''}`,
      response
    );

    throw new McpError(
      ErrorCode.InternalError,
      `${context.operation} failed: ${response.error || 'Unknown error'}`,
      {
        category: ErrorCategory.EXTERNAL_SERVICE,
        httpStatus: 500,
        userMessage: `${context.operation} failed due to a server error.`,
        agentGuidance: `${context.operation} failed with error type '${response.error_type}'. This may be temporary. Try again or check your request parameters.`,
        recoveryAction: RecoveryAction.RETRY_WITH_BACKOFF,
        retryable: true,
        retryAfterMs: 3000,
        additionalContext: { response },
        troubleshootingSteps: [
          'Check if the error is temporary and retry',
          'Verify your request parameters are correct',
          'Check the server logs for more details',
          'Contact support if the issue persists',
        ],
      }
    );
  }
}
