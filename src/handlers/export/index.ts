import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { MetabaseApiClient } from '../../api.js';
import { ErrorCode, McpError } from '../../types/core.js';
import {
  validateCardParameters,
  validatePositiveInteger,
  validateEnumValue,
} from '../../utils/index.js';
import { exportSqlQuery } from './exportQuery.js';
import { exportCard } from './exportCard.js';
import { ExportRequest, SqlExportParams, CardExportParams, ExportResponse } from './types.js';

export async function handleExport(
  request: CallToolRequest,
  requestId: string,
  apiClient: MetabaseApiClient,
  logDebug: (message: string, data?: unknown) => void,
  logInfo: (message: string, data?: unknown) => void,
  logWarn: (message: string, data?: unknown, error?: Error) => void,
  logError: (message: string, error: unknown) => void
): Promise<ExportResponse> {
  const args = request.params?.arguments as ExportRequest;

  const databaseId = args?.database_id;
  const query = args?.query;
  const cardId = args?.card_id;
  const nativeParameters = Array.isArray(args?.native_parameters) ? args.native_parameters : [];
  const cardParameters = Array.isArray(args?.card_parameters) ? args.card_parameters : [];
  const format = validateEnumValue(
    args?.format || 'csv',
    ['csv', 'json', 'xlsx'] as const,
    'format',
    requestId,
    logWarn
  );
  const filename = args?.filename;

  // Validate that either query+database_id or card_id is provided (but not considering 0 as falsy for this check)
  if (cardId === undefined && databaseId === undefined) {
    logWarn('Missing required parameters: either card_id or database_id must be provided', {
      requestId,
    });
    throw new McpError(
      ErrorCode.InvalidParams,
      'Either card_id or database_id parameter is required'
    );
  }

  if (cardId !== undefined && databaseId !== undefined) {
    logWarn('Both card_id and database_id provided - only one is allowed', { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      'Cannot specify both card_id and database_id - choose one export method'
    );
  }

  // Validate positive integer parameters
  if (cardId !== undefined) {
    validatePositiveInteger(cardId, 'card_id', requestId, logWarn);
  }
  if (databaseId !== undefined) {
    validatePositiveInteger(databaseId, 'database_id', requestId, logWarn);
  }

  // Strict parameter validation for card export mode
  if (cardId !== undefined) {
    // For card export, only card_id, card_parameters, format, and filename are allowed
    if (query || databaseId !== undefined || (nativeParameters && nativeParameters.length > 0)) {
      logWarn('Invalid parameters for card export mode', {
        requestId,
        invalidParams: {
          query: query ? 'provided' : 'not provided',
          database_id: databaseId ? 'provided' : 'not provided',
          native_parameters: nativeParameters?.length > 0 ? 'provided' : 'not provided',
        },
      });
      throw new McpError(
        ErrorCode.InvalidParams,
        'Card export mode only allows card_id, card_parameters, format, and filename parameters'
      );
    }
  }

  // Strict parameter validation for SQL export mode
  if (databaseId !== undefined) {
    // For SQL export, only database_id, query, native_parameters, format, and filename are allowed
    if (cardId !== undefined || (cardParameters && cardParameters.length > 0)) {
      logWarn('Invalid parameters for SQL export mode', {
        requestId,
        invalidParams: {
          card_id: cardId ? 'provided' : 'not provided',
          card_parameters: cardParameters?.length > 0 ? 'provided' : 'not provided',
        },
      });
      throw new McpError(
        ErrorCode.InvalidParams,
        'SQL export mode only allows database_id, query, native_parameters, format, and filename parameters'
      );
    }
  }

  // If exporting a card
  if (cardId !== undefined) {
    validatePositiveInteger(cardId, 'card_id', requestId, logWarn);

    // Validate card parameters format if provided
    if (cardParameters.length > 0) {
      try {
        validateCardParameters(cardParameters, requestId, logWarn);
      } catch (error) {
        logWarn(`Card parameter validation failed for card ${cardId}`, { error, requestId });
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid card parameters format. If parameter issues persist, consider using export_query with the card's underlying SQL query instead, which provides more reliable parameter handling. Original error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    const cardParams: CardExportParams = {
      cardId,
      cardParameters,
      format: format as 'csv' | 'json' | 'xlsx',
      filename,
    };

    return await exportCard(cardParams, requestId, apiClient, logDebug, logInfo, logWarn, logError);
  }

  // If exporting a SQL query
  if (!query || typeof query !== 'string') {
    logWarn('Missing or invalid query parameter in export request', { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      'SQL query parameter is required and must be a string'
    );
  }

  validatePositiveInteger(databaseId, 'database_id', requestId, logWarn);

  const sqlParams: SqlExportParams = {
    databaseId: databaseId as number,
    query,
    nativeParameters,
    format: format as 'csv' | 'json' | 'xlsx',
    filename,
  };

  return await exportSqlQuery(
    sqlParams,
    requestId,
    apiClient,
    logDebug,
    logInfo,
    logWarn,
    logError
  );
}
