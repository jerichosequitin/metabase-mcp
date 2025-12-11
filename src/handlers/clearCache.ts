import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { MetabaseApiClient } from '../api.js';
import { handleApiError, validateEnumValue } from '../utils/index.js';

export function handleClearCache(
  request: CallToolRequest,
  apiClient: MetabaseApiClient,
  logInfo: (message: string, data?: unknown) => void,
  logWarn: (message: string, data?: unknown, error?: Error) => void,
  logError: (message: string, error: unknown) => void
) {
  const requestId = 'clearCache'; // Generate a simple request ID for logging

  // Validate cache_type parameter with case insensitive handling
  const validCacheTypes = [
    'all',
    'cards',
    'dashboards',
    'tables',
    'databases',
    'collections',
    'fields',
    'cards-list',
    'dashboards-list',
    'tables-list',
    'databases-list',
    'collections-list',
    'all-lists',
    'all-individual',
  ] as const;

  const cacheType = validateEnumValue(
    request.params?.arguments?.cache_type || 'all',
    validCacheTypes,
    'cache_type',
    requestId,
    logWarn
  );

  try {
    let message = '';
    let cacheStatus = '';

    switch (cacheType) {
      case 'cards':
        apiClient.clearCardsCache();
        message = 'Cards cache cleared successfully (individual items only)';
        cacheStatus = 'cards_cache_empty';
        break;

      case 'dashboards':
        apiClient.clearDashboardsCache();
        message = 'Dashboards cache cleared successfully (individual items only)';
        cacheStatus = 'dashboards_cache_empty';
        break;

      case 'tables':
        apiClient.clearTablesCache();
        message = 'Tables cache cleared successfully (individual items only)';
        cacheStatus = 'tables_cache_empty';
        break;

      case 'databases':
        apiClient.clearDatabasesCache();
        message = 'Databases cache cleared successfully (individual items only)';
        cacheStatus = 'databases_cache_empty';
        break;

      case 'collections':
        apiClient.clearCollectionsCache();
        message = 'Collections cache cleared successfully (individual items only)';
        cacheStatus = 'collections_cache_empty';
        break;

      case 'fields':
        apiClient.clearFieldsCache();
        message = 'Fields cache cleared successfully';
        cacheStatus = 'fields_cache_empty';
        break;

      case 'cards-list':
        apiClient.clearCardsListCache();
        message = 'Cards list cache cleared successfully';
        cacheStatus = 'cards_list_cache_empty';
        break;

      case 'dashboards-list':
        apiClient.clearDashboardsListCache();
        message = 'Dashboards list cache cleared successfully';
        cacheStatus = 'dashboards_list_cache_empty';
        break;

      case 'tables-list':
        apiClient.clearTablesListCache();
        message = 'Tables list cache cleared successfully';
        cacheStatus = 'tables_list_cache_empty';
        break;

      case 'databases-list':
        apiClient.clearDatabasesListCache();
        message = 'Databases list cache cleared successfully';
        cacheStatus = 'databases_list_cache_empty';
        break;

      case 'collections-list':
        apiClient.clearCollectionsListCache();
        message = 'Collections list cache cleared successfully';
        cacheStatus = 'collections_list_cache_empty';
        break;

      case 'all-lists':
        apiClient.clearListCaches();
        message =
          'All list caches cleared successfully (cards, dashboards, tables, databases, collections)';
        cacheStatus = 'all_list_caches_empty';
        break;

      case 'all-individual':
        apiClient.clearCardsCache();
        apiClient.clearDashboardsCache();
        apiClient.clearTablesCache();
        apiClient.clearDatabasesCache();
        apiClient.clearCollectionsCache();
        apiClient.clearFieldsCache();
        message =
          'All individual item caches cleared successfully (cards, dashboards, tables, databases, collections, fields)';
        cacheStatus = 'all_individual_caches_empty';
        break;

      case 'all':
      default:
        apiClient.clearAllCache();
        message =
          'All caches cleared successfully (individual items and lists for cards, dashboards, tables, databases, collections, and fields)';
        cacheStatus = 'all_caches_empty';
        break;
    }

    logInfo(message);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              message,
              cache_type: cacheType,
              cache_status: cacheStatus,
              next_fetch_will_be: 'fresh from API',
              cache_info: {
                cache_explanation:
                  'Unified cache system with separate individual item and list caches for optimal performance',
                cache_types: {
                  individual:
                    'Cache for specific items accessed by ID (cards, dashboards, tables, databases, collections, fields)',
                  lists:
                    'Cache for bulk list operations (cards-list, dashboards-list, tables-list, databases-list, collections-list)',
                },
              },
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: any) {
    throw handleApiError(error, { operation: 'Clear cache' }, logError);
  }
}
