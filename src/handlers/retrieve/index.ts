import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { MetabaseApiClient, CachedResponse } from '../../api.js';
import { ErrorCode, McpError, isMcpError } from '../../types/core.js';
import {
  ResourceNotFoundErrorFactory,
  AuthorizationErrorFactory,
  ValidationErrorFactory,
} from '../../utils/errorFactory.js';
import {
  handleApiError,
  saveRawStructure,
  validatePositiveInteger,
  validateEnumValue,
  parseAndValidatePositiveInteger,
  parseAndValidateNonNegativeInteger,
} from '../../utils/index.js';
import {
  MAX_IDS_PER_REQUEST,
  MAX_DATABASE_IDS_PER_REQUEST,
  CONCURRENCY_LIMITS,
  SAVE_RAW_STRUCTURES,
  OPTIMIZATION_THRESHOLDS,
} from './types.js';
import {
  optimizeCardResponse,
  optimizeDashboardResponse,
  optimizeTableResponse,
  OptimizationLevel,
  optimizeDatabaseResponse,
  optimizeCollectionResponse,
  optimizeFieldResponse,
} from './optimizers.js';

export async function handleRetrieve(
  request: CallToolRequest,
  requestId: string,
  apiClient: MetabaseApiClient,
  logDebug: (message: string, data?: unknown) => void,
  logInfo: (message: string, data?: unknown) => void,
  logWarn: (message: string, data?: unknown, error?: Error) => void,
  logError: (message: string, data?: unknown) => void
) {
  const { model, ids, table_offset, table_limit } = request.params?.arguments || {};

  // Validate required parameters
  if (!model) {
    logWarn('Missing model parameter in retrieve request', { requestId });
    throw ValidationErrorFactory.invalidParameter(
      'model',
      model,
      'Must be one of: card, dashboard, table, database, collection, field'
    );
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    logWarn('Missing or invalid ids parameter in retrieve request', { requestId });
    throw ValidationErrorFactory.invalidParameter(
      'ids',
      ids,
      'Must be a non-empty array of numbers'
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

  // Validate maximum number of IDs based on model type
  const maxIds = validatedModel === 'database' ? MAX_DATABASE_IDS_PER_REQUEST : MAX_IDS_PER_REQUEST;
  if (ids.length > maxIds) {
    logWarn(
      `Too many IDs requested: ${ids.length}. Maximum allowed for ${validatedModel}: ${maxIds}`,
      {
        requestId,
      }
    );
    throw ValidationErrorFactory.invalidParameter(
      'ids',
      `${ids.length} items`,
      validatedModel === 'database'
        ? `Maximum allowed: ${maxIds} databases per request due to large metadata. For more databases, please make multiple requests.`
        : `Maximum allowed: ${maxIds} per request. For larger datasets, please make multiple requests.`
    );
  }

  // Validate all IDs are positive integers
  const numericIds: number[] = [];
  for (const id of ids) {
    validatePositiveInteger(id, 'id', requestId, logWarn);
    numericIds.push(id as number);
  }

  // Validate pagination parameters for database model
  let paginationOffset = 0;
  let paginationLimit: number | undefined = undefined;

  if (validatedModel === 'database') {
    if (table_offset !== undefined) {
      paginationOffset = parseAndValidateNonNegativeInteger(
        table_offset,
        'table_offset',
        requestId,
        logWarn
      );
    }

    if (table_limit !== undefined) {
      paginationLimit = parseAndValidatePositiveInteger(
        table_limit,
        'table_limit',
        requestId,
        logWarn
      );

      if (paginationLimit > 100) {
        logWarn('table_limit too large, maximum is 100', {
          requestId,
          table_limit: paginationLimit,
        });
        throw ValidationErrorFactory.invalidParameter(
          'table_limit',
          `${paginationLimit}`,
          'Maximum allowed: 100 tables per page'
        );
      }
    }
  } else if (table_offset !== undefined || table_limit !== undefined) {
    logWarn('table_offset and table_limit are only valid for database model', { requestId });
    throw ValidationErrorFactory.invalidParameter(
      'table_offset/table_limit',
      'provided for non-database model',
      'table_offset and table_limit parameters are only supported for the database model'
    );
  }

  logDebug(`Retrieving ${validatedModel} details for IDs: ${numericIds.join(', ')}`);

  try {
    const startTime = Date.now();
    const results: any[] = [];
    const errors: Array<{
      id: number;
      error: string;
      category?: string;
      retryable?: boolean;
      httpStatus?: number;
    }> = [];
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

    // Determine optimization level based on request size to manage token usage
    const optimizationLevel =
      numericIds.length >= OPTIMIZATION_THRESHOLDS.ULTRA_MINIMAL_THRESHOLD
        ? OptimizationLevel.ULTRA_MINIMAL
        : numericIds.length >= OPTIMIZATION_THRESHOLDS.AGGRESSIVE_OPTIMIZATION_THRESHOLD
          ? OptimizationLevel.AGGRESSIVE
          : OptimizationLevel.STANDARD;

    logDebug(
      `Processing ${numericIds.length} ${validatedModel}(s) with concurrency limit: ${CONCURRENT_LIMIT}, optimization level: ${optimizationLevel}`
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
          case 'collection': {
            // For collections, get both metadata and items like resources do
            const [collectionResponse, itemsResponse] = await Promise.all([
              apiClient.getCollection(id),
              apiClient.getCollectionItems(id),
            ]);

            // Combine the collection metadata with its items
            const collectionWithItems = {
              ...collectionResponse.data,
              items: itemsResponse.data || [],
            };

            response = {
              data: collectionWithItems,
              source: collectionResponse.source, // Use the source from the main collection call
              fetchTime: collectionResponse.fetchTime + itemsResponse.fetchTime,
            };
            break;
          }
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
          result = optimizeCardResponse(
            {
              id,
              ...response.data,
            },
            optimizationLevel
          );
        } else if (validatedModel === 'dashboard') {
          result = optimizeDashboardResponse(
            {
              id,
              ...response.data,
            },
            optimizationLevel
          );
        } else if (validatedModel === 'table') {
          result = optimizeTableResponse(
            {
              id,
              ...response.data,
            },
            optimizationLevel
          );
        } else if (validatedModel === 'database') {
          result = optimizeDatabaseResponse(
            {
              id,
              ...response.data,
            },
            optimizationLevel,
            paginationOffset,
            paginationLimit
          );
        } else if (validatedModel === 'collection') {
          result = optimizeCollectionResponse(
            {
              id,
              ...response.data,
            },
            optimizationLevel
          );
        } else if (validatedModel === 'field') {
          result = optimizeFieldResponse(
            {
              id,
              ...response.data,
            },
            optimizationLevel
          );
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

        // Check if this is an enhanced error with specific categories
        if (isMcpError(error)) {
          return {
            success: false,
            id,
            error: errorMessage,
            category: error.details.category,
            retryable: error.details.retryable,
            httpStatus: error.details.httpStatus,
          };
        }

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
          const {
            success,
            id,
            result: itemResult,
            error,
            category,
            retryable,
            httpStatus,
          } = result.value;
          if (success) {
            results.push(itemResult);
          } else {
            errors.push({
              id,
              error,
              category: category || 'unknown',
              retryable: retryable !== undefined ? retryable : true,
              httpStatus,
            });
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

    // Handle scenarios where all or most requests failed
    if (successCount === 0 && errorCount > 0) {
      // All requests failed - analyze the error types to provide appropriate guidance
      const notFoundErrors = errors.filter(e => e.category === 'resource_not_found');
      const authErrors = errors.filter(e => e.category === 'authorization');
      const otherErrors = errors.filter(
        e => e.category !== 'resource_not_found' && e.category !== 'authorization'
      );

      if (notFoundErrors.length === errorCount) {
        // All errors were "not found" - this is likely a bad request
        const idsText =
          numericIds.length === 1 ? `ID ${numericIds[0]}` : `IDs ${numericIds.join(', ')}`;
        throw ResourceNotFoundErrorFactory.resource(validatedModel, idsText);
      } else if (authErrors.length === errorCount) {
        // All errors were authorization - permission issue
        throw AuthorizationErrorFactory.insufficientPermissions(validatedModel, 'retrieve');
      } else if (otherErrors.length > 0) {
        // Mixed errors or other issues - throw the first other error as it's likely more specific
        const firstOtherError = otherErrors[0] || errors[0];
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to retrieve ${validatedModel}(s): ${firstOtherError.error}`
        );
      }
    }

    // If only some requests failed but most succeeded, continue with partial success response
    // But if failure rate is high (>50%), log a warning
    if (errorCount > 0 && errorCount / numericIds.length > 0.5) {
      logWarn(
        `High failure rate in retrieve operation: ${errorCount}/${numericIds.length} ${validatedModel}(s) failed`,
        { requestId, errors: errors.map(e => ({ id: e.id, error: e.error, category: e.category })) }
      );
    }

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
        if (paginationLimit !== undefined) {
          response.usage_guidance =
            'Database details include paginated table information. Use table_offset and table_limit parameters for pagination when dealing with large databases that exceed token limits. Use tables[] array to see available tables, then retrieve with model="table" for detailed table metadata.';
        } else {
          response.usage_guidance =
            'Database details include optimized connection info and available tables. Use tables[] array to see all tables, then retrieve with model="table" for detailed table metadata. For large databases exceeding token limits, use table_offset and table_limit parameters for pagination.';
        }
        break;
      case 'collection':
        response.usage_guidance =
          'Collection details include organizational structure, metadata, and items within the collection. Items are organized by type (cards, dashboards, collections, other) for easy navigation. Collections work like folders to organize your Metabase items. Use the items array to see what content is available in this collection.';
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

    // Monitor response size for token usage optimization feedback
    const responseText = JSON.stringify(response, null, 2);
    const responseSizeChars = responseText.length;
    const estimatedTokens = Math.ceil(responseSizeChars / 4); // Rough estimation: ~4 chars per token

    // Log warnings for large responses
    if (estimatedTokens > 20000) {
      logWarn(
        `Large response detected: ~${estimatedTokens} tokens (${responseSizeChars} chars) for ${numericIds.length} ${validatedModel}(s). Consider using smaller batch sizes for better performance.`,
        {
          requestId,
          responseSize: responseSizeChars,
          estimatedTokens,
          optimizationLevel,
          itemCount: numericIds.length,
        }
      );
    } else if (estimatedTokens > 15000) {
      logDebug(
        `Moderate response size: ~${estimatedTokens} tokens (${responseSizeChars} chars) for ${numericIds.length} ${validatedModel}(s)`,
        {
          requestId,
          responseSize: responseSizeChars,
          estimatedTokens,
          optimizationLevel,
        }
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
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
