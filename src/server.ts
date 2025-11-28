import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { LogLevel, config } from './config.js';
import { generateRequestId } from './utils/index.js';
import { ErrorCode, McpError, ApiError } from './types/core.js';
import { MetabaseApiClient } from './api.js';
import {
  handleList,
  handleExecute,
  handleExport,
  handleSearch,
  handleClearCache,
  handleRetrieve,
} from './handlers/index.js';
import {
  handleListResources,
  handleListResourceTemplates,
  handleReadResource,
} from './handlers/resources/index.js';
import { handleListPrompts, handleGetPrompt } from './handlers/prompts/index.js';

export class MetabaseServer {
  private server: Server;
  private apiClient: MetabaseApiClient;

  constructor() {
    this.server = new Server(
      {
        name: 'metabase-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    this.apiClient = new MetabaseApiClient();

    this.setupResourceHandlers();
    this.setupToolHandlers();
    this.setupPromptHandlers();

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
    this.server.setRequestHandler(ListResourcesRequestSchema, async request => {
      return handleListResources(
        request,
        this.apiClient,
        this.logInfo.bind(this),
        this.logError.bind(this)
      );
    });

    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async request => {
      return handleListResourceTemplates(request, this.logInfo.bind(this));
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async request => {
      return handleReadResource(
        request,
        this.apiClient,
        this.logInfo.bind(this),
        this.logWarn.bind(this),
        this.logDebug.bind(this),
        this.logError.bind(this)
      );
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
            annotations: {
              readOnlyHint: true,
              destructiveHint: false,
              idempotentHint: true,
              openWorldHint: true,
            },
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
              'Fetch additional details for supported models (Cards, Dashboards, Tables, Databases, Collections, Fields). Supports multiple IDs (max 50 per request) with intelligent concurrent processing and optimized caching. Includes table pagination for large databases exceeding token limits.',
            annotations: {
              readOnlyHint: true,
              destructiveHint: false,
              idempotentHint: true,
              openWorldHint: true,
            },
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
                table_offset: {
                  type: 'number',
                  description:
                    'Starting offset for table pagination (database model only). Use with table_limit for paginating through large databases that exceed token limits.',
                  minimum: 0,
                },
                table_limit: {
                  type: 'number',
                  description:
                    'Maximum number of tables to return per page (database model only). Maximum 100 tables per page. Use with table_offset for pagination.',
                  minimum: 1,
                  maximum: 100,
                },
              },
              required: ['model', 'ids'],
            },
          },

          {
            name: 'list',
            description:
              'Fetch all records for a single Metabase resource type with highly optimized responses for overview purposes. Retrieves complete lists of cards, dashboards, tables, databases, or collections. Returns only essential identifier fields for efficient browsing and includes intelligent caching for performance. Supports pagination for large datasets exceeding token limits.',
            annotations: {
              readOnlyHint: true,
              destructiveHint: false,
              idempotentHint: true,
              openWorldHint: true,
            },
            inputSchema: {
              type: 'object',
              properties: {
                model: {
                  type: 'string',
                  enum: ['cards', 'dashboards', 'tables', 'databases', 'collections'],
                  description:
                    'Model type to list ALL records for. Supported models: cards (all questions/queries), dashboards (all dashboards), tables (all database tables), databases (all connected databases), collections (all folders/collections). Only one model type allowed per request for optimal performance.',
                },
                offset: {
                  type: 'number',
                  description:
                    'Starting offset for pagination. Use with limit for paginating through large datasets that exceed token limits.',
                  minimum: 0,
                },
                limit: {
                  type: 'number',
                  description:
                    'Maximum number of items to return per page. Maximum 1000 items per page. Use with offset for pagination.',
                  minimum: 1,
                  maximum: 1000,
                },
              },
              required: ['model'],
            },
          },
          {
            name: 'execute',
            description:
              'Unified command to execute SQL queries or run saved cards against Metabase databases. Use Card mode when existing cards have the needed filters. Use SQL mode for custom queries or when cards lack required filters. Returns up to 2000 rows per request. SECURITY WARNING: SQL mode can execute ANY valid SQL including destructive operations (DELETE, UPDATE, DROP, TRUNCATE, ALTER). Use with caution and ensure appropriate database permissions are configured in Metabase.' +
              (config.METABASE_READ_ONLY_MODE
                ? ' [READ-ONLY MODE ENABLED: Only SELECT queries are permitted. Write operations (INSERT, UPDATE, DELETE, DROP, etc.) will be rejected.]'
                : ''),
            annotations: {
              readOnlyHint: false,
              destructiveHint: true,
              idempotentHint: false,
              openWorldHint: true,
            },
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
            annotations: {
              readOnlyHint: true,
              destructiveHint: false,
              idempotentHint: false,
              openWorldHint: true,
            },
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
            annotations: {
              readOnlyHint: false,
              destructiveHint: false,
              idempotentHint: true,
              openWorldHint: false,
            },
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
          // For enhanced errors, return structured guidance in the response
          // Use the error message directly without duplication
          const errorText = [`Error: ${error.message}`];

          // Add guidance if different from the main message
          if (error.details.agentGuidance && error.details.agentGuidance !== error.message) {
            errorText.push(`\n\nGuidance: ${error.details.agentGuidance}`);
          }

          errorText.push(`\n\nRecovery Action: ${error.details.recoveryAction}`);
          errorText.push(`\n\nRetryable: ${error.details.retryable}`);

          // Add retry timing if available
          if (error.details.retryAfterMs) {
            errorText.push(`\n\nRetry After: ${error.details.retryAfterMs}ms`);
          }

          const errorResponse = {
            content: [
              {
                type: 'text',
                text: errorText.join(''),
              },
            ],
            isError: true,
          };

          // Add troubleshooting steps if available
          if (error.details.troubleshootingSteps && error.details.troubleshootingSteps.length > 0) {
            errorResponse.content.push({
              type: 'text',
              text: `\nTroubleshooting Steps:\n${error.details.troubleshootingSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}`,
            });
          }

          return errorResponse;
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

  /**
   * Set up prompt handlers
   */
  private setupPromptHandlers() {
    this.server.setRequestHandler(ListPromptsRequestSchema, async request => {
      return handleListPrompts(request, this.logInfo.bind(this));
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async request => {
      return handleGetPrompt(
        request,
        this.apiClient,
        this.logInfo.bind(this),
        this.logWarn.bind(this),
        this.logError.bind(this)
      );
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
