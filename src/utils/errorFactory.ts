/**
 * Error factory utilities for creating descriptive error messages
 */

import { ErrorCode, McpError } from '../types/core.js';

/**
 * Authentication error factories
 */
export class AuthenticationErrorFactory {
  static invalidCredentials(): Error {
    return new Error('Authentication failed: Invalid credentials');
  }

  static sessionExpired(): Error {
    return new Error('Authentication failed: Session expired');
  }

  static invalidApiKey(): Error {
    return new Error('Authentication failed: Invalid API key');
  }
}

/**
 * Authorization error factories
 */
export class AuthorizationErrorFactory {
  static insufficientPermissions(resource?: string, action?: string): Error {
    const resourceMsg = resource ? ` for ${resource}` : '';
    const actionMsg = action ? ` to ${action}` : '';
    return new Error(`Access denied: Insufficient permissions${resourceMsg}${actionMsg}`);
  }

  static collectionAccess(collectionId: number): Error {
    return new Error(`Access denied: Cannot access collection ${collectionId}`);
  }
}

/**
 * Resource not found error factories
 */
export class ResourceNotFoundErrorFactory {
  static resource(resourceType: string, resourceId: number | string): Error {
    return new Error(`${resourceType} not found: ${resourceId}`);
  }

  static database(databaseId: number): Error {
    return new Error(`Database not found: ${databaseId}`);
  }
}

/**
 * Validation error factories
 */
export class ValidationErrorFactory {
  static invalidParameter(parameter: string, _value: unknown, expectedFormat?: string): McpError {
    const formatMsg = expectedFormat ? `. Expected: ${expectedFormat}` : '';
    return new McpError(ErrorCode.InvalidParams, `Invalid parameter: ${parameter}${formatMsg}`);
  }

  static cardParameterMismatch(parameterDetails: any): McpError {
    const paramName =
      parameterDetails?.tag?.name || parameterDetails?.tag?.['display-name'] || 'parameter';
    const expectedType = parameterDetails?.tag?.type || 'unknown';
    return new McpError(
      ErrorCode.InvalidParams,
      `Card parameter type mismatch: ${paramName} expects ${expectedType}`
    );
  }

  static sqlSyntaxError(_query: string, error: string): Error {
    return new Error(`SQL syntax error: ${error}`);
  }
}

/**
 * Network error factories
 */
export class NetworkErrorFactory {
  static timeout(operation: string, timeoutMs: number): Error {
    return new Error(`Operation timed out: ${operation} (${timeoutMs}ms)`);
  }

  static connectionError(url: string): Error {
    return new Error(`Cannot connect to Metabase server: ${url}`);
  }
}

/**
 * Database error factories
 */
export class DatabaseErrorFactory {
  static queryExecutionError(error: string, _query?: string): Error {
    return new Error(`Query execution failed: ${error}`);
  }

  static connectionLost(databaseId: number): Error {
    return new Error(`Database connection lost: ${databaseId}`);
  }
}

/**
 * Rate limit error factories
 */
export class RateLimitErrorFactory {
  static exceeded(retryAfterMs?: number): Error {
    const retryMsg = retryAfterMs ? ` Retry after ${retryAfterMs}ms` : '';
    return new Error(`Rate limit exceeded.${retryMsg}`);
  }
}

/**
 * Export error factories
 */
export class ExportErrorFactory {
  static fileSizeExceeded(currentSize: number, maxSize: number): Error {
    return new Error(`Export file too large: ${currentSize} bytes (max: ${maxSize})`);
  }

  static processingFailed(format: string, error: string): Error {
    return new Error(`Export processing failed for ${format}: ${error}`);
  }
}

/**
 * Create appropriate error from HTTP response status
 */
export function createErrorFromHttpResponse(
  status: number,
  responseData: any,
  _operation: string,
  resourceType?: string,
  resourceId?: number | string
): Error {
  const errorMessage = responseData?.message || responseData?.error || 'HTTP error';

  switch (status) {
    case 400:
      if (responseData?.error_type === 'invalid-parameter' && responseData?.['ex-data']) {
        return ValidationErrorFactory.cardParameterMismatch(responseData['ex-data']);
      }
      if (
        errorMessage.toLowerCase().includes('sql') ||
        errorMessage.toLowerCase().includes('syntax')
      ) {
        return ValidationErrorFactory.sqlSyntaxError('', errorMessage);
      }
      return new Error(`Invalid request: ${errorMessage}`);

    case 401:
      if (errorMessage.toLowerCase().includes('api key')) {
        return AuthenticationErrorFactory.invalidApiKey();
      }
      if (errorMessage.toLowerCase().includes('session')) {
        return AuthenticationErrorFactory.sessionExpired();
      }
      return AuthenticationErrorFactory.invalidCredentials();

    case 403:
      if (resourceType && resourceId) {
        return AuthorizationErrorFactory.insufficientPermissions(resourceType, 'access');
      }
      return AuthorizationErrorFactory.insufficientPermissions();

    case 404:
      if (resourceType && resourceId) {
        return ResourceNotFoundErrorFactory.resource(resourceType, resourceId);
      }
      return new Error('Metabase item not found');

    case 413:
      return ExportErrorFactory.fileSizeExceeded(0, 0);

    case 429:
      return RateLimitErrorFactory.exceeded(responseData?.retryAfter);

    case 500:
      if (
        errorMessage.toLowerCase().includes('database') ||
        errorMessage.toLowerCase().includes('sql')
      ) {
        return DatabaseErrorFactory.queryExecutionError(errorMessage);
      }
      return new Error(`Server error: ${errorMessage}`);

    case 502:
    case 503:
      return new Error('Metabase service temporarily unavailable');

    default:
      return new Error(`HTTP ${status}: ${errorMessage}`);
  }
}
