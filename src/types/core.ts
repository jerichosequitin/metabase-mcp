// MCP Error codes (standard)
export enum ErrorCode {
  InternalError = 'internal_error',
  InvalidRequest = 'invalid_request',
  InvalidParams = 'invalid_params',
  MethodNotFound = 'method_not_found',
}

// Simple error class for MCP operations
export class McpError extends Error {
  code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'McpError';
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
