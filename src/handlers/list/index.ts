import { z } from 'zod';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MetabaseApiClient } from '../../api.js';
import { ErrorCode, McpError } from '../../types/core.js';
import { handleApiError } from '../../utils.js';
import { SupportedListModel } from './types.js';
import {
  optimizeCardForList,
  optimizeDashboardForList,
  optimizeTableForList,
  optimizeDatabaseForList,
  optimizeCollectionForList,
} from './optimizers.js';

export async function handleList(
  request: z.infer<typeof CallToolRequestSchema>,
  requestId: string,
  apiClient: MetabaseApiClient,
  logDebug: (message: string, data?: unknown) => void,
  logInfo: (message: string, data?: unknown) => void,
  logWarn: (message: string, data?: unknown, error?: Error) => void,
  logError: (message: string, data?: unknown) => void
) {
  const { model } = request.params?.arguments || {};

  // Validate required parameters
  if (!model || typeof model !== 'string') {
    logWarn('Missing or invalid model parameter in list request', { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      'Model parameter is required and must be a string. Supported models: cards, dashboards, tables, databases, collections'
    );
  }

  // Validate model type
  const supportedModels: SupportedListModel[] = [
    'cards',
    'dashboards',
    'tables',
    'databases',
    'collections',
  ];
  if (!supportedModels.includes(model as SupportedListModel)) {
    logWarn(`Invalid model type: ${model}`, { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid model type: ${model}. Supported models: ${supportedModels.join(', ')}`
    );
  }

  logDebug(`Listing ${model} from Metabase`);

  try {
    const startTime = Date.now();
    let optimizeFunction: (item: any) => any;
    let apiResponse: any;
    let dataSource: 'cache' | 'api';
    let fetchTime: number;

    switch (model as SupportedListModel) {
      case 'cards':
        optimizeFunction = optimizeCardForList;
        const cardsResponse = await apiClient.getCardsList();
        apiResponse = cardsResponse.data;
        dataSource = cardsResponse.source;
        fetchTime = cardsResponse.fetchTime;
        break;
      case 'dashboards':
        optimizeFunction = optimizeDashboardForList;
        const dashboardsResponse = await apiClient.getDashboardsList();
        apiResponse = dashboardsResponse.data;
        dataSource = dashboardsResponse.source;
        fetchTime = dashboardsResponse.fetchTime;
        break;
      case 'tables':
        optimizeFunction = optimizeTableForList;
        const tablesResponse = await apiClient.getTablesList();
        apiResponse = tablesResponse.data;
        dataSource = tablesResponse.source;
        fetchTime = tablesResponse.fetchTime;
        break;
      case 'databases':
        optimizeFunction = optimizeDatabaseForList;
        const databasesResponse = await apiClient.getDatabasesList();
        apiResponse = databasesResponse.data;
        dataSource = databasesResponse.source;
        fetchTime = databasesResponse.fetchTime;
        break;
      case 'collections':
        optimizeFunction = optimizeCollectionForList;
        const collectionsResponse = await apiClient.getCollectionsList();
        apiResponse = collectionsResponse.data;
        dataSource = collectionsResponse.source;
        fetchTime = collectionsResponse.fetchTime;
        break;
      default:
        throw new Error(`Unsupported model: ${model}`);
    }

    logDebug(
      `Fetching ${model} from ${dataSource} (${dataSource === 'api' ? 'fresh data' : 'cached data'})`
    );

    // Optimize each item for list view
    const optimizedItems = apiResponse.map(optimizeFunction);
    const totalItems = optimizedItems.length;
    const totalTime = Date.now() - startTime;

    logDebug(`Successfully fetched ${optimizedItems.length} ${model}`);

    // Create response object
    const response: any = {
      request_id: requestId,
      model: model,
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
      results: optimizedItems,
    };

    response.message = `Successfully listed ${totalItems} ${model} (source: ${dataSource}).`;

    // Add usage guidance
    response.usage_guidance =
      'This list provides an overview of available items. Use retrieve() with specific model types and IDs to get detailed information for further operations like execute_query.';

    // Add model-specific recommendation
    switch (model as SupportedListModel) {
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

    logInfo(`Successfully listed ${totalItems} ${model}`);

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
        operation: `List ${model}`,
        resourceType: model,
        customMessages: {
          '400': `Invalid list parameters. Ensure model type is valid.`,
          '404': `List endpoint not found for ${model}. Check that the model type is supported.`,
          '500': `Metabase server error while listing ${model}. The server may be experiencing issues.`,
        },
      },
      logError
    );
  }
}
