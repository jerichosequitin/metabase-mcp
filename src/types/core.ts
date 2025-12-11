// MCP Error codes (standard)
export enum ErrorCode {
  InternalError = 'internal_error',
  InvalidRequest = 'invalid_request',
  InvalidParams = 'invalid_params',
  MethodNotFound = 'method_not_found',
}

// Enhanced error categories for better agent guidance
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  NETWORK = 'network',
  DATABASE = 'database',
  QUERY_EXECUTION = 'query_execution',
  EXPORT_PROCESSING = 'export_processing',
  CACHE = 'cache',
  CONFIGURATION = 'configuration',
  INTERNAL_SERVER = 'internal_server',
  EXTERNAL_SERVICE = 'external_service',
}

// Recovery action recommendations for agents
export enum RecoveryAction {
  RETRY_IMMEDIATELY = 'retry_immediately',
  RETRY_WITH_BACKOFF = 'retry_with_backoff',
  CHECK_CREDENTIALS = 'check_credentials',
  VERIFY_PERMISSIONS = 'verify_permissions',
  VALIDATE_INPUT = 'validate_input',
  REDUCE_QUERY_COMPLEXITY = 'reduce_query_complexity',
  USE_SMALLER_DATASET = 'use_smaller_dataset',
  CHECK_RESOURCE_EXISTS = 'check_resource_exists',
  CONTACT_ADMIN = 'contact_admin',
  WAIT_AND_RETRY = 'wait_and_retry',
  SWITCH_TO_ALTERNATIVE = 'switch_to_alternative',
  CLEAR_CACHE = 'clear_cache',
  NO_RETRY = 'no_retry',
}

// Enhanced error interface with detailed guidance
export interface ErrorDetails {
  category: ErrorCategory;
  httpStatus?: number;
  metabaseCode?: string;
  userMessage: string;
  agentGuidance: string;
  recoveryAction: RecoveryAction;
  retryable: boolean;
  retryAfterMs?: number;
  additionalContext?: Record<string, unknown>;
  troubleshootingSteps?: string[];
}

// Custom error class with enhanced guidance
export class McpError extends Error {
  code: ErrorCode;
  details: ErrorDetails;

  constructor(code: ErrorCode, message: string, details?: Partial<ErrorDetails>) {
    super(message);
    this.code = code;
    this.name = 'McpError';

    // Set default details if not provided
    this.details = {
      category: ErrorCategory.INTERNAL_SERVER,
      userMessage: message,
      agentGuidance: 'An unexpected error occurred. Please try again.',
      recoveryAction: RecoveryAction.RETRY_WITH_BACKOFF,
      retryable: true,
      ...details,
    };
  }

  // Helper method to create structured error response for agents
  toAgentResponse(): {
    error: string;
    category: string;
    guidance: string;
    recoveryAction: string;
    retryable: boolean;
    retryAfterMs?: number;
    troubleshootingSteps?: string[];
  } {
    return {
      error: this.message,
      category: this.details.category,
      guidance: this.details.agentGuidance,
      recoveryAction: this.details.recoveryAction,
      retryable: this.details.retryable,
      retryAfterMs: this.details.retryAfterMs,
      troubleshootingSteps: this.details.troubleshootingSteps,
    };
  }
}

/**
 * Type guard for McpError that works across ESM module boundaries.
 * Uses duck typing instead of instanceof to avoid class identity issues.
 */
export function isMcpError(error: unknown): error is McpError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'details' in error &&
    'message' in error &&
    (error as McpError).name === 'McpError'
  );
}

// API error type definition
export interface ApiError {
  status?: number;
  message?: string;
  data?: { message?: string };
}

// Create custom Schema objects using z.object
