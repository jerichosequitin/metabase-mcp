import { z } from 'zod';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MetabaseApiClient, CachedResponse } from '../../api.js';
import { ErrorCode, McpError } from '../../types/core.js';
import {
  handleApiError,
  saveRawStructure,
  validatePositiveInteger,
  validateEnumValue,
} from '../../utils/index.js';
import { MAX_IDS_PER_REQUEST, CONCURRENCY_LIMITS, SAVE_RAW_STRUCTURES } from './types.js';
import {
  optimizeCardResponse,
  optimizeDashboardResponse,
  optimizeTableResponse,
  optimizeDatabaseResponse,
  optimizeCollectionResponse,
  optimizeFieldResponse,
} from './optimizers.js';

export async function handleRetrieve(
  request: z.infer<typeof CallToolRequestSchema>,
  requestId: string,
  apiClient: MetabaseApiClient,
  logDebug: (message: string, data?: unknown) => void,
  logInfo: (message: string, data?: unknown) => void,
  logWarn: (message: string, data?: unknown, error?: Error) => void,
  logError: (message: string, data?: unknown) => void
) {
  const { model, ids } = request.params?.arguments || {};

  // Validate required parameters
  if (!model) {
    logWarn('Missing model parameter in retrieve request', { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      'Model parameter is required. Must be one of: card, dashboard, table, database, collection, field'
    );
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    logWarn('Missing or invalid ids parameter in retrieve request', { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      'IDs parameter is required and must be a non-empty array of numbers'
    );
  }

  // Validate maximum number of IDs to prevent abuse and ensure reasonable response times
  if (ids.length > MAX_IDS_PER_REQUEST) {
    logWarn(`Too many IDs requested: ${ids.length}. Maximum allowed: ${MAX_IDS_PER_REQUEST}`, {
      requestId,
    });
    throw new McpError(
      ErrorCode.InvalidParams,
      `Too many IDs requested. Maximum allowed: ${MAX_IDS_PER_REQUEST} per request. For larger datasets, please make multiple requests.`
    );
  }

  // Validate model type with case insensitive handling
  const supportedModels = [
    'card',
    'dashboard',
    'table',
    'database',
    'collection',
    'field',
  ] as const;

  const validatedModel = validateEnumValue(model, supportedModels, 'model', requestId, logWarn);

  // Validate all IDs are positive integers
  const numericIds: number[] = [];
  for (const id of ids) {
    validatePositiveInteger(id, 'id', requestId, logWarn);
    numericIds.push(id as number);
  }

  logDebug(`Retrieving ${validatedModel} details for IDs: ${numericIds.join(', ')}`);

  try {
    const startTime = Date.now();
    const results: any[] = [];
    const errors: Array<{ id: number; error: string }> = [];
    let apiHits = 0;
    let cacheHits = 0;

    // Intelligent concurrency control based on request size and server protection
    // - Small requests (≤3): Full concurrency for minimal latency
    // - Medium requests (4-20): Moderate batching for balanced performance
    // - Large requests (21-50): Conservative batching to prevent server overload
    const CONCURRENT_LIMIT =
      numericIds.length <= CONCURRENCY_LIMITS.SMALL_REQUEST_THRESHOLD
        ? numericIds.length
        : numericIds.length <= CONCURRENCY_LIMITS.MEDIUM_REQUEST_THRESHOLD
          ? CONCURRENCY_LIMITS.MEDIUM_BATCH_SIZE
          : CONCURRENCY_LIMITS.LARGE_BATCH_SIZE;

    logDebug(
      `Processing ${numericIds.length} ${validatedModel}(s) with concurrency limit: ${CONCURRENT_LIMIT}`
    );

    // Process requests concurrently with controlled concurrency to balance performance and server load
    const processId = async (id: number) => {
      try {
        let response: CachedResponse<any>;

        switch (validatedModel) {
          case 'card':
            response = await apiClient.getCard(id);
            break;
          case 'dashboard':
            response = await apiClient.getDashboard(id);
            break;
          case 'table':
            response = await apiClient.getTable(id);
            break;
          case 'database':
            response = await apiClient.getDatabase(id);
            break;
          case 'collection':
            response = await apiClient.getCollection(id);
            break;
          case 'field':
            response = await apiClient.getField(id);
            break;
        }

        // Track cache vs API hits accurately
        if (response.source === 'cache') {
          cacheHits++;
        } else {
          apiHits++;
        }

        // Save raw structure for documentation if enabled
        saveRawStructure(validatedModel, response.data, SAVE_RAW_STRUCTURES);

        let result: any;

        // Optimize responses to reduce token usage
        if (validatedModel === 'card') {
          result = optimizeCardResponse({
            id,
            ...response.data,
          });
        } else if (validatedModel === 'dashboard') {
          result = optimizeDashboardResponse({
            id,
            ...response.data,
          });
        } else if (validatedModel === 'table') {
          result = optimizeTableResponse({
            id,
            ...response.data,
          });
        } else if (validatedModel === 'database') {
          result = optimizeDatabaseResponse({
            id,
            ...response.data,
          });
        } else if (validatedModel === 'collection') {
          result = optimizeCollectionResponse({
            id,
            ...response.data,
          });
        } else if (validatedModel === 'field') {
          result = optimizeFieldResponse({
            id,
            ...response.data,
          });
        } else {
          result = {
            id,
            ...response.data,
            retrieved_at: new Date().toISOString(),
          };
        }

        logDebug(`Successfully retrieved ${validatedModel} ${id} from ${response.source}`);
        return { success: true, id, result };
      } catch (error: any) {
        const errorMessage = error?.message || error?.data?.message || 'Unknown error';
        logWarn(`Failed to retrieve ${validatedModel} ${id}: ${errorMessage}`, { requestId });
        return { success: false, id, error: errorMessage };
      }
    };

    // Process IDs in batches to control concurrency
    const processBatch = async (batch: number[]) => {
      return Promise.allSettled(batch.map(processId));
    };

    // Split IDs into batches and process them
    const batches: number[][] = [];
    for (let i = 0; i < numericIds.length; i += CONCURRENT_LIMIT) {
      batches.push(numericIds.slice(i, i + CONCURRENT_LIMIT));
    }

    // Process all batches sequentially, but items within each batch concurrently
    for (const batch of batches) {
      const batchResults = await processBatch(batch);

      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          const { success, id, result: itemResult, error } = result.value;
          if (success) {
            results.push(itemResult);
          } else {
            errors.push({ id, error });
          }
        } else {
          // This shouldn't happen with our current implementation, but handle it gracefully
          logWarn(`Unexpected batch processing error: ${result.reason}`, { requestId });
        }
      });
    }

    const totalTime = Date.now() - startTime;
    const successCount = results.length;
    const errorCount = errors.length;

    // Create detailed data source information
    const dataSource = {
      cache_hits: cacheHits,
      api_calls: apiHits,
      total_successful: successCount,
      primary_source: cacheHits > apiHits ? 'cache' : apiHits > cacheHits ? 'api' : 'mixed',
    };

    // Calculate performance metrics
    const averageTimePerItem = Math.round(totalTime / numericIds.length);
    const concurrencyUsed = Math.min(CONCURRENT_LIMIT, numericIds.length);
    const estimatedSequentialTime = averageTimePerItem * numericIds.length;
    const timesSaved =
      numericIds.length > 1
        ? Math.round(((estimatedSequentialTime - totalTime) / estimatedSequentialTime) * 100)
        : 0;

    // Create response object
    const response: any = {
      model: validatedModel,
      request_id: requestId,
      total_requested: numericIds.length,
      successful_retrievals: successCount,
      failed_retrievals: errorCount,
      data_source: dataSource,
      performance_metrics: {
        total_time_ms: totalTime,
        average_time_per_item_ms: averageTimePerItem,
        concurrency_used: concurrencyUsed,
      },
      retrieved_at: new Date().toISOString(),
      results: results,
    };

    // Add errors if any occurred
    if (errors.length > 0) {
      response.errors = errors;
      response.message = `Retrieved ${successCount}/${numericIds.length} ${validatedModel}s successfully. ${errorCount} failed.`;
    } else {
      response.message = `Successfully retrieved all ${successCount} ${validatedModel}(s).`;
    }

    // Add performance info based on data source
    if (dataSource.primary_source === 'cache') {
      response.performance_note = `Data retrieved primarily from cache (${cacheHits} cache hits, ${apiHits} API calls)${timesSaved > 0 ? ` with ${timesSaved}% time savings from concurrent processing` : ''}`;
    } else if (dataSource.primary_source === 'api') {
      response.performance_note = `Data retrieved primarily via API calls (${apiHits} API calls, ${cacheHits} cache hits)${timesSaved > 0 ? ` with ${timesSaved}% time savings from concurrent processing` : ''} - now cached for future requests`;
    } else {
      response.performance_note = `Data retrieved from mixed sources (${cacheHits} cache hits, ${apiHits} API calls)${timesSaved > 0 ? ` with ${timesSaved}% time savings from concurrent processing` : ''}`;
    }

    // Add usage guidance based on model type
    switch (validatedModel) {
      case 'card':
        response.usage_guidance =
          'Use the database_id and dataset_query.native.query with execute_query to run queries. You can modify the SQL as needed. Response is optimized to include only essential fields for better performance.';
        break;
      case 'dashboard':
        response.usage_guidance =
          'Dashboard data includes optimized layout, cards, and parameters. Use retrieve or execute_query with card database_id and dataset_query.native.query from dashcards[].card to run queries. Response is optimized to exclude heavy metadata for better performance.';
        break;
      case 'table':
        response.usage_guidance =
          'Table metadata includes optimized column information, data types, and relationships. Use fields[] array to understand table schema and construct queries. Response excludes heavy fingerprint statistics for better performance.';
        break;
      case 'database':
        response.usage_guidance =
          'Database details include optimized connection info and available tables. Use tables[] array to see all tables, then retrieve with model="table" for detailed table metadata. Response excludes features array for better performance.';
        break;
      case 'collection':
        response.usage_guidance =
          'Collection details include organizational structure and metadata for managing questions, dashboards, models, and other Metabase content. Collections work like folders to organize your Metabase items. Response is lightly optimized to remove archive metadata.';
        break;
      case 'field':
        response.usage_guidance =
          'Field metadata includes data type, constraints, and relationships. Use this information when constructing queries or understanding table structure. Response is heavily optimized to exclude nested database features and detailed fingerprint data for better performance.';
        break;
    }

    const logMessage =
      errorCount > 0
        ? `Retrieved ${successCount}/${numericIds.length} ${validatedModel}s (${errorCount} errors, source: ${dataSource.primary_source})`
        : `Successfully retrieved ${successCount} ${validatedModel}s (source: ${dataSource.primary_source})`;

    logInfo(logMessage);

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
        operation: `Retrieve ${validatedModel} details`,
        resourceType: validatedModel,
        resourceId: numericIds.join(', '),
        customMessages: {
          '400': `Invalid ${validatedModel} parameters. Ensure all IDs are valid numbers.`,
          '404': `One or more ${validatedModel}s not found. Check that the IDs are correct and the ${validatedModel}s exist.`,
          '500': `Metabase server error while retrieving ${validatedModel}s. The server may be experiencing issues.`,
        },
      },
      logError
    );
  }
}
