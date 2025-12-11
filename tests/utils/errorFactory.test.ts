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
import { ErrorCategory, RecoveryAction, McpError } from '../../src/types/core.js';

describe('ErrorFactory', () => {
  describe('AuthenticationErrorFactory', () => {
    it('should create invalid credentials error', () => {
      const error = AuthenticationErrorFactory.invalidCredentials();
      
      expect(error.message).toBe('Authentication failed: Invalid credentials');
      expect(error.details.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(error.details.recoveryAction).toBe(RecoveryAction.CHECK_CREDENTIALS);
      expect(error.details.retryable).toBe(false);
      expect(error.details.troubleshootingSteps).toHaveLength(4);
    });

    it('should create session expired error', () => {
      const error = AuthenticationErrorFactory.sessionExpired();
      
      expect(error.message).toBe('Authentication failed: Session expired');
      expect(error.details.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(error.details.recoveryAction).toBe(RecoveryAction.RETRY_IMMEDIATELY);
      expect(error.details.retryable).toBe(true);
    });

    it('should create invalid API key error', () => {
      const error = AuthenticationErrorFactory.invalidApiKey();
      
      expect(error.message).toBe('Authentication failed: Invalid API key');
      expect(error.details.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(error.details.recoveryAction).toBe(RecoveryAction.CHECK_CREDENTIALS);
      expect(error.details.retryable).toBe(false);
    });
  });

  describe('AuthorizationErrorFactory', () => {
    it('should create insufficient permissions error', () => {
      const error = AuthorizationErrorFactory.insufficientPermissions('dashboard', 'access');
      
      expect(error.message).toBe('Access denied: Insufficient permissions for dashboard to access');
      expect(error.details.category).toBe(ErrorCategory.AUTHORIZATION);
      expect(error.details.recoveryAction).toBe(RecoveryAction.VERIFY_PERMISSIONS);
      expect(error.details.retryable).toBe(false);
    });

    it('should create collection access error', () => {
      const error = AuthorizationErrorFactory.collectionAccess(123);
      
      expect(error.message).toBe('Access denied: Cannot access collection 123');
      expect(error.details.category).toBe(ErrorCategory.AUTHORIZATION);
      expect(error.details.additionalContext).toEqual({ collectionId: 123 });
    });
  });

  describe('ResourceNotFoundErrorFactory', () => {
    it('should create resource not found error', () => {
      const error = ResourceNotFoundErrorFactory.resource('dashboard', 456);
      
      expect(error.message).toBe('dashboard not found: 456');
      expect(error.details.category).toBe(ErrorCategory.RESOURCE_NOT_FOUND);
      expect(error.details.recoveryAction).toBe(RecoveryAction.CHECK_RESOURCE_EXISTS);
      expect(error.details.retryable).toBe(false);
    });

    it('should create database not found error', () => {
      const error = ResourceNotFoundErrorFactory.database(789);
      
      expect(error.message).toBe('Database not found: 789');
      expect(error.details.category).toBe(ErrorCategory.RESOURCE_NOT_FOUND);
      expect(error.details.additionalContext).toEqual({ databaseId: 789 });
    });
  });

  describe('ValidationErrorFactory', () => {
    it('should create invalid parameter error', () => {
      const error = ValidationErrorFactory.invalidParameter('card_id', 'invalid', 'Must be a positive integer');
      
      expect(error.message).toBe('Invalid parameter: card_id');
      expect(error.details.category).toBe(ErrorCategory.VALIDATION);
      expect(error.details.recoveryAction).toBe(RecoveryAction.VALIDATE_INPUT);
      expect(error.details.retryable).toBe(false);
    });

    it('should create SQL syntax error', () => {
      const error = ValidationErrorFactory.sqlSyntaxError('SELECT * FROM', 'Missing table name');
      
      expect(error.message).toBe('SQL syntax error: Missing table name');
      expect(error.details.category).toBe(ErrorCategory.QUERY_EXECUTION);
      expect(error.details.recoveryAction).toBe(RecoveryAction.VALIDATE_INPUT);
    });

    it('should create card parameter mismatch error', () => {
      const parameterDetails = {
        tag: {
          id: 'param-id',
          name: 'user_id',
          'display-name': 'User ID',
          type: 'id',
          dimension: ['template-tag', 'user_id']
        },
        type: 'invalid-parameter',
        params: [
          {
            value: 'john_doe',
            id: 'param-id',
            type: 'id',
            target: ['dimension', ['template-tag', 'user_id']],
            slug: 'user_id'
          }
        ]
      };

      const error = ValidationErrorFactory.cardParameterMismatch(parameterDetails);
      
      expect(error.message).toBe('Card parameter type mismatch: user_id');
      expect(error.details.category).toBe(ErrorCategory.VALIDATION);
      expect(error.details.recoveryAction).toBe(RecoveryAction.VALIDATE_INPUT);
      expect(error.details.retryable).toBe(false);
      expect(error.details.agentGuidance).toContain('Parameter \'user_id\' expects id type but received \'john_doe\'');
      expect(error.details.troubleshootingSteps).toContain('Verify parameter \'user_id\' value matches expected type: id');
      expect(error.details.additionalContext).toEqual({
        parameterName: 'user_id',
        expectedType: 'id',
        submittedValue: 'john_doe',
        parameterDetails
      });
    });

  });

  describe('NetworkErrorFactory', () => {
    it('should create timeout error', () => {
      const error = NetworkErrorFactory.timeout('Search operation', 30000);
      
      expect(error.message).toBe('Operation timed out: Search operation');
      expect(error.details.category).toBe(ErrorCategory.TIMEOUT);
      expect(error.details.recoveryAction).toBe(RecoveryAction.REDUCE_QUERY_COMPLEXITY);
      expect(error.details.retryable).toBe(true);
      expect(error.details.retryAfterMs).toBe(5000);
    });

    it('should create connection error', () => {
      const error = NetworkErrorFactory.connectionError('https://example.com');
      
      expect(error.message).toBe('Cannot connect to Metabase server: https://example.com');
      expect(error.details.category).toBe(ErrorCategory.NETWORK);
      expect(error.details.recoveryAction).toBe(RecoveryAction.WAIT_AND_RETRY);
      expect(error.details.retryable).toBe(true);
    });
  });

  describe('DatabaseErrorFactory', () => {
    it('should create query execution error', () => {
      const error = DatabaseErrorFactory.queryExecutionError('Table not found', 'SELECT * FROM missing_table');
      
      expect(error.message).toBe('Query execution failed: Table not found');
      expect(error.details.category).toBe(ErrorCategory.QUERY_EXECUTION);
      expect(error.details.recoveryAction).toBe(RecoveryAction.REDUCE_QUERY_COMPLEXITY);
      expect(error.details.retryable).toBe(true);
    });

    it('should create connection lost error', () => {
      const error = DatabaseErrorFactory.connectionLost(1);
      
      expect(error.message).toBe('Database connection lost: 1');
      expect(error.details.category).toBe(ErrorCategory.DATABASE);
      expect(error.details.recoveryAction).toBe(RecoveryAction.WAIT_AND_RETRY);
      expect(error.details.retryable).toBe(true);
    });
  });

  describe('RateLimitErrorFactory', () => {
    it('should create rate limit exceeded error', () => {
      const error = RateLimitErrorFactory.exceeded(120000);
      
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.details.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(error.details.recoveryAction).toBe(RecoveryAction.WAIT_AND_RETRY);
      expect(error.details.retryable).toBe(true);
      expect(error.details.retryAfterMs).toBe(120000);
    });

    it('should create rate limit exceeded error with default retry time', () => {
      const error = RateLimitErrorFactory.exceeded();
      
      expect(error.details.retryAfterMs).toBe(60000);
    });
  });

  describe('ExportErrorFactory', () => {
    it('should create file size exceeded error', () => {
      const error = ExportErrorFactory.fileSizeExceeded(5000000, 1000000);
      
      expect(error.message).toBe('Export file too large: 5000000 bytes');
      expect(error.details.category).toBe(ErrorCategory.EXPORT_PROCESSING);
      expect(error.details.recoveryAction).toBe(RecoveryAction.USE_SMALLER_DATASET);
      expect(error.details.retryable).toBe(false);
    });

    it('should create processing failed error', () => {
      const error = ExportErrorFactory.processingFailed('CSV', 'Memory limit exceeded');
      
      expect(error.message).toBe('Export processing failed: Memory limit exceeded');
      expect(error.details.category).toBe(ErrorCategory.EXPORT_PROCESSING);
      expect(error.details.recoveryAction).toBe(RecoveryAction.SWITCH_TO_ALTERNATIVE);
      expect(error.details.retryable).toBe(true);
    });
  });

  describe('createErrorFromHttpResponse', () => {
    it('should create 400 validation error for SQL syntax', () => {
      const error = createErrorFromHttpResponse(
        400,
        { message: 'SQL syntax error: missing FROM clause' },
        'execute query'
      );
      
      expect(error.details.category).toBe(ErrorCategory.QUERY_EXECUTION);
      expect(error.details.recoveryAction).toBe(RecoveryAction.VALIDATE_INPUT);
    });

    it('should create 400 card parameter mismatch error for invalid-parameter error type', () => {
      const responseData = {
        error_type: 'invalid-parameter',
        'ex-data': {
          tag: {
            id: 'param-id',
            name: 'user_id',
            'display-name': 'User ID',
            type: 'id',
            dimension: ['template-tag', 'user_id']
          },
          type: 'invalid-parameter',
          params: [
            {
              value: 'john_doe',
              id: 'param-id',
              type: 'id',
              target: ['dimension', ['template-tag', 'user_id']],
              slug: 'user_id'
            }
          ]
        }
      };

      const error = createErrorFromHttpResponse(
        400,
        responseData,
        'execute card'
      );
      
      expect(error.message).toBe('Card parameter type mismatch: user_id');
      expect(error.details.category).toBe(ErrorCategory.VALIDATION);
      expect(error.details.recoveryAction).toBe(RecoveryAction.VALIDATE_INPUT);
      expect(error.details.agentGuidance).toContain('Parameter \'user_id\' expects id type but received \'john_doe\'');
    });

    it('should create 401 authentication error', () => {
      const error = createErrorFromHttpResponse(
        401,
        { message: 'Invalid API key' },
        'search cards'
      );
      
      expect(error.details.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(error.details.recoveryAction).toBe(RecoveryAction.CHECK_CREDENTIALS);
    });

    it('should create 403 authorization error', () => {
      const error = createErrorFromHttpResponse(
        403,
        { message: 'Access denied' },
        'get dashboard',
        'dashboard',
        123
      );
      
      expect(error.details.category).toBe(ErrorCategory.AUTHORIZATION);
      expect(error.details.recoveryAction).toBe(RecoveryAction.VERIFY_PERMISSIONS);
    });

    it('should create 404 resource not found error', () => {
      const error = createErrorFromHttpResponse(
        404,
        { message: 'Not found' },
        'get card',
        'card',
        456
      );
      
      expect(error.details.category).toBe(ErrorCategory.RESOURCE_NOT_FOUND);
      expect(error.details.recoveryAction).toBe(RecoveryAction.CHECK_RESOURCE_EXISTS);
    });

    it('should create 429 rate limit error', () => {
      const error = createErrorFromHttpResponse(
        429,
        { message: 'Rate limit exceeded', retryAfter: 30000 },
        'search operation'
      );
      
      expect(error.details.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(error.details.recoveryAction).toBe(RecoveryAction.WAIT_AND_RETRY);
      expect(error.details.retryAfterMs).toBe(30000);
    });

    it('should create 500 database error for SQL-related errors', () => {
      const error = createErrorFromHttpResponse(
        500,
        { message: 'Database connection timeout' },
        'execute query'
      );
      
      expect(error.details.category).toBe(ErrorCategory.QUERY_EXECUTION);
      expect(error.details.recoveryAction).toBe(RecoveryAction.REDUCE_QUERY_COMPLEXITY);
    });

    it('should create 503 service unavailable error', () => {
      const error = createErrorFromHttpResponse(
        503,
        { message: 'Service unavailable' },
        'list cards'
      );
      
      expect(error.details.category).toBe(ErrorCategory.EXTERNAL_SERVICE);
      expect(error.details.recoveryAction).toBe(RecoveryAction.WAIT_AND_RETRY);
      expect(error.details.retryAfterMs).toBe(30000);
    });
  });

  describe('McpError agent response', () => {
    it('should create structured agent response', () => {
      const error = AuthenticationErrorFactory.invalidCredentials();
      const response = error.toAgentResponse();
      
      expect(response.error).toBe(error.message);
      expect(response.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(response.guidance).toBe(error.details.agentGuidance);
      expect(response.recoveryAction).toBe(RecoveryAction.CHECK_CREDENTIALS);
      expect(response.retryable).toBe(false);
      expect(response.troubleshootingSteps).toHaveLength(4);
    });

    it('should include retry time when available', () => {
      const error = RateLimitErrorFactory.exceeded(60000);
      const response = error.toAgentResponse();
      
      expect(response.retryAfterMs).toBe(60000);
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
        validateMetabaseResponse(
          successResponse,
          { operation: 'Test operation', resourceId: 123 },
          mockLogError
        );
      }).not.toThrow();

      expect(mockLogError).not.toHaveBeenCalled();
    });

    it('should throw McpError for invalid-parameter error type with detailed error data', () => {
      const errorResponse = {
        error_type: 'invalid-parameter',
        status: 'failed',
        error: 'For input string: "test"',
        via: [
          {
            'ex-data': {
              tag: {
                id: 'param-id',
                name: 'user_id',
                'display-name': 'User ID',
                type: 'id',
                dimension: ['template-tag', 'user_id']
              },
              type: 'invalid-parameter',
              params: [
                {
                  value: 'test_value',
                  id: 'param-id',
                  type: 'id',
                  target: ['dimension', ['template-tag', 'user_id']],
                  slug: 'user_id'
                }
              ]
            }
          }
        ]
      };

      expect(() => {
        validateMetabaseResponse(
          errorResponse,
          { operation: 'Card execution', resourceId: 123 },
          mockLogError
        );
      }).toThrow(McpError);

      expect(mockLogError).toHaveBeenCalledWith(
        'Card execution parameter validation failed for 123',
        errorResponse
      );
    });

    it('should throw McpError for invalid-parameter error type with fallback error', () => {
      const errorResponse = {
        error_type: 'invalid-parameter',
        status: 'failed',
        error: 'Parameter validation failed'
      };

      expect(() => {
        validateMetabaseResponse(
          errorResponse,
          { operation: 'Card execution', resourceId: 456 },
          mockLogError
        );
      }).toThrowError('Card execution parameter validation failed: Parameter validation failed');

      expect(mockLogError).toHaveBeenCalledWith(
        'Card execution parameter validation failed for 456',
        errorResponse
      );
    });

    it('should throw McpError for other error types with failed status', () => {
      const errorResponse = {
        error_type: 'database-error',
        status: 'failed',
        error: 'Database connection failed'
      };

      expect(() => {
        validateMetabaseResponse(
          errorResponse,
          { operation: 'Query execution' },
          mockLogError
        );
      }).toThrowError('Database connection failed.');

      expect(mockLogError).toHaveBeenCalledWith(
        'Query execution failed: Database connection failed.',
        errorResponse
      );
    });

    it('should handle context without resourceId', () => {
      const errorResponse = {
        error_type: 'invalid-parameter',
        status: 'failed',
        error: 'Invalid parameter'
      };

      expect(() => {
        validateMetabaseResponse(
          errorResponse,
          { operation: 'Search operation' },
          mockLogError
        );
      }).toThrow(McpError);

      expect(mockLogError).toHaveBeenCalledWith(
        'Search operation parameter validation failed',
        errorResponse
      );
    });

    it('should extract error details from top-level ex-data if via array is not present', () => {
      const errorResponse = {
        error_type: 'invalid-parameter',
        status: 'failed',
        error: 'Parameter error',
        'ex-data': {
          tag: {
            id: 'param-id',
            name: 'test_param',
            'display-name': 'Test Parameter',
            type: 'text',
            dimension: ['template-tag', 'test_param']
          },
          type: 'invalid-parameter',
          params: [
            {
              value: 'invalid_value',
              id: 'param-id',
              type: 'text',
              target: ['dimension', ['template-tag', 'test_param']],
              slug: 'test_param'
            }
          ]
        }
      };

      expect(() => {
        validateMetabaseResponse(
          errorResponse,
          { operation: 'Test operation', resourceId: 789 },
          mockLogError
        );
      }).toThrow(McpError);

      expect(mockLogError).toHaveBeenCalledWith(
        'Test operation parameter validation failed for 789',
        errorResponse
      );
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