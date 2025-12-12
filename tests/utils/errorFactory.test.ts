import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AuthenticationErrorFactory,
  AuthorizationErrorFactory,
  ResourceNotFoundErrorFactory,
  ValidationErrorFactory,
  NetworkErrorFactory,
  DatabaseErrorFactory,
  RateLimitErrorFactory,
  ExportErrorFactory,
  createErrorFromHttpResponse,
} from '../../src/utils/errorFactory.js';
import { validateMetabaseResponse, extractCleanErrorMessage } from '../../src/utils/errorHandling.js';
import { McpError } from '../../src/types/core.js';

describe('ErrorFactory', () => {
  describe('AuthenticationErrorFactory', () => {
    it('should create invalid credentials error', () => {
      const error = AuthenticationErrorFactory.invalidCredentials();
      expect(error.message).toBe('Authentication failed: Invalid credentials');
    });

    it('should create session expired error', () => {
      const error = AuthenticationErrorFactory.sessionExpired();
      expect(error.message).toBe('Authentication failed: Session expired');
    });

    it('should create invalid API key error', () => {
      const error = AuthenticationErrorFactory.invalidApiKey();
      expect(error.message).toBe('Authentication failed: Invalid API key');
    });
  });

  describe('AuthorizationErrorFactory', () => {
    it('should create insufficient permissions error', () => {
      const error = AuthorizationErrorFactory.insufficientPermissions('dashboard', 'access');
      expect(error.message).toBe('Access denied: Insufficient permissions for dashboard to access');
    });

    it('should create insufficient permissions error without resource', () => {
      const error = AuthorizationErrorFactory.insufficientPermissions();
      expect(error.message).toBe('Access denied: Insufficient permissions');
    });

    it('should create collection access error', () => {
      const error = AuthorizationErrorFactory.collectionAccess(123);
      expect(error.message).toBe('Access denied: Cannot access collection 123');
    });
  });

  describe('ResourceNotFoundErrorFactory', () => {
    it('should create resource not found error', () => {
      const error = ResourceNotFoundErrorFactory.resource('dashboard', 456);
      expect(error.message).toBe('dashboard not found: 456');
    });

    it('should create database not found error', () => {
      const error = ResourceNotFoundErrorFactory.database(789);
      expect(error.message).toBe('Database not found: 789');
    });
  });

  describe('ValidationErrorFactory', () => {
    it('should create invalid parameter error', () => {
      const error = ValidationErrorFactory.invalidParameter('card_id', 'invalid', 'Must be a positive integer');
      expect(error.message).toBe('Invalid parameter: card_id. Expected: Must be a positive integer');
    });

    it('should create invalid parameter error without format', () => {
      const error = ValidationErrorFactory.invalidParameter('limit', -1);
      expect(error.message).toBe('Invalid parameter: limit');
    });

    it('should create SQL syntax error', () => {
      const error = ValidationErrorFactory.sqlSyntaxError('SELECT * FROM', 'Missing table name');
      expect(error.message).toBe('SQL syntax error: Missing table name');
    });

    it('should create card parameter mismatch error', () => {
      const parameterDetails = {
        tag: { name: 'user_id', type: 'id' },
        params: [{ value: 'john_doe' }]
      };
      const error = ValidationErrorFactory.cardParameterMismatch(parameterDetails);
      expect(error.message).toBe('Card parameter type mismatch: user_id expects id');
    });
  });

  describe('NetworkErrorFactory', () => {
    it('should create timeout error', () => {
      const error = NetworkErrorFactory.timeout('Search operation', 30000);
      expect(error.message).toBe('Operation timed out: Search operation (30000ms)');
    });

    it('should create connection error', () => {
      const error = NetworkErrorFactory.connectionError('https://example.com');
      expect(error.message).toBe('Cannot connect to Metabase server: https://example.com');
    });
  });

  describe('DatabaseErrorFactory', () => {
    it('should create query execution error', () => {
      const error = DatabaseErrorFactory.queryExecutionError('Table not found');
      expect(error.message).toBe('Query execution failed: Table not found');
    });

    it('should create connection lost error', () => {
      const error = DatabaseErrorFactory.connectionLost(1);
      expect(error.message).toBe('Database connection lost: 1');
    });
  });

  describe('RateLimitErrorFactory', () => {
    it('should create rate limit exceeded error with retry time', () => {
      const error = RateLimitErrorFactory.exceeded(120000);
      expect(error.message).toBe('Rate limit exceeded. Retry after 120000ms');
    });

    it('should create rate limit exceeded error without retry time', () => {
      const error = RateLimitErrorFactory.exceeded();
      expect(error.message).toBe('Rate limit exceeded.');
    });
  });

  describe('ExportErrorFactory', () => {
    it('should create file size exceeded error', () => {
      const error = ExportErrorFactory.fileSizeExceeded(5000000, 1000000);
      expect(error.message).toBe('Export file too large: 5000000 bytes (max: 1000000)');
    });

    it('should create processing failed error', () => {
      const error = ExportErrorFactory.processingFailed('CSV', 'Memory limit exceeded');
      expect(error.message).toBe('Export processing failed for CSV: Memory limit exceeded');
    });
  });

  describe('createErrorFromHttpResponse', () => {
    it('should create 400 validation error for SQL syntax', () => {
      const error = createErrorFromHttpResponse(
        400,
        { message: 'SQL syntax error: missing FROM clause' },
        'execute query'
      );
      expect(error.message).toBe('SQL syntax error: SQL syntax error: missing FROM clause');
    });

    it('should create 400 card parameter mismatch error', () => {
      const responseData = {
        error_type: 'invalid-parameter',
        'ex-data': {
          tag: { name: 'user_id', type: 'id' },
          params: [{ value: 'john_doe' }]
        }
      };
      const error = createErrorFromHttpResponse(400, responseData, 'execute card');
      expect(error.message).toBe('Card parameter type mismatch: user_id expects id');
    });

    it('should create 401 authentication error', () => {
      const error = createErrorFromHttpResponse(401, { message: 'Invalid API key' }, 'search cards');
      expect(error.message).toBe('Authentication failed: Invalid API key');
    });

    it('should create 403 authorization error', () => {
      const error = createErrorFromHttpResponse(403, { message: 'Access denied' }, 'get dashboard', 'dashboard', 123);
      expect(error.message).toBe('Access denied: Insufficient permissions for dashboard to access');
    });

    it('should create 404 resource not found error', () => {
      const error = createErrorFromHttpResponse(404, { message: 'Not found' }, 'get card', 'card', 456);
      expect(error.message).toBe('card not found: 456');
    });

    it('should create 429 rate limit error', () => {
      const error = createErrorFromHttpResponse(429, { message: 'Rate limit exceeded', retryAfter: 30000 }, 'search');
      expect(error.message).toBe('Rate limit exceeded. Retry after 30000ms');
    });

    it('should create 500 database error for SQL-related errors', () => {
      const error = createErrorFromHttpResponse(500, { message: 'Database connection timeout' }, 'execute query');
      expect(error.message).toBe('Query execution failed: Database connection timeout');
    });

    it('should create 503 service unavailable error', () => {
      const error = createErrorFromHttpResponse(503, { message: 'Service unavailable' }, 'list cards');
      expect(error.message).toBe('Metabase service temporarily unavailable');
    });
  });

  describe('validateMetabaseResponse', () => {
    const mockLogError = vi.fn();

    beforeEach(() => {
      mockLogError.mockClear();
    });

    it('should not throw for successful responses', () => {
      const successResponse = {
        data: { rows: [['test']], cols: [{ name: 'col1' }] },
        status: 'success'
      };

      expect(() => {
        validateMetabaseResponse(successResponse, { operation: 'Test operation', resourceId: 123 }, mockLogError);
      }).not.toThrow();

      expect(mockLogError).not.toHaveBeenCalled();
    });

    it('should throw McpError for invalid-parameter error type with detailed error data', () => {
      const errorResponse = {
        error_type: 'invalid-parameter',
        status: 'failed',
        error: 'For input string: "test"',
        via: [{
          error_type: 'invalid-parameter',
          'ex-data': {
            tag: { name: 'user_id', type: 'id' },
            params: [{ value: 'test_value' }]
          }
        }]
      };

      expect(() => {
        validateMetabaseResponse(errorResponse, { operation: 'Card execution', resourceId: 123 }, mockLogError);
      }).toThrow(McpError);

      expect(mockLogError).toHaveBeenCalledWith('Card execution parameter validation failed for 123', errorResponse);
    });

    it('should throw McpError for invalid-parameter error type with fallback error', () => {
      const errorResponse = {
        error_type: 'invalid-parameter',
        status: 'failed',
        error: 'Parameter validation failed'
      };

      expect(() => {
        validateMetabaseResponse(errorResponse, { operation: 'Card execution', resourceId: 456 }, mockLogError);
      }).toThrowError('Card execution parameter validation failed: Parameter validation failed');
    });

    it('should throw Error for failed status with error message', () => {
      const errorResponse = {
        status: 'failed',
        error: 'Database connection failed'
      };

      expect(() => {
        validateMetabaseResponse(errorResponse, { operation: 'Query execution' }, mockLogError);
      }).toThrowError('Query execution failed: Database connection failed.');
    });

    it('should throw Error for other error types with failed status', () => {
      const errorResponse = {
        error_type: 'database-error',
        status: 'failed',
        error: 'Database timeout'
      };

      expect(() => {
        validateMetabaseResponse(errorResponse, { operation: 'Query execution' }, mockLogError);
      }).toThrowError('Query execution failed: Database timeout.');
    });
  });

  describe('extractCleanErrorMessage', () => {
    it('should extract table not found error', () => {
      const error = 'Table "ORDERSASD" not found; SQL statement:\n-- Metabase:: userID: 1 queryType: native queryHash: 22df1740fa126b46d6d53bc2fd61d90c042ba4c4a1802d544dfd4449e29c2eae\nSELECT ID FROM ORDERSASD [42102-214]';
      expect(extractCleanErrorMessage(error)).toBe('Table "ORDERSASD" not found.');
    });

    it('should extract column not found error', () => {
      const error = 'Column "IDZ" not found; SQL statement:\nSELECT IDZ FROM ORDERS [42122-214]';
      expect(extractCleanErrorMessage(error)).toBe('Column "IDZ" not found.');
    });

    it('should handle error without SQL statement suffix', () => {
      const error = 'Only SELECT statements are allowed in a native query.';
      expect(extractCleanErrorMessage(error)).toBe('Only SELECT statements are allowed in a native query.');
    });

    it('should handle empty error string', () => {
      expect(extractCleanErrorMessage('')).toBe('Unknown query error');
    });

    it('should handle null/undefined error', () => {
      expect(extractCleanErrorMessage(null as any)).toBe('Unknown query error');
      expect(extractCleanErrorMessage(undefined as any)).toBe('Unknown query error');
    });

    it('should add period if missing', () => {
      const error = 'Database timeout';
      expect(extractCleanErrorMessage(error)).toBe('Database timeout.');
    });

    it('should not add period if already present', () => {
      const error = 'Connection failed.';
      expect(extractCleanErrorMessage(error)).toBe('Connection failed.');
    });

    it('should remove H2 database error codes', () => {
      const error = 'Syntax error in SQL statement [42001-214]';
      expect(extractCleanErrorMessage(error)).toBe('Syntax error in SQL statement.');
    });
  });
});
