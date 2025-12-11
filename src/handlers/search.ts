import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { MetabaseApiClient } from '../api.js';
import { ErrorCode, McpError } from '../types/core.js';
import { ValidationErrorFactory } from '../utils/errorFactory.js';
import { handleApiError, validatePositiveInteger, validateEnumValue } from '../utils/index.js';

export async function handleSearch(
  request: CallToolRequest,
  requestId: string,
  apiClient: MetabaseApiClient,
  logDebug: (message: string, data?: unknown) => void,
  logInfo: (message: string, data?: unknown) => void,
  logWarn: (message: string, data?: unknown, error?: Error) => void,
  logError: (message: string, error: unknown) => void
) {
  const searchQuery = request.params?.arguments?.query as string;
  const models = (request.params?.arguments?.models as string[]) || ['card', 'dashboard'];
  const maxResults = (request.params?.arguments?.max_results as number) ?? 20;
  const searchNativeQuery = (request.params?.arguments?.search_native_query as boolean) || false;
  const includeDashboardQuestions =
    (request.params?.arguments?.include_dashboard_questions as boolean) ?? false;
  const ids = request.params?.arguments?.ids as number[] | undefined;
  const archived = request.params?.arguments?.archived as boolean | undefined;
  const databaseId = request.params?.arguments?.database_id as number | undefined;
  const verified = request.params?.arguments?.verified as boolean | undefined;

  // Validate positive integer parameters
  if (maxResults !== undefined) {
    validatePositiveInteger(maxResults, 'max_results', requestId, logWarn);
    if (maxResults > 50) {
      logWarn('max_results exceeds maximum allowed value', { requestId, maxResults });
      throw new McpError(ErrorCode.InvalidParams, 'max_results must be at most 50');
    }
  }
  if (databaseId !== undefined) {
    validatePositiveInteger(databaseId, 'database_id', requestId, logWarn);
  }
  if (ids !== undefined && ids.length > 0) {
    ids.forEach((id, index) => {
      validatePositiveInteger(id, `ids[${index}]`, requestId, logWarn);
    });
  }

  // Validate models parameter with case insensitive handling
  if (models && models.length > 0) {
    const supportedModels = ['card', 'dashboard', 'table', 'database', 'collection'] as const;
    models.forEach((model, index) => {
      validateEnumValue(model, supportedModels, `models[${index}]`, requestId, logWarn);
    });
  }

  // Updated validation: allow searching without query/id if database_id is provided
  if (!searchQuery && (!ids || ids.length === 0) && !databaseId) {
    logWarn('Missing query, ids, or database_id parameter in search request', { requestId });
    throw ValidationErrorFactory.invalidParameter(
      'query_or_ids_or_database_id',
      'none provided',
      'Either search query, ids parameter, or database_id is required'
    );
  }

  // Validate that only one search method is used
  if (searchQuery && ids && ids.length > 0) {
    logWarn('Cannot use both query and ids parameters simultaneously', { requestId });
    throw ValidationErrorFactory.invalidParameter(
      'query_and_ids',
      'both provided',
      'Cannot use both query and ids parameters - use either search query OR ids, not both'
    );
  }

  // Validate ids usage - only allowed with single model
  if (ids && ids.length > 0 && models.length > 1) {
    logWarn('ids parameter can only be used with a single model type', { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      'ids parameter can only be used when searching a single model type'
    );
  }

  // Validate ids usage - not allowed with 'table' model
  if (ids && ids.length > 0 && models.includes('table')) {
    logWarn('ids parameter cannot be used with table model', { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      'ids parameter cannot be used when searching for tables - use query or database_id instead'
    );
  }

  // Validate database searches - only allow query parameter when searching solely for databases
  if (models.length === 1 && models[0] === 'database') {
    if (ids && ids.length > 0) {
      logWarn('ids parameter cannot be used when searching solely for databases', { requestId });
      throw new McpError(
        ErrorCode.InvalidParams,
        'ids parameter cannot be used when searching for databases - use query instead'
      );
    }
    if (databaseId) {
      logWarn('database_id parameter cannot be used when searching solely for databases', {
        requestId,
      });
      throw new McpError(
        ErrorCode.InvalidParams,
        'database_id parameter cannot be used when searching for databases - use query instead'
      );
    }
  }

  // Validate database model exclusivity - database searches must be exclusive
  if (models.includes('database') && models.length > 1) {
    logWarn('database model cannot be mixed with other models', { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      'database model cannot be combined with other model types - search for databases separately'
    );
  }

  // Validate model types
  const validModels = [
    'card',
    'dashboard',
    'table',
    'dataset',
    'segment',
    'collection',
    'database',
    'action',
    'indexed-entity',
    'metric',
  ];
  const invalidModels = models.filter(model => !validModels.includes(model));
  if (invalidModels.length > 0) {
    logWarn(`Invalid model types specified: ${invalidModels.join(', ')}`, { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid model types: ${invalidModels.join(', ')}. Valid types are: ${validModels.join(', ')}`
    );
  }

  // Validate database_id if provided
  if (databaseId && (typeof databaseId !== 'number' || databaseId <= 0)) {
    logWarn('Invalid database_id parameter', { requestId });
    throw new McpError(ErrorCode.InvalidParams, 'database_id must be a positive integer');
  }

  // Validate search_native_query - only allowed when searching cards exclusively
  if (searchNativeQuery && (models.length !== 1 || models[0] !== 'card')) {
    logWarn('search_native_query parameter can only be used when searching cards exclusively', {
      requestId,
    });
    throw new McpError(
      ErrorCode.InvalidParams,
      'search_native_query parameter can only be used when models=["card"] - it searches within SQL query content of cards'
    );
  }

  // Validate include_dashboard_questions - only allowed when dashboard is in models
  if (includeDashboardQuestions && !models.includes('dashboard')) {
    logWarn(
      'include_dashboard_questions parameter can only be used when dashboard model is included',
      { requestId }
    );
    throw new McpError(
      ErrorCode.InvalidParams,
      'include_dashboard_questions parameter can only be used when "dashboard" is included in the models array'
    );
  }

  logDebug(`Search with query: "${searchQuery}", models: ${models.join(', ')}`);

  const searchStartTime = Date.now();

  try {
    // Build search parameters
    const searchParams = new URLSearchParams();

    if (searchQuery) {
      searchParams.append('q', searchQuery);
    }

    // Add models
    models.forEach(model => searchParams.append('models', model));

    // Add optional parameters
    if (searchNativeQuery) {
      searchParams.append('search_native_query', 'true');
    }

    if (includeDashboardQuestions) {
      searchParams.append('include_dashboard_questions', 'true');
    }

    if (ids && ids.length > 0) {
      ids.forEach(id => searchParams.append('ids', id.toString()));
    }

    if (archived === true) {
      searchParams.append('archived', 'true');
    }

    if (databaseId) {
      searchParams.append('table_db_id', databaseId.toString());
    }

    if (verified === true) {
      searchParams.append('verified', 'true');
    }

    const response = await apiClient.request<any>(`/api/search?${searchParams.toString()}`);
    const searchTime = Date.now() - searchStartTime;

    // Extract results and limit
    let results = response.data || response || [];
    if (Array.isArray(results)) {
      results = results.slice(0, maxResults);
    } else {
      results = [];
    }

    // Enhance results with model-specific metadata (without individual recommendations)
    const enhancedResults = results.map((item: any) => {
      // Base item without created_at and updated_at
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        model: item.model,
        collection_name: item.collection_name,
        database_id: item.database_id || null,
        table_id: item.table_id || null,
        archived: item.archived || false,
      };
    });

    // Group results by model type for better organization
    const resultsByModel = enhancedResults.reduce((acc: any, item: any) => {
      if (!acc[item.model]) {
        acc[item.model] = [];
      }
      acc[item.model].push(item);
      return acc;
    }, {});

    const totalResults = enhancedResults.length;
    const searchMethod =
      ids && ids.length > 0
        ? 'id_search'
        : databaseId && !searchQuery
          ? 'database_search'
          : 'query_search';

    logInfo(
      `Search found ${totalResults} items across ${Object.keys(resultsByModel).length} model types in ${searchTime}ms`
    );

    // Build standardized parameters object for response
    const usedParameters: any = {
      query: searchQuery || null,
      models: models,
      max_results: maxResults,
    };

    // Add optional parameters that were actually used
    if (searchNativeQuery) {
      usedParameters.search_native_query = searchNativeQuery;
    }
    if (includeDashboardQuestions) {
      usedParameters.include_dashboard_questions = includeDashboardQuestions;
    }
    if (ids && ids.length > 0) {
      usedParameters.ids = ids;
    }
    if (archived === true) {
      usedParameters.archived = archived;
    }
    if (databaseId) {
      usedParameters.database_id = databaseId;
    }
    if (verified === true) {
      usedParameters.verified = verified;
    }

    // Generate recommended actions based on found models
    const foundModels = Object.keys(resultsByModel);
    const recommendedActions: { [key: string]: string } = {};

    foundModels.forEach(model => {
      switch (model) {
        case 'card':
          recommendedActions[model] =
            'Use retrieve(model="card", ids=[card_id]) to get the SQL query, then execute_query() with the database_id for reliable execution';
          break;
        case 'dashboard':
          recommendedActions[model] =
            'Use retrieve(model="dashboard", ids=[dashboard_id]) to get all cards in this dashboard and their details';
          break;
        case 'table':
          recommendedActions[model] =
            'Use retrieve(model="table", ids=[table_id]) to get detailed metadata including column information and relationships';
          break;
        case 'database':
          recommendedActions[model] =
            'Use retrieve(model="database", ids=[database_id]) to get database details including available tables';
          break;
        case 'dataset':
          recommendedActions[model] =
            'Use retrieve(model="card", ids=[dataset_id]) to get the dataset definition, then execute_query() to run it';
          break;
        case 'collection':
          recommendedActions[model] =
            'Use retrieve(model="collection", ids=[collection_id]) to get collection details and organizational structure for managing Metabase content like questions and dashboards';
          break;
        case 'field':
          recommendedActions[model] =
            'Use retrieve(model="field", ids=[field_id]) to get detailed field metadata including data types and constraints';
          break;
        case 'segment':
          recommendedActions[model] =
            'Use retrieve(model="card", ids=[segment_id]) to get the segment definition and apply it in your queries';
          break;
        case 'metric':
          recommendedActions[model] =
            'Use retrieve(model="card", ids=[metric_id]) to get the metric definition and incorporate it into your analysis';
          break;
        default:
          recommendedActions[model] =
            'Use the appropriate retrieve() command with the model type and ID to get detailed information';
      }
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              search_metrics: {
                method: searchMethod,
                total_results: totalResults,
                search_time_ms: searchTime,
                parameters_used: usedParameters,
              },
              recommended_actions: recommendedActions,
              results_by_model: Object.keys(resultsByModel).map(model => ({
                model,
                count: resultsByModel[model].length,
              })),
              results: enhancedResults,
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
        operation: 'Search',
        resourceType: databaseId ? 'database' : undefined,
        resourceId: databaseId,
        customMessages: {
          '400':
            'Invalid search parameters. Check model types, database_id, or premium feature requirements (verified parameter).',
          '403': 'Access denied. You may not have permission to search these items.',
          '404': 'Search endpoint not found. This Metabase version may not support the search API.',
        },
      },
      logError
    );
  }
}
