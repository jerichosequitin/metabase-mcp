import { MetabaseApiClient } from '../../api.js';
import { handleApiError, validatePositiveInteger } from '../../utils/index.js';
import { SqlExecutionParams, ExecutionResponse } from './types.js';

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

    const rowCount = response?.data?.rows?.length || 0;
    logInfo(
      `Successfully executed SQL query against database: ${databaseId}, returned ${rowCount} rows (limit: ${finalLimit})`
    );

    // Create optimized response with only essential data
    const optimizedData = {
      rows: response?.data?.rows || [],
      cols: response?.data?.cols || [],
      row_count: rowCount,
      native_form: {
        query: response?.data?.native_form?.query || limitedQuery,
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              query: query,
              database_id: databaseId,
              row_count: rowCount,
              applied_limit: finalLimit,
              data: optimizedData,
            },
            null,
            2
          ),
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
        customMessages: {
          '400':
            'Invalid query parameters or SQL syntax error. Check your query syntax and ensure all table/column names are correct.',
          '500': 'Database server error. The query may have caused a timeout or database issue.',
        },
      },
      logError
    );
  }
}
