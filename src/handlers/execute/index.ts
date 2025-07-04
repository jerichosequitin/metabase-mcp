import { z } from 'zod';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MetabaseApiClient } from '../../api.js';
import { ErrorCode, McpError } from '../../types/core.js';
import { executeSqlQuery } from './executeQuery.js';
import { executeCard } from './executeCard.js';
import {
  ExecuteRequest,
  SqlExecutionParams,
  CardExecutionParams,
  ExecutionResponse,
} from './types.js';

export async function handleExecute(
  request: z.infer<typeof CallToolRequestSchema>,
  requestId: string,
  apiClient: MetabaseApiClient,
  logDebug: (message: string, data?: unknown) => void,
  logInfo: (message: string, data?: unknown) => void,
  logWarn: (message: string, data?: unknown, error?: Error) => void,
  logError: (message: string, error: unknown) => void
): Promise<ExecutionResponse> {
  const args = request.params?.arguments as ExecuteRequest;

  const databaseId = args?.database_id;
  const query = args?.query;
  const cardId = args?.card_id;
  const nativeParameters = Array.isArray(args?.native_parameters) ? args.native_parameters : [];
  const cardParameters = Array.isArray(args?.card_parameters) ? args.card_parameters : [];
  const rowLimitArg = args?.row_limit;
  const rowLimit = typeof rowLimitArg === 'number' ? rowLimitArg : 500;

  // Validate that either query+database_id or card_id is provided
  if (!cardId && !databaseId) {
    logWarn('Missing required parameters: either card_id or database_id must be provided', {
      requestId,
    });
    throw new McpError(
      ErrorCode.InvalidParams,
      'Either card_id or database_id parameter is required'
    );
  }

  if (cardId && databaseId) {
    logWarn('Both card_id and database_id provided - only one is allowed', { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      'Cannot specify both card_id and database_id - choose one execution method'
    );
  }

  // Strict parameter validation for card execution mode
  if (cardId) {
    // For card execution, only card_id, card_parameters, and row_limit are allowed
    if (query || databaseId || (nativeParameters && nativeParameters.length > 0)) {
      logWarn('Invalid parameters for card execution mode', {
        requestId,
        invalidParams: {
          query: query ? 'provided' : 'not provided',
          database_id: databaseId ? 'provided' : 'not provided',
          native_parameters: nativeParameters?.length > 0 ? 'provided' : 'not provided',
        },
      });
      throw new McpError(
        ErrorCode.InvalidParams,
        'Card execution mode only allows card_id, card_parameters, and row_limit parameters'
      );
    }
  }

  // Strict parameter validation for SQL execution mode
  if (databaseId) {
    // For SQL execution, only database_id, query, native_parameters, and row_limit are allowed
    if (cardId || (cardParameters && cardParameters.length > 0)) {
      logWarn('Invalid parameters for SQL execution mode', {
        requestId,
        invalidParams: {
          card_id: cardId ? 'provided' : 'not provided',
          card_parameters: cardParameters?.length > 0 ? 'provided' : 'not provided',
        },
      });
      throw new McpError(
        ErrorCode.InvalidParams,
        'SQL execution mode only allows database_id, query, native_parameters, and row_limit parameters'
      );
    }
  }

  // If executing a card
  if (cardId) {
    if (typeof cardId !== 'number') {
      logWarn('Invalid card_id parameter - must be a number', { requestId });
      throw new McpError(ErrorCode.InvalidParams, 'Card ID must be a number');
    }

    // Validate row limit for cards
    if (rowLimit < 1 || rowLimit > 2000) {
      logWarn(`Invalid row_limit parameter: ${rowLimit}. Must be between 1 and 2000.`, {
        requestId,
      });
      throw new McpError(
        ErrorCode.InvalidParams,
        'Row limit must be between 1 and 2000. For larger datasets, use export_query instead.'
      );
    }

    const cardParams: CardExecutionParams = {
      cardId,
      cardParameters,
      rowLimit,
    };

    return await executeCard(
      cardParams,
      requestId,
      apiClient,
      logDebug,
      logInfo,
      logWarn,
      logError
    );
  }

  // If executing a SQL query
  if (!query || typeof query !== 'string') {
    logWarn('Missing or invalid query parameter in execute request', { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      'SQL query parameter is required and must be a string'
    );
  }

  // Validate row limit for SQL queries
  if (rowLimit < 1 || rowLimit > 2000) {
    logWarn(`Invalid row_limit parameter: ${rowLimit}. Must be between 1 and 2000.`, { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      'Row limit must be between 1 and 2000. For larger datasets, use export_query instead.'
    );
  }

  const sqlParams: SqlExecutionParams = {
    databaseId: databaseId as number,
    query,
    nativeParameters,
    rowLimit,
  };

  return await executeSqlQuery(
    sqlParams,
    requestId,
    apiClient,
    logDebug,
    logInfo,
    logWarn,
    logError
  );
}
