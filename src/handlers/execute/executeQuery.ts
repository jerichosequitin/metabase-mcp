import { MetabaseApiClient } from '../../api.js';
import {
  handleApiError,
  validatePositiveInteger,
  validateMetabaseResponse,
  formatJson,
} from '../../utils/index.js';
import { SqlExecutionParams, ExecutionResponse } from './types.js';
import { optimizeExecuteData } from './optimizers.js';
import { config } from '../../config.js';
import { ErrorCode, McpError } from '../../types/core.js';

/**
 * Validates if a SQL query is read-only (SELECT-only).
 * Used when METABASE_READ_ONLY_MODE is enabled.
 */
export function isReadOnlyQuery(sql: string): boolean {
  // Normalize the query: trim whitespace and remove leading comments
  const normalized = sql
    .trim()
    // Remove single-line comments
    .replace(/--.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()
    .toUpperCase();

  // Patterns that indicate write operations
  const writePatterns = [
    /^\s*INSERT\b/,
    /^\s*UPDATE\b/,
    /^\s*DELETE\b/,
    /^\s*DROP\b/,
    /^\s*CREATE\b/,
    /^\s*ALTER\b/,
    /^\s*TRUNCATE\b/,
    /^\s*REPLACE\b/,
    /^\s*MERGE\b/,
    /^\s*CALL\b/, // Stored procedures
    /^\s*EXEC(UTE)?\b/, // Execute statements
    /^\s*GRANT\b/,
    /^\s*REVOKE\b/,
    /^\s*SET\b/, // Can modify session variables
  ];

  return !writePatterns.some(pattern => pattern.test(normalized));
}

export async function executeSqlQuery(
  params: SqlExecutionParams,
  requestId: string,
  apiClient: MetabaseApiClient,
  logDebug: (message: string, data?: unknown) => void,
  logInfo: (message: string, data?: unknown) => void,
  logWarn: (message: string, data?: unknown, error?: Error) => void,
  logError: (message: string, error: unknown) => void
): Promise<ExecutionResponse> {
  const { databaseId, query, nativeParameters, rowLimit } = params;

  // Validate positive integer parameters
  validatePositiveInteger(databaseId, 'database_id', requestId, logWarn);
  validatePositiveInteger(rowLimit, 'row_limit', requestId, logWarn);

  // Check read-only mode restriction
  if (config.METABASE_READ_ONLY_MODE && !isReadOnlyQuery(query)) {
    logWarn('Write operation blocked by read-only mode', {
      requestId,
      query: query.substring(0, 100),
    });
    throw new McpError(
      ErrorCode.InvalidRequest,
      'Read-only mode is enabled. Only SELECT queries are permitted. Write operations (INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, etc.) are blocked. To execute write queries, disable read-only mode by setting METABASE_READ_ONLY_MODE=false.'
    );
  }

  logDebug(`Executing SQL query against database ID: ${databaseId} with row limit: ${rowLimit}`);

  // Handle LIMIT clause: only override if our limit is more restrictive than existing limit
  let limitedQuery = query.trim();
  let finalLimit = rowLimit;
  let shouldAddLimit = false;

  // Look for existing LIMIT clause at the end of the query (most common case)
  // This regex properly handles LIMIT with optional OFFSET and accounts for trailing semicolons/whitespace
  const limitRegex = /\bLIMIT\s+(\d+)(?:\s+OFFSET\s+\d+)?\s*;?\s*$/i;
  const limitMatch = limitedQuery.match(limitRegex);

  if (limitMatch) {
    const existingLimit = parseInt(limitMatch[1], 10);
    logDebug(`Found existing LIMIT clause: ${existingLimit}, requested limit: ${rowLimit}`);

    if (existingLimit <= rowLimit) {
      // Existing limit is more restrictive or equal, keep it
      logDebug(
        `Keeping existing LIMIT ${existingLimit} as it's more restrictive than or equal to requested ${rowLimit}`
      );
      finalLimit = existingLimit;
      // Don't modify the query
    } else {
      // Our limit is more restrictive, replace the existing LIMIT clause
      logDebug(`Replacing existing LIMIT ${existingLimit} with more restrictive limit ${rowLimit}`);
      limitedQuery = limitedQuery.replace(limitRegex, '').trim();
      shouldAddLimit = true;
    }
  } else {
    // No LIMIT clause found at the end, add ours
    logDebug(`No existing LIMIT clause found, adding limit ${rowLimit}`);
    shouldAddLimit = true;
  }

  // Add LIMIT clause if needed
  if (shouldAddLimit) {
    if (limitedQuery.endsWith(';')) {
      limitedQuery = limitedQuery.slice(0, -1) + ` LIMIT ${rowLimit};`;
    } else {
      limitedQuery = limitedQuery + ` LIMIT ${rowLimit}`;
    }
  }

  // Build query request body
  const queryData = {
    type: 'native',
    native: {
      query: limitedQuery,
      template_tags: {},
    },
    parameters: nativeParameters,
    database: databaseId,
  };

  try {
    const response = await apiClient.request<any>('/api/dataset', {
      method: 'POST',
      body: JSON.stringify(queryData),
    });

    // Check for embedded errors in the response (Metabase returns 202 with errors for invalid queries)
    validateMetabaseResponse(
      response,
      { operation: 'SQL query execution', resourceId: databaseId },
      logError
    );

    const rowCount = response?.data?.rows?.length || 0;
    logInfo(
      `Successfully executed SQL query against database: ${databaseId}, returned ${rowCount} rows (limit: ${finalLimit})`
    );

    // Create optimized response with only essential data
    const optimizedData = optimizeExecuteData(response?.data);

    return {
      content: [
        {
          type: 'text',
          text: formatJson({
            success: true,
            database_id: databaseId,
            row_count: rowCount,
            applied_limit: finalLimit,
            data: optimizedData,
          }),
        },
      ],
    };
  } catch (error: any) {
    throw handleApiError(
      error,
      {
        operation: 'SQL query execution',
        resourceType: 'database',
        resourceId: databaseId as number,
      },
      logError
    );
  }
}
