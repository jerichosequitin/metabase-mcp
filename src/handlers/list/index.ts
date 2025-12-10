import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { MetabaseApiClient } from '../../api.js';
import { ErrorCode, McpError } from '../../types/core.js';
import {
  handleApiError,
  validateEnumValue,
  parseAndValidatePositiveInteger,
  parseAndValidateNonNegativeInteger,
} from '../../utils/index.js';
import { ValidationErrorFactory } from '../../utils/errorFactory.js';
import {
  optimizeCardForList,
  optimizeDashboardForList,
  optimizeTableForList,
  optimizeDatabaseForList,
  optimizeCollectionForList,
} from './optimizers.js';

export async function handleList(
  request: CallToolRequest,
  requestId: string,
  apiClient: MetabaseApiClient,
  logDebug: (message: string, data?: unknown) => void,
  logInfo: (message: string, data?: unknown) => void,
  logWarn: (message: string, data?: unknown, error?: Error) => void,
  logError: (message: string, data?: unknown) => void
) {
  const { model, offset, limit } = request.params?.arguments || {};

  // Validate required parameters
  if (!model || typeof model !== 'string') {
    logWarn('Missing or invalid model parameter in list request', { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      'Model parameter is required and must be a string. Supported models: cards, dashboards, tables, databases, collections'
    );
  }

  // Validate model type with case insensitive handling
  const supportedModels = ['cards', 'dashboards', 'tables', 'databases', 'collections'] as const;

  const validatedModel = validateEnumValue(model, supportedModels, 'model', requestId, logWarn);

  // Validate pagination parameters
  let paginationOffset = 0;
  let paginationLimit: number | undefined = undefined;

  if (offset !== undefined) {
    paginationOffset = parseAndValidateNonNegativeInteger(offset, 'offset', requestId, logWarn);
  }

  if (limit !== undefined) {
    paginationLimit = parseAndValidatePositiveInteger(limit, 'limit', requestId, logWarn);

    if (paginationLimit > 1000) {
      logWarn('limit too large, maximum is 1000', { requestId, limit: paginationLimit });
      throw ValidationErrorFactory.invalidParameter(
        'limit',
        `${paginationLimit}`,
        'Maximum allowed: 1000 items per page'
      );
    }
  }

  logDebug(
    `Listing ${validatedModel} from Metabase ${paginationLimit ? `(paginated: offset=${paginationOffset}, limit=${paginationLimit})` : '(all items)'}`
  );

  try {
    const startTime = Date.now();
    let optimizeFunction: (item: any) => any;
    let apiResponse: any;
    let dataSource: 'cache' | 'api';
    let fetchTime: number;

    switch (validatedModel) {
      case 'cards': {
        optimizeFunction = optimizeCardForList;
        const cardsResponse = await apiClient.getCardsList();
        apiResponse = cardsResponse.data;
        dataSource = cardsResponse.source;
        fetchTime = cardsResponse.fetchTime;
        break;
      }
      case 'dashboards': {
        optimizeFunction = optimizeDashboardForList;
        const dashboardsResponse = await apiClient.getDashboardsList();
        apiResponse = dashboardsResponse.data;
        dataSource = dashboardsResponse.source;
        fetchTime = dashboardsResponse.fetchTime;
        break;
      }
      case 'tables': {
        optimizeFunction = optimizeTableForList;
        const tablesResponse = await apiClient.getTablesList();
        apiResponse = tablesResponse.data;
        dataSource = tablesResponse.source;
        fetchTime = tablesResponse.fetchTime;
        break;
      }
      case 'databases': {
        optimizeFunction = optimizeDatabaseForList;
        const databasesResponse = await apiClient.getDatabasesList();
        apiResponse = databasesResponse.data;
        dataSource = databasesResponse.source;
        fetchTime = databasesResponse.fetchTime;
        break;
      }
      case 'collections': {
        optimizeFunction = optimizeCollectionForList;
        const collectionsResponse = await apiClient.getCollectionsList();
        apiResponse = collectionsResponse.data;
        dataSource = collectionsResponse.source;
        fetchTime = collectionsResponse.fetchTime;
        break;
      }
      default:
        throw new Error(`Unsupported model: ${validatedModel}`);
    }

    logDebug(
      `Fetching ${validatedModel} from ${dataSource} (${dataSource === 'api' ? 'fresh data' : 'cached data'})`
    );

    // Optimize each item for list view
    const optimizedItems = apiResponse.map(optimizeFunction);
    const totalItemsBeforePagination = optimizedItems.length;

    // Apply pagination if specified
    let paginatedItems = optimizedItems;
    let paginationMetadata: any = undefined;

    if (paginationLimit !== undefined) {
      const startIndex = paginationOffset;
      const endIndex = paginationOffset + paginationLimit;
      paginatedItems = optimizedItems.slice(startIndex, endIndex);

      // Add pagination metadata
      paginationMetadata = {
        total_items: totalItemsBeforePagination,
        offset: paginationOffset,
        limit: paginationLimit,
        current_page_size: paginatedItems.length,
        has_more: endIndex < totalItemsBeforePagination,
        next_offset: endIndex < totalItemsBeforePagination ? endIndex : undefined,
      };
    }

    const totalItems = paginatedItems.length;
    const totalTime = Date.now() - startTime;

    logDebug(
      `Successfully fetched ${totalItemsBeforePagination} ${validatedModel}${paginationLimit ? ` (returning ${totalItems} paginated items)` : ''}`
    );

    // Create response object
    const response: any = {
      request_id: requestId,
      model: validatedModel,
      total_items: totalItems,
      data_source: {
        source: dataSource,
        fetch_time_ms: fetchTime,
        cache_status: dataSource === 'cache' ? 'hit' : 'miss',
      },
      performance_metrics: {
        total_time_ms: totalTime,
        api_fetch_time_ms: fetchTime,
        optimization_time_ms: totalTime - fetchTime,
        average_time_per_item_ms:
          totalItems > 0 ? Math.round((totalTime - fetchTime) / totalItems) : 0,
      },
      retrieved_at: new Date().toISOString(),
      results: paginatedItems,
    };

    // Add pagination metadata if pagination was used
    if (paginationMetadata) {
      response.pagination = paginationMetadata;
    }

    response.message = `Successfully listed ${totalItems} ${validatedModel} (source: ${dataSource}).`;

    // Add usage guidance
    if (paginationLimit !== undefined) {
      response.usage_guidance =
        'This list provides a paginated overview of available items. Use offset and limit parameters for pagination when dealing with large datasets that exceed token limits. Use retrieve() with specific model types and IDs to get detailed information for further operations like execute_query.';
    } else {
      response.usage_guidance =
        'This list provides an overview of available items. Use retrieve() with specific model types and IDs to get detailed information for further operations like execute_query. For large datasets exceeding token limits, use offset and limit parameters for pagination.';
    }

    // Add model-specific recommendation
    switch (validatedModel) {
      case 'cards':
        response.recommendation =
          'Use retrieve(model="card", ids=[...]) to get SQL queries and execute them with execute_query()';
        break;
      case 'dashboards':
        response.recommendation =
          'Use retrieve(model="dashboard", ids=[...]) to get dashboard details and card information';
        break;
      case 'tables':
        response.recommendation =
          'Use retrieve(model="table", ids=[...]) to get detailed schema information for query construction';
        break;
      case 'databases':
        response.recommendation =
          'Use retrieve(model="database", ids=[...]) to get connection details and available tables';
        break;
      case 'collections':
        response.recommendation =
          'Use retrieve(model="collection", ids=[...]) to get organizational structure and content management details';
        break;
    }

    logInfo(`Successfully listed ${totalItems} ${validatedModel}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleApiError(
      error,
      {
        operation: `List ${validatedModel}`,
        resourceType: validatedModel,
        customMessages: {
          '400': `Invalid list parameters. Ensure model type is valid.`,
          '404': `List endpoint not found for ${validatedModel}. Check that the model type is supported.`,
          '500': `Metabase server error while listing ${validatedModel}. The server may be experiencing issues.`,
        },
      },
      logError
    );
  }
}
