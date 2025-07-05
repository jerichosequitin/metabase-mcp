import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { LogLevel } from './config.js';
import { generateRequestId } from './utils/index.js';
import {
  ErrorCode,
  McpError,
  ApiError,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
} from './types/core.js';
import { MetabaseApiClient } from './api.js';
import {
  handleList,
  handleExecute,
  handleExport,
  handleSearch,
  handleClearCache,
  handleRetrieve,
} from './handlers/index.js';

export class MetabaseServer {
  private server: Server;
  private apiClient: MetabaseApiClient;

  constructor() {
    this.server = new Server(
      {
        name: 'metabase-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.apiClient = new MetabaseApiClient();

    this.setupResourceHandlers();
    this.setupToolHandlers();

    // Enhanced error handling with logging
    this.server.onerror = (error: Error) => {
      this.logError('Unexpected server error occurred', error);
    };

    process.on('SIGINT', async () => {
      this.logInfo('Gracefully shutting down server');
      await this.server.close();
      process.exit(0);
    });
  }

  // Enhanced logging utilities
  private log(level: LogLevel, message: string, data?: unknown, error?: Error) {
    const timestamp = new Date().toISOString();

    const logMessage: Record<string, unknown> = {
      timestamp,
      level,
      message,
    };

    if (data !== undefined) {
      logMessage.data = data;
    }

    if (error) {
      logMessage.error = error.message || 'Unknown error';
      logMessage.stack = error.stack;
    }

    // Output structured log for machine processing
    console.error(JSON.stringify(logMessage));

    // Output human-readable format
    try {
      const logPrefix = level.toUpperCase();

      if (error) {
        console.error(
          `[${timestamp}] ${logPrefix}: ${message} - ${error.message || 'Unknown error'}`
        );
      } else {
        console.error(`[${timestamp}] ${logPrefix}: ${message}`);
      }
    } catch (e) {
      // Ignore if console is not available
    }
  }

  private logDebug(message: string, data?: unknown) {
    this.log(LogLevel.DEBUG, message, data);
  }

  private logInfo(message: string, data?: unknown) {
    this.log(LogLevel.INFO, message, data);
  }

  private logWarn(message: string, data?: unknown, error?: Error) {
    this.log(LogLevel.WARN, message, data, error);
  }

  private logError(message: string, error: unknown) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.log(LogLevel.ERROR, message, undefined, errorObj);
  }

  private logFatal(message: string, error: unknown) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.log(LogLevel.FATAL, message, undefined, errorObj);
  }

  /**
   * Set up resource handlers
   */
  private setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async _request => {
      this.logInfo('Processing request to list resources', { requestId: generateRequestId() });
      await this.apiClient.getSessionToken();

      try {
        // Get dashboard list using caching method
        this.logDebug('Fetching dashboards from Metabase');
        const dashboardsResponse = await this.apiClient.getDashboardsList();

        const resourceCount = dashboardsResponse.data.length;
        this.logInfo(
          `Successfully retrieved ${resourceCount} dashboards from Metabase (source: ${dashboardsResponse.source})`
        );

        // Return dashboards as resources
        return {
          resources: dashboardsResponse.data.map((dashboard: any) => ({
            uri: `metabase://dashboard/${dashboard.id}`,
            mimeType: 'application/json',
            name: dashboard.name,
            description: `Metabase dashboard: ${dashboard.name}`,
          })),
        };
      } catch (error) {
        this.logError('Failed to retrieve dashboards from Metabase', error);
        throw new McpError(ErrorCode.InternalError, 'Failed to retrieve Metabase resources');
      }
    });

    // Resource templates
    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
      this.logInfo('Processing request to list resource templates');
      return {
        resourceTemplates: [
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
            description: 'Get a Metabase database by its ID',
          },
        ],
      };
    });

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async request => {
      const requestId = generateRequestId();
      this.logInfo('Processing request to read resource', {
        requestId,
        uri: request.params?.uri,
      });

      await this.apiClient.getSessionToken();

      const uri = request.params?.uri;
      if (!uri) {
        this.logWarn('Missing URI parameter in resource request', { requestId });
        throw new McpError(ErrorCode.InvalidParams, 'URI parameter is required');
      }

      let match;

      try {
        // Handle dashboard resource
        if ((match = uri.match(/^metabase:\/\/dashboard\/(\d+)$/))) {
          const dashboardId = parseInt(match[1], 10);
          this.logDebug(`Fetching dashboard with ID: ${dashboardId}`);

          const response = await this.apiClient.getDashboard(dashboardId);
          this.logInfo(
            `Successfully retrieved dashboard: ${response.data.name || dashboardId} (source: ${response.source})`
          );

          return {
            contents: [
              {
                uri: request.params?.uri,
                mimeType: 'application/json',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        } else if ((match = uri.match(/^metabase:\/\/card\/(\d+)$/))) {
          // Handle question/card resource
          const cardId = parseInt(match[1], 10);
          this.logDebug(`Fetching card/question with ID: ${cardId}`);

          const response = await this.apiClient.getCard(cardId);
          this.logInfo(
            `Successfully retrieved card: ${response.data.name || cardId} (source: ${response.source})`
          );

          return {
            contents: [
              {
                uri: request.params?.uri,
                mimeType: 'application/json',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        } else if ((match = uri.match(/^metabase:\/\/database\/(\d+)$/))) {
          // Handle database resource
          const databaseId = parseInt(match[1], 10);
          this.logDebug(`Fetching database with ID: ${databaseId}`);

          const response = await this.apiClient.getDatabase(databaseId);
          this.logInfo(
            `Successfully retrieved database: ${response.data.name || databaseId} (source: ${response.source})`
          );

          return {
            contents: [
              {
                uri: request.params?.uri,
                mimeType: 'application/json',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        } else {
          this.logWarn(`Invalid URI format: ${uri}`, { requestId });
          throw new McpError(ErrorCode.InvalidRequest, `Invalid URI format: ${uri}`);
        }
      } catch (error) {
        const apiError = error as ApiError;
        const errorMessage = apiError.data?.message || apiError.message || 'Unknown error';
        this.logError(`Failed to fetch Metabase resource: ${errorMessage}`, error);

        throw new McpError(ErrorCode.InternalError, `Metabase API error: ${errorMessage}`);
      }
    });
  }

  /**
   * Set up tool handlers
   */
  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logInfo('Processing request to list available tools');
      return {
        tools: [
          {
            name: 'search',
            description:
              'Search across all Metabase items using native search API. Supports cards, dashboards, tables, collections, databases, and more. Use this first for finding any Metabase content. Returns search metrics, recommendations, and clean results organized by model type.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search across names, descriptions, and metadata.',
                },
                models: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: [
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
                    ],
                  },
                  description:
                    'Model types to search (default: ["card", "dashboard"]). RESTRICTION: "database" model cannot be mixed with others and must be used exclusively.',
                  default: ['card', 'dashboard'],
                },
                max_results: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 50)',
                  minimum: 1,
                  maximum: 200,
                  default: 50,
                },
                search_native_query: {
                  type: 'boolean',
                  description:
                    'Search within SQL query content of cards (default: false). RESTRICTION: Only works when models=["card"] exclusively.',
                  default: false,
                },
                include_dashboard_questions: {
                  type: 'boolean',
                  description:
                    'Include questions within dashboards in results (default: false). RESTRICTION: Only works when "dashboard" is included in models.',
                  default: false,
                },
                ids: {
                  type: 'array',
                  items: { type: 'number' },
                  description:
                    'Search for specific IDs. RESTRICTIONS: Only works with single model type, cannot be used with "table" or "database" models.',
                },
                archived: {
                  type: 'boolean',
                  description: 'Search archived items only (default: false)',
                },
                database_id: {
                  type: 'number',
                  description:
                    'Search items from specific database ID. RESTRICTION: Cannot be used when searching for databases (models=["database"]).',
                },
                verified: {
                  type: 'boolean',
                  description: 'Search verified items only (requires premium features)',
                },
              },
              required: [],
            },
          },
          {
            name: 'retrieve',
            description:
              'Fetch additional details for supported models (Cards, Dashboards, Tables, Databases, Collections, Fields). Supports multiple IDs (max 50 per request) with intelligent concurrent processing and optimized caching.',
            inputSchema: {
              type: 'object',
              properties: {
                model: {
                  type: 'string',
                  enum: ['card', 'dashboard', 'table', 'database', 'collection', 'field'],
                  description:
                    'Type of model to retrieve. Only one model type allowed per request.',
                },
                ids: {
                  type: 'array',
                  items: {
                    type: 'number',
                  },
                  description:
                    'Array of IDs to retrieve (1-50 IDs per request). All IDs must be positive integers. For larger datasets, make multiple requests.',
                  minItems: 1,
                  maxItems: 50,
                },
              },
              required: ['model', 'ids'],
            },
          },

          {
            name: 'list',
            description:
              'Fetch all records for a single Metabase resource type with highly optimized responses for overview purposes. Retrieves complete lists of cards, dashboards, tables, databases, or collections. Returns only essential identifier fields for efficient browsing and includes intelligent caching for performance.',
            inputSchema: {
              type: 'object',
              properties: {
                model: {
                  type: 'string',
                  enum: ['cards', 'dashboards', 'tables', 'databases', 'collections'],
                  description:
                    'Model type to list ALL records for. Supported models: cards (all questions/queries), dashboards (all dashboards), tables (all database tables), databases (all connected databases), collections (all folders/collections). Only one model type allowed per request for optimal performance.',
                },
              },
              required: ['model'],
            },
          },
          {
            name: 'execute',
            description:
              'Unified command to execute SQL queries or run saved cards against Metabase databases. Use Card mode when existing cards have the needed filters. Use SQL mode for custom queries or when cards lack required filters. Returns up to 2000 rows per request.',
            inputSchema: {
              type: 'object',
              properties: {
                database_id: {
                  type: 'number',
                  description: 'Database ID to execute query against (SQL mode only)',
                },
                query: {
                  type: 'string',
                  description: 'SQL query to execute (SQL mode only)',
                },
                card_id: {
                  type: 'number',
                  description: 'ID of saved card to execute (card mode only)',
                },
                native_parameters: {
                  type: 'array',
                  items: { type: 'object' },
                  description:
                    'Parameters for SQL template variables like {{variable_name}} (SQL mode only)',
                },
                card_parameters: {
                  type: 'array',
                  items: { type: 'object' },
                  description:
                    'Parameters for filtering card results (card mode only). Each parameter must follow Metabase format: {id: "uuid", slug: "param_name", target: ["dimension", ["template-tag", "param_name"]], type: "param_type", value: "param_value"}',
                },
                row_limit: {
                  type: 'number',
                  description: 'Maximum number of rows to return (default: 500, max: 2000)',
                  default: 500,
                  minimum: 1,
                  maximum: 2000,
                },
              },
              required: [],
            },
          },
          {
            name: 'export',
            description:
              'Unified command to export large SQL query results or saved cards using Metabase export endpoints (supports up to 1M rows). Returns data in specified format (CSV, JSON, or XLSX) and automatically saves to Downloads/Metabase folder.',
            inputSchema: {
              type: 'object',
              properties: {
                database_id: {
                  type: 'number',
                  description: 'Database ID to export query from (SQL mode only)',
                },
                query: {
                  type: 'string',
                  description: 'SQL query to execute and export (SQL mode only)',
                },
                card_id: {
                  type: 'number',
                  description: 'ID of saved card to export (card mode only)',
                },
                native_parameters: {
                  type: 'array',
                  items: { type: 'object' },
                  description:
                    'Parameters for SQL template variables like {{variable_name}} (SQL mode only)',
                },
                card_parameters: {
                  type: 'array',
                  items: { type: 'object' },
                  description:
                    'Parameters for filtering card results before export (card mode only). Each parameter must follow Metabase format: {id: "uuid", slug: "param_name", target: ["dimension", ["template-tag", "param_name"]], type: "param_type", value: "param_value"}',
                },
                format: {
                  type: 'string',
                  enum: ['csv', 'json', 'xlsx'],
                  description:
                    'Export format: csv (text), json (structured data), or xlsx (Excel file)',
                  default: 'csv',
                },
                filename: {
                  type: 'string',
                  description:
                    'Custom filename (without extension) for the saved file. If not provided, a timestamp-based name will be used.',
                },
              },
              required: [],
            },
          },
          {
            name: 'clear_cache',
            description:
              'Clear the internal cache for stored data. Useful for debugging or when you know the data has changed. Supports granular cache clearing for both individual items and list caches.',
            inputSchema: {
              type: 'object',
              properties: {
                cache_type: {
                  type: 'string',
                  enum: [
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
                  ],
                  description:
                    'Type of cache to clear: "all" (default - clears all cache types), individual item caches ("cards", "dashboards", "tables", "databases", "collections", "fields"), list caches ("cards-list", "dashboards-list", "tables-list", "databases-list", "collections-list"), or bulk operations ("all-lists", "all-individual")',
                  default: 'all',
                },
              },
              required: [],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const toolName = request.params?.name || 'unknown';
      const requestId = generateRequestId();

      this.logInfo(`Processing tool execution request: ${toolName}`, {
        requestId,
        arguments: request.params?.arguments,
      });

      await this.apiClient.getSessionToken();

      try {
        switch (request.params?.name) {
          case 'search':
            return handleSearch(
              request,
              requestId,
              this.apiClient,
              this.logDebug.bind(this),
              this.logInfo.bind(this),
              this.logWarn.bind(this),
              this.logError.bind(this)
            );

          case 'list':
            return handleList(
              request,
              requestId,
              this.apiClient,
              this.logDebug.bind(this),
              this.logInfo.bind(this),
              this.logWarn.bind(this),
              this.logError.bind(this)
            );

          case 'execute':
            return handleExecute(
              request,
              requestId,
              this.apiClient,
              this.logDebug.bind(this),
              this.logInfo.bind(this),
              this.logWarn.bind(this),
              this.logError.bind(this)
            );
          case 'export':
            return handleExport(
              request,
              requestId,
              this.apiClient,
              this.logDebug.bind(this),
              this.logInfo.bind(this),
              this.logWarn.bind(this),
              this.logError.bind(this)
            );
          case 'clear_cache':
            return handleClearCache(
              request,
              this.apiClient,
              this.logInfo.bind(this),
              this.logWarn.bind(this),
              this.logError.bind(this)
            );
          case 'retrieve':
            return handleRetrieve(
              request,
              requestId,
              this.apiClient,
              this.logDebug.bind(this),
              this.logInfo.bind(this),
              this.logWarn.bind(this),
              this.logError.bind(this)
            );
          default:
            this.logWarn(`Received request for unknown tool: ${request.params?.name}`, {
              requestId,
            });
            return {
              content: [
                {
                  type: 'text',
                  text: `Unknown tool: ${request.params?.name}`,
                },
              ],
              isError: true,
            };
        }
      } catch (error) {
        // If it's already an McpError, re-throw it to be handled by the MCP framework
        if (error instanceof McpError) {
          throw error;
        }

        // Handle other errors with generic fallback
        const apiError = error as ApiError;
        const errorMessage = apiError.data?.message || apiError.message || 'Unknown error';

        this.logError(`Tool execution failed: ${errorMessage}`, error);

        // Create an McpError for consistent error handling
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
      }
    });
  }

  async run() {
    try {
      this.logInfo('Starting Metabase MCP server');
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      this.logInfo('Metabase MCP server successfully connected and running on stdio transport');
    } catch (error) {
      this.logFatal('Failed to start Metabase MCP server', error);
      throw error;
    }
  }
}
