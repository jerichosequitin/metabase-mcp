import { generateRequestId, formatJson } from '../../utils/index.js';
import { ErrorCode, McpError, isMcpError } from '../../types/core.js';
import { MetabaseApiClient } from '../../api.js';
import {
  optimizeDashboardResource,
  optimizeCardResource,
  optimizeDatabaseResource,
  optimizeTableResource,
  optimizeMetricResource,
  OptimizationLevel,
} from './optimizers.js';
import {
  ListResourcesRequest,
  ReadResourceRequest,
  ListResourceTemplatesRequest,
  ResourceTemplate,
  Resource,
  ResourceContent,
  LogFunction,
} from './types.js';

/**
 * Handle listing all available resources using hierarchical approach for better scalability
 */
export async function handleListResources(
  _request: ListResourcesRequest,
  apiClient: MetabaseApiClient,
  logInfo: LogFunction,
  logError: LogFunction
) {
  const requestId = generateRequestId();
  logInfo('Processing request to list hierarchical Metabase resources', { requestId });
  await apiClient.getSessionToken();

  try {
    const resources: Resource[] = [];
    let totalResourceCount = 0;
    let currentUserId: number | null = null;

    // Get current user information for personal collection filtering
    try {
      const userResponse = await apiClient.getCurrentUser();
      currentUserId = userResponse.data?.id || null;
      logInfo(`Current user ID: ${currentUserId}`, { requestId });
    } catch (error) {
      logError('Failed to fetch current user info, will exclude all personal collections', error);
    }

    // Fetch core data: collections and databases
    const [collectionsResponse, databasesResponse] = await Promise.all([
      apiClient.getCollectionsList().catch(error => {
        logError('Failed to fetch collections', error);
        return { data: [], source: 'error' };
      }),
      apiClient.getDatabasesList().catch(error => {
        logError('Failed to fetch databases', error);
        return { data: [], source: 'error' };
      }),
    ]);

    // Add ROOT collections only (location: "/") and user's own personal collection
    if (collectionsResponse.data.length > 0) {
      const rootCollectionResources = collectionsResponse.data
        .filter((collection: any) => {
          // Include non-personal collections (regular collections)
          if (!collection.personal_owner_id) {
            return collection.location === '/'; // Only root collections for non-personal
          }
          // Include user's own personal collection if we have their user ID
          if (currentUserId && collection.personal_owner_id === currentUserId) {
            return true;
          }
          // Exclude other users' personal collections
          return false;
        })
        .map((collection: any) => ({
          uri: `metabase://collection/${collection.id}`,
          mimeType: 'application/json',
          name: `[Collection] ${collection.name}`,
          description: `Collection: ${collection.name}${collection.description ? ` - ${collection.description}` : ''}`,
          isPersonal: !!collection.personal_owner_id,
        }));

      resources.push(...rootCollectionResources);
      totalResourceCount += rootCollectionResources.length;
      logInfo(
        `Added ${rootCollectionResources.length} collections (${collectionsResponse.data.length} total, filtered to root collections and user's personal collection)`
      );
    }

    // Add ALL databases (important for navigation)
    if (databasesResponse.data.length > 0) {
      const databaseResources = databasesResponse.data
        .filter((database: any) => !database.is_sample) // Exclude sample databases
        .map((database: any) => ({
          uri: `metabase://database/${database.id}`,
          mimeType: 'application/json',
          name: `[Database] ${database.name}`,
          description: `Database: ${database.name} (${database.engine})${database.description ? ` - ${database.description}` : ''}`,
        }));

      resources.push(...databaseResources);
      totalResourceCount += databaseResources.length;
      logInfo(
        `Added ${databaseResources.length} databases (${databasesResponse.data.length} total, source: ${databasesResponse.source})`
      );
    }

    // Sort resources by type priority for better organization
    const sortedResources = resources.sort((a, b) => {
      const typeOrder = {
        '[Collection]': 0, // Collections first
        '[Database]': 1, // Databases second
      };

      const getType = (name: string) => {
        for (const key of Object.keys(typeOrder)) {
          if (name.startsWith(key)) {
            return typeOrder[key as keyof typeof typeOrder];
          }
        }
        return 999; // Unknown type goes to the end
      };

      const aType = getType(a.name);
      const bType = getType(b.name);

      if (aType !== bType) {
        return aType - bType;
      }

      // Within collections, prioritize personal collections first
      if (aType === 0 && bType === 0) {
        // Both are collections
        const aIsPersonal = (a as any).isPersonal || false;
        const bIsPersonal = (b as any).isPersonal || false;

        if (aIsPersonal && !bIsPersonal) {
          return -1; // Personal collection comes first
        }
        if (!aIsPersonal && bIsPersonal) {
          return 1; // Personal collection comes first
        }
      }

      // Within same type, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });

    // Clean up sorting helper properties before returning
    const finalResources = sortedResources.map(resource => {
      const resourceCopy = { ...resource };
      delete (resourceCopy as any).isPersonal;
      return resourceCopy;
    });

    logInfo(
      `Successfully retrieved ${finalResources.length} view-based resources (from ${totalResourceCount} total items)`
    );

    return { resources: finalResources };
  } catch (error) {
    logError('Failed to retrieve Metabase resources', error);
    throw new McpError(ErrorCode.InternalError, 'Failed to retrieve Metabase resources');
  }
}

/**
 * Handle listing resource templates
 */
export async function handleListResourceTemplates(
  _request: ListResourceTemplatesRequest,
  logInfo: LogFunction
) {
  logInfo('Processing request to list resource templates');

  const resourceTemplates: ResourceTemplate[] = [
    {
      uriTemplate: 'metabase://dashboard/{id}',
      name: 'Dashboard by ID',
      mimeType: 'application/json',
      description: 'Get a Metabase dashboard by its ID',
    },
    {
      uriTemplate: 'metabase://card/{id}',
      name: 'Card by ID',
      mimeType: 'application/json',
      description: 'Get a Metabase question/card by its ID',
    },
    {
      uriTemplate: 'metabase://database/{id}',
      name: 'Database by ID',
      mimeType: 'application/json',
      description: 'Get a Metabase database with its tables and metadata',
    },
    {
      uriTemplate: 'metabase://table/{id}',
      name: 'Table by ID',
      mimeType: 'application/json',
      description: 'Get table schema, fields, and metadata by table ID',
    },
    {
      uriTemplate: 'metabase://field/{id}',
      name: 'Field by ID',
      mimeType: 'application/json',
      description: 'Get detailed field information including type, constraints, and relationships',
    },
    {
      uriTemplate: 'metabase://collection/{id}',
      name: 'Collection by ID',
      mimeType: 'application/json',
      description: 'Get collection details with all items (cards, dashboards, sub-collections)',
    },
    {
      uriTemplate: 'metabase://metric/{id}',
      name: 'Metric by ID',
      mimeType: 'application/json',
      description: 'Get metric definition and calculation details by its ID',
    },
    {
      uriTemplate: 'metabase://recent/{model}',
      name: 'Recent Items',
      mimeType: 'application/json',
      description: 'Get recently viewed items by model type (card, dashboard, table)',
    },
  ];

  return { resourceTemplates };
}

/**
 * Handle reading a specific resource
 */
export async function handleReadResource(
  request: ReadResourceRequest,
  apiClient: MetabaseApiClient,
  logInfo: LogFunction,
  logWarn: LogFunction,
  logDebug: LogFunction,
  logError: LogFunction
) {
  const requestId = generateRequestId();
  logInfo('Processing request to read resource', {
    requestId,
    uri: request.params?.uri,
  });

  await apiClient.getSessionToken();

  const uri = request.params?.uri;
  if (!uri) {
    logWarn('Missing URI parameter in resource request', { requestId });
    throw new McpError(ErrorCode.InvalidParams, 'URI parameter is required');
  }

  let match;

  try {
    // Handle dashboard resource
    if ((match = uri.match(/^metabase:\/\/dashboard\/(\d+)$/))) {
      return await handleDashboardResource(match[1], uri, apiClient, logDebug, logInfo);
    }

    // Handle card/question resource
    if ((match = uri.match(/^metabase:\/\/card\/(\d+)$/))) {
      return await handleCardResource(match[1], uri, apiClient, logDebug, logInfo);
    }

    // Handle database resource (includes tables)
    if ((match = uri.match(/^metabase:\/\/database\/(\d+)$/))) {
      return await handleDatabaseResource(match[1], uri, apiClient, logDebug, logInfo);
    }

    // Handle table resource (includes fields)
    if ((match = uri.match(/^metabase:\/\/table\/(\d+)$/))) {
      return await handleTableResource(match[1], uri, apiClient, logDebug, logInfo);
    }

    // Handle field resource
    if ((match = uri.match(/^metabase:\/\/field\/(\d+)$/))) {
      return await handleFieldResource(match[1], uri, apiClient, logDebug, logInfo);
    }

    // Handle collection resource (includes items)
    if ((match = uri.match(/^metabase:\/\/collection\/(\d+)$/))) {
      return await handleCollectionResource(match[1], uri, apiClient, logDebug, logInfo);
    }

    // Handle recent items resource
    if ((match = uri.match(/^metabase:\/\/recent\/(.+)$/))) {
      return await handleRecentItemsResource(match[1], uri, apiClient, logDebug, logInfo);
    }

    // Handle metric resource
    if ((match = uri.match(/^metabase:\/\/metric\/(\d+)$/))) {
      return await handleMetricResource(match[1], uri, apiClient, logDebug, logInfo);
    }

    logWarn(`Invalid URI format: ${uri}`, { requestId });
    throw new McpError(ErrorCode.InvalidRequest, `Invalid URI format: ${uri}`);
  } catch (error) {
    if (isMcpError(error)) {
      throw error;
    }

    const apiError = error as any;
    const errorMessage = apiError.data?.message || apiError.message || 'Unknown error';
    logError(`Failed to fetch Metabase resource: ${errorMessage}`, error);

    throw new McpError(ErrorCode.InternalError, `Metabase API error: ${errorMessage}`);
  }
}

/**
 * Handle dashboard resource
 */
async function handleDashboardResource(
  id: string,
  uri: string,
  apiClient: MetabaseApiClient,
  logDebug: LogFunction,
  logInfo: LogFunction
) {
  const dashboardId = parseInt(id, 10);
  logDebug(`Fetching dashboard with ID: ${dashboardId}`);

  const response = await apiClient.getDashboard(dashboardId);
  logInfo(
    `Successfully retrieved dashboard: ${response.data.name || dashboardId} (source: ${response.source})`
  );

  // Optimize the dashboard response to reduce token usage
  const optimizedDashboard = optimizeDashboardResource(response.data, OptimizationLevel.STANDARD);

  const contents: ResourceContent[] = [
    {
      uri,
      mimeType: 'application/json',
      text: formatJson(optimizedDashboard),
    },
  ];

  return { contents };
}

/**
 * Handle card/question resource
 */
async function handleCardResource(
  id: string,
  uri: string,
  apiClient: MetabaseApiClient,
  logDebug: LogFunction,
  logInfo: LogFunction
) {
  const cardId = parseInt(id, 10);
  logDebug(`Fetching card/question with ID: ${cardId}`);

  const response = await apiClient.getCard(cardId);
  logInfo(
    `Successfully retrieved card: ${response.data.name || cardId} (source: ${response.source})`
  );

  // Optimize the card response to reduce token usage
  const optimizedCard = optimizeCardResource(response.data, OptimizationLevel.STANDARD);

  const contents: ResourceContent[] = [
    {
      uri,
      mimeType: 'application/json',
      text: formatJson(optimizedCard),
    },
  ];

  return { contents };
}

/**
 * Handle database resource
 */
async function handleDatabaseResource(
  id: string,
  uri: string,
  apiClient: MetabaseApiClient,
  logDebug: LogFunction,
  logInfo: LogFunction
) {
  const databaseId = parseInt(id, 10);
  logDebug(`Fetching database with ID: ${databaseId}`);

  const response = await apiClient.getDatabase(databaseId);
  logInfo(
    `Successfully retrieved database: ${response.data.name || databaseId} (source: ${response.source})`
  );

  // Optimize the database response to reduce token usage
  const optimizedDatabase = optimizeDatabaseResource(response.data, OptimizationLevel.STANDARD);

  const contents: ResourceContent[] = [
    {
      uri,
      mimeType: 'application/json',
      text: formatJson(optimizedDatabase),
    },
  ];

  return { contents };
}

/**
 * Handle table resource (by table ID only)
 */
async function handleTableResource(
  id: string,
  uri: string,
  apiClient: MetabaseApiClient,
  logDebug: LogFunction,
  logInfo: LogFunction
) {
  const tableId = parseInt(id, 10);
  logDebug(`Fetching table with ID: ${tableId}`);

  const tableResponse = await apiClient.getTable(tableId);
  logInfo(
    `Successfully retrieved table: ${tableResponse.data.name || tableId} (source: ${tableResponse.source})`
  );

  // Optimize the table response to reduce token usage significantly
  const optimizedTable = optimizeTableResource(tableResponse.data, OptimizationLevel.STANDARD);

  const contents: ResourceContent[] = [
    {
      uri,
      mimeType: 'application/json',
      text: formatJson(optimizedTable),
    },
  ];

  return { contents };
}

/**
 * Handle field resource
 */
async function handleFieldResource(
  id: string,
  uri: string,
  apiClient: MetabaseApiClient,
  logDebug: LogFunction,
  logInfo: LogFunction
) {
  const fieldId = parseInt(id, 10);
  logDebug(`Fetching field with ID: ${fieldId}`);

  const fieldResponse = await apiClient.getField(fieldId);
  logInfo(
    `Successfully retrieved field: ${fieldResponse.data.name || fieldId} (source: ${fieldResponse.source})`
  );

  // Create optimized field response
  const field = fieldResponse.data;
  const optimizedField = {
    id: field.id,
    name: field.name,
    display_name: field.display_name,
    description: field.description,
    base_type: field.base_type,
    semantic_type: field.semantic_type,
    field_type: field.field_type,
    position: field.position,
    visibility_type: field.visibility_type,
    nullable: field.nullable,
    auto_increment: field.auto_increment,
    pk: field.pk,
    unique: field.unique,
    table_id: field.table_id,
    database_id: field.database_id,
    fk_target_field_id: field.fk_target_field_id,
    target: field.target,
    fingerprint: field.fingerprint,
    has_field_values: field.has_field_values,
    dimensions: field.dimensions,
    values: field.values,
    settings: field.settings,
    caveats: field.caveats,
    points_of_interest: field.points_of_interest,
    created_at: field.created_at,
    updated_at: field.updated_at,
    retrieved_at: new Date().toISOString(),
  };

  const contents: ResourceContent[] = [
    {
      uri,
      mimeType: 'application/json',
      text: formatJson(optimizedField),
    },
  ];

  return { contents };
}

/**
 * Handle metric resource
 */
async function handleMetricResource(
  id: string,
  uri: string,
  apiClient: MetabaseApiClient,
  logDebug: LogFunction,
  logInfo: LogFunction
) {
  const metricId = parseInt(id, 10);
  logDebug(`Fetching metric with ID: ${metricId}`);

  // Get metric from search results (metrics are returned in search)
  const searchParams = new URLSearchParams();
  searchParams.append('models', 'metric');
  searchParams.append('limit', '200');
  const searchResponse = await apiClient.request<any>(`/api/search?${searchParams.toString()}`);

  const searchResults = searchResponse.data || searchResponse;
  const metric = searchResults.find((item: any) => item.id === metricId);
  if (!metric) {
    throw new McpError(ErrorCode.InvalidRequest, `Metric with ID ${metricId} not found`);
  }

  logInfo(`Successfully retrieved metric: ${metric.name}`);

  // Optimize the metric response to reduce token usage
  const optimizedMetric = optimizeMetricResource(metric, OptimizationLevel.STANDARD);

  const contents: ResourceContent[] = [
    {
      uri,
      mimeType: 'application/json',
      text: formatJson(optimizedMetric),
    },
  ];

  return { contents };
}

/**
 * Handle individual collection resource - returns collection items
 */
async function handleCollectionResource(
  id: string,
  uri: string,
  apiClient: MetabaseApiClient,
  logDebug: LogFunction,
  logInfo: LogFunction
) {
  const collectionId = parseInt(id, 10);
  logDebug(`Fetching collection items for collection ID: ${collectionId}`);

  // Get both collection metadata and its items
  const [collectionResponse, itemsResponse] = await Promise.all([
    apiClient.getCollection(collectionId),
    apiClient.getCollectionItems(collectionId),
  ]);

  const collection = collectionResponse.data;
  const items = itemsResponse.data || [];

  logInfo(`Successfully retrieved collection "${collection.name}" with ${items.length} items`);

  // Organize items by type for better presentation
  const organizedItems = {
    cards: items.filter((item: any) => item.model === 'card'),
    dashboards: items.filter((item: any) => item.model === 'dashboard'),
    collections: items.filter((item: any) => item.model === 'collection'),
    other: items.filter((item: any) => !['card', 'dashboard', 'collection'].includes(item.model)),
  };

  // Create response with collection metadata and organized items
  const collectionWithItems = {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    location: collection.location,
    created_at: collection.created_at,
    updated_at: collection.updated_at,
    archived: collection.archived,
    items: {
      total_count: items.length,
      cards: organizedItems.cards.map((card: any) => ({
        id: card.id,
        name: card.name,
        description: card.description,
        model: card.model,
        view_count: card.view_count,
      })),
      dashboards: organizedItems.dashboards.map((dashboard: any) => ({
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        model: dashboard.model,
        view_count: dashboard.view_count,
      })),
      collections: organizedItems.collections.map((subcollection: any) => ({
        id: subcollection.id,
        name: subcollection.name,
        description: subcollection.description,
        model: subcollection.model,
      })),
      other: organizedItems.other.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        model: item.model,
      })),
    },
    retrieved_at: new Date().toISOString(),
  };

  const contents: ResourceContent[] = [
    {
      uri,
      mimeType: 'application/json',
      text: formatJson(collectionWithItems),
    },
  ];

  return { contents };
}

/**
 * Handle recent items resource - get recently viewed items by model type
 */
async function handleRecentItemsResource(
  model: string,
  uri: string,
  apiClient: MetabaseApiClient,
  logDebug: LogFunction,
  logInfo: LogFunction
) {
  logDebug(`Fetching recent items for model: ${model}`);

  // Validate model type
  const validModels = ['card', 'dashboard', 'table'];
  if (!validModels.includes(model)) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Invalid model type: ${model}. Valid models are: ${validModels.join(', ')}`
    );
  }

  // Use search API to get recent items
  const searchParams = new URLSearchParams();
  searchParams.append('models', model);
  searchParams.append('limit', '50');

  const searchResponse = await apiClient.request<any>(`/api/search?${searchParams.toString()}`);
  const items = searchResponse.data || searchResponse;

  // Sort by last_viewed_at if available, otherwise by updated_at
  const sortedItems = items
    .filter((item: any) => !item.archived)
    .sort((a: any, b: any) => {
      const aDate = new Date(a.last_viewed_at || a.updated_at || 0).getTime();
      const bDate = new Date(b.last_viewed_at || b.updated_at || 0).getTime();
      return bDate - aDate;
    })
    .slice(0, 20); // Top 20 most recent

  logInfo(`Successfully retrieved ${sortedItems.length} recent ${model} items`);

  const recentItems = {
    model,
    items: sortedItems.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      collection_id: item.collection_id,
      collection_name: item.collection?.name,
      last_viewed_at: item.last_viewed_at,
      view_count: item.view_count,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })),
    item_count: sortedItems.length,
    retrieved_at: new Date().toISOString(),
  };

  const contents: ResourceContent[] = [
    {
      uri,
      mimeType: 'application/json',
      text: formatJson(recentItems),
    },
  ];

  return { contents };
}
