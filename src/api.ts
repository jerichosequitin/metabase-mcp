import { config, AuthMethod, determineAuthMethod } from './config.js';
import { ErrorCode, McpError } from './types/core.js';
import { NetworkErrorFactory, createErrorFromHttpResponse } from './utils/errorFactory.js';
import { tokenStore, getValidSession } from './auth/index.js';

// Logger level enum
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

// Interface for tracking data source in API responses
export interface CachedResponse<T> {
  data: T;
  source: 'cache' | 'api';
  fetchTime: number;
}

export class MetabaseApiClient {
  private baseUrl: string;
  public sessionToken: string | null = null;
  private apiKey: string | null = null;
  private authMethod: AuthMethod;
  private headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // Individual item cache system
  private cardCache: Map<number, { data: any; timestamp: number }> = new Map();
  private dashboardCache: Map<number, { data: any; timestamp: number }> = new Map();
  private tableCache: Map<number, { data: any; timestamp: number }> = new Map();
  private databaseCache: Map<number, { data: any; timestamp: number }> = new Map();
  private collectionCache: Map<number, { data: any; timestamp: number }> = new Map();
  private fieldCache: Map<number, { data: any; timestamp: number }> = new Map();

  // List cache system - separate from individual item cache for different optimizations
  private listCardsCache: { data: any[]; timestamp: number } | null = null;
  private listDashboardsCache: { data: any[]; timestamp: number } | null = null;
  private listTablesCache: { data: any[]; timestamp: number } | null = null;
  private listDatabasesCache: { data: any[]; timestamp: number } | null = null;
  private listCollectionsCache: { data: any[]; timestamp: number } | null = null;
  private readonly CACHE_TTL_MS: number;
  private readonly REQUEST_TIMEOUT_MS: number;

  constructor() {
    this.baseUrl = config.METABASE_URL;
    this.authMethod = determineAuthMethod();
    this.apiKey = config.METABASE_API_KEY || null;
    this.CACHE_TTL_MS = config.CACHE_TTL_MS;
    this.REQUEST_TIMEOUT_MS = config.REQUEST_TIMEOUT_MS;

    if (this.authMethod === AuthMethod.API_KEY) {
      this.logInfo('Using API Key authentication method');
    } else if (this.authMethod === AuthMethod.GOOGLE_SSO) {
      this.logInfo('Using Google SSO authentication method');
    } else {
      this.logInfo('Using Session Token authentication method');
    }
  }

  /**
   * Extract resource type and ID from API path for better error context
   */
  private extractResourceFromPath(path: string): {
    resourceType?: string;
    resourceId?: string | number;
  } {
    // Handle common API patterns
    const patterns = [
      { regex: /\/api\/(card)\/(\d+)/, type: 'card' },
      { regex: /\/api\/(dashboard)\/(\d+)/, type: 'dashboard' },
      { regex: /\/api\/(database)\/(\d+)/, type: 'database' },
      { regex: /\/api\/(table)\/(\d+)/, type: 'table' },
      { regex: /\/api\/(collection)\/(\d+)/, type: 'collection' },
      { regex: /\/api\/(field)\/(\d+)/, type: 'field' },
    ];

    for (const pattern of patterns) {
      const match = path.match(pattern.regex);
      if (match) {
        return {
          resourceType: pattern.type,
          resourceId: parseInt(match[2], 10),
        };
      }
    }

    return { resourceType: undefined, resourceId: undefined };
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

  /**
   * HTTP request utility method with timeout support
   */
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = new URL(path, this.baseUrl);
    const headers = { ...this.headers };

    // Add appropriate authentication headers based on the method
    if (this.authMethod === AuthMethod.API_KEY && this.apiKey) {
      // Use X-API-KEY header as specified in the Metabase documentation
      headers['X-API-KEY'] = this.apiKey;
    } else if (
      (this.authMethod === AuthMethod.SESSION || this.authMethod === AuthMethod.GOOGLE_SSO) &&
      this.sessionToken
    ) {
      headers['X-Metabase-Session'] = this.sessionToken;
    }

    this.logDebug(`Making request to ${url.toString()}`);
    this.logDebug(`Using headers: ${JSON.stringify(headers)}`);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = `API request failed with status ${response.status}: ${response.statusText}`;
        this.logWarn(errorMessage, errorData);

        // Use enhanced error factory for HTTP errors with resource context
        const { resourceType, resourceId } = this.extractResourceFromPath(path);
        throw createErrorFromHttpResponse(
          response.status,
          errorData,
          `API request to ${path}`,
          resourceType,
          resourceId
        );
      }

      this.logDebug(`Received successful response from ${path}`);
      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout errors specifically
      if (error instanceof Error && error.name === 'AbortError') {
        this.logError(`Request to ${path} timed out after ${this.REQUEST_TIMEOUT_MS}ms`, error);
        throw NetworkErrorFactory.timeout(`API request to ${path}`, this.REQUEST_TIMEOUT_MS);
      }

      // Handle network connection errors
      if (
        error instanceof Error &&
        (error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('ECONNREFUSED'))
      ) {
        this.logError(`Network error for request to ${path}`, error);
        throw NetworkErrorFactory.connectionError(this.baseUrl);
      }

      // If it's already an enhanced McpError, re-throw it
      if (error instanceof McpError) {
        throw error;
      }

      // For other errors, wrap in generic network error
      this.logError(`Unexpected error for request to ${path}`, error);
      throw new McpError(
        ErrorCode.InternalError,
        `Unexpected error during API request: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get a single dashboard with caching - checks cache first, then API if needed
   */
  async getDashboard(dashboardId: number): Promise<CachedResponse<any>> {
    const now = Date.now();

    // Check if we have a cached version that's still valid
    const cached = this.dashboardCache.get(dashboardId);
    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      this.logDebug(`Using cached data for dashboard ${dashboardId}`);
      return {
        data: cached.data,
        source: 'cache',
        fetchTime: 0,
      };
    }

    // Cache miss or stale, fetch from API
    this.logDebug(`Fetching dashboard ${dashboardId} from Metabase API (cache miss or stale)`);
    const startTime = Date.now();

    try {
      const dashboard = await this.request<any>(`/api/dashboard/${dashboardId}`);
      const fetchTime = Date.now() - startTime;

      // Cache the result
      this.dashboardCache.set(dashboardId, {
        data: dashboard,
        timestamp: now,
      });

      this.logInfo(`Successfully fetched dashboard ${dashboardId} in ${fetchTime}ms`);
      return {
        data: dashboard,
        source: 'api',
        fetchTime,
      };
    } catch (error) {
      this.logError(`Failed to fetch dashboard ${dashboardId} from Metabase API`, error);

      // If we have any cached version (even stale), return it as fallback
      if (cached) {
        this.logWarn(
          `Using stale cached data for dashboard ${dashboardId} as fallback due to API error`
        );
        return {
          data: cached.data,
          source: 'cache',
          fetchTime: 0,
        };
      }

      throw error;
    }
  }

  /**
   * Get a single card with caching - checks cache first, then API if needed
   */
  async getCard(cardId: number): Promise<CachedResponse<any>> {
    const now = Date.now();
    const cached = this.cardCache.get(cardId);

    // Check if we have cached data that's still valid
    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      this.logDebug(`Using cached data for card ${cardId}`);
      return {
        data: cached.data,
        source: 'cache',
        fetchTime: 0,
      };
    }

    // Cache miss or stale, fetch from API
    this.logDebug(`Fetching fresh data for card ${cardId} from Metabase API`);
    const startTime = Date.now();

    try {
      const card = await this.request<any>(`/api/card/${cardId}`);
      const fetchTime = Date.now() - startTime;

      // Update cache with full card data
      this.cardCache.set(cardId, {
        data: card,
        timestamp: now,
      });

      this.logInfo(`Successfully fetched card ${cardId} in ${fetchTime}ms`);
      return {
        data: card,
        source: 'api',
        fetchTime,
      };
    } catch (error) {
      this.logError(`Failed to fetch card ${cardId} from Metabase API`, error);

      // If we have stale cached data, return it as fallback
      if (cached) {
        this.logWarn(`Using stale cached data for card ${cardId} as fallback due to API error`);
        return {
          data: cached.data,
          source: 'cache',
          fetchTime: 0,
        };
      }

      throw error;
    }
  }

  /**
   * Clear the cards cache (useful for debugging or when data changes)
   */
  clearCardsCache(): void {
    this.cardCache.clear();
    this.logDebug('Cards cache cleared');
  }

  /**
   * Clear the dashboards cache (useful for debugging or when data changes)
   */
  clearDashboardsCache(): void {
    this.dashboardCache.clear();
    this.logDebug('Dashboards cache cleared');
  }

  /**
   * Get list of cards with caching
   */
  async getCardsList(): Promise<CachedResponse<any[]>> {
    const now = Date.now();

    // Check if we have cached data that's still valid
    if (this.listCardsCache && now - this.listCardsCache.timestamp < this.CACHE_TTL_MS) {
      this.logDebug('Using cached data for cards list');
      return {
        data: this.listCardsCache.data,
        source: 'cache',
        fetchTime: 0,
      };
    }

    // Cache miss or stale, fetch from API
    this.logDebug('Fetching cards list from Metabase API (cache miss or stale)');
    const startTime = Date.now();

    try {
      const cards = await this.request<any[]>('/api/card');
      const fetchTime = Date.now() - startTime;

      // Cache the result
      this.listCardsCache = {
        data: cards,
        timestamp: now,
      };

      this.logInfo(`Successfully fetched cards list in ${fetchTime}ms`);
      return {
        data: cards,
        source: 'api',
        fetchTime,
      };
    } catch (error) {
      this.logError('Failed to fetch cards list from Metabase API', error);

      // If we have stale cached data, return it as fallback
      if (this.listCardsCache) {
        this.logWarn('Using stale cached data for cards list as fallback due to API error');
        return {
          data: this.listCardsCache.data,
          source: 'cache',
          fetchTime: 0,
        };
      }

      throw error;
    }
  }

  /**
   * Get list of dashboards with caching
   */
  async getDashboardsList(): Promise<CachedResponse<any[]>> {
    const now = Date.now();

    // Check if we have cached data that's still valid
    if (this.listDashboardsCache && now - this.listDashboardsCache.timestamp < this.CACHE_TTL_MS) {
      this.logDebug('Using cached data for dashboards list');
      return {
        data: this.listDashboardsCache.data,
        source: 'cache',
        fetchTime: 0,
      };
    }

    // Cache miss or stale, fetch from API
    this.logDebug('Fetching dashboards list from Metabase API (cache miss or stale)');
    const startTime = Date.now();

    try {
      const dashboards = await this.request<any[]>('/api/dashboard');
      const fetchTime = Date.now() - startTime;

      // Cache the result
      this.listDashboardsCache = {
        data: dashboards,
        timestamp: now,
      };

      this.logInfo(`Successfully fetched dashboards list in ${fetchTime}ms`);
      return {
        data: dashboards,
        source: 'api',
        fetchTime,
      };
    } catch (error) {
      this.logError('Failed to fetch dashboards list from Metabase API', error);

      // If we have stale cached data, return it as fallback
      if (this.listDashboardsCache) {
        this.logWarn('Using stale cached data for dashboards list as fallback due to API error');
        return {
          data: this.listDashboardsCache.data,
          source: 'cache',
          fetchTime: 0,
        };
      }

      throw error;
    }
  }

  /**
   * Get list of tables with caching
   */
  async getTablesList(): Promise<CachedResponse<any[]>> {
    const now = Date.now();

    // Check if we have cached data that's still valid
    if (this.listTablesCache && now - this.listTablesCache.timestamp < this.CACHE_TTL_MS) {
      this.logDebug('Using cached data for tables list');
      return {
        data: this.listTablesCache.data,
        source: 'cache',
        fetchTime: 0,
      };
    }

    // Cache miss or stale, fetch from API
    this.logDebug('Fetching tables list from Metabase API (cache miss or stale)');
    const startTime = Date.now();

    try {
      const tables = await this.request<any[]>('/api/table');
      const fetchTime = Date.now() - startTime;

      // Cache the result
      this.listTablesCache = {
        data: tables,
        timestamp: now,
      };

      this.logInfo(`Successfully fetched tables list in ${fetchTime}ms`);
      return {
        data: tables,
        source: 'api',
        fetchTime,
      };
    } catch (error) {
      this.logError('Failed to fetch tables list from Metabase API', error);

      // If we have stale cached data, return it as fallback
      if (this.listTablesCache) {
        this.logWarn('Using stale cached data for tables list as fallback due to API error');
        return {
          data: this.listTablesCache.data,
          source: 'cache',
          fetchTime: 0,
        };
      }

      throw error;
    }
  }

  /**
   * Get list of databases with caching
   */
  async getDatabasesList(): Promise<CachedResponse<any[]>> {
    const now = Date.now();

    // Check if we have cached data that's still valid
    if (this.listDatabasesCache && now - this.listDatabasesCache.timestamp < this.CACHE_TTL_MS) {
      this.logDebug('Using cached data for databases list');
      return {
        data: this.listDatabasesCache.data,
        source: 'cache',
        fetchTime: 0,
      };
    }

    // Cache miss or stale, fetch from API
    this.logDebug('Fetching databases list from Metabase API (cache miss or stale)');
    const startTime = Date.now();

    try {
      const response = await this.request<any>('/api/database');
      const fetchTime = Date.now() - startTime;

      // Database endpoint returns { data: [...], total: number } structure
      const databasesArray = response.data || [];

      // Cache the result
      this.listDatabasesCache = {
        data: databasesArray,
        timestamp: now,
      };

      this.logInfo(
        `Successfully fetched databases list in ${fetchTime}ms (${databasesArray.length} databases)`
      );
      return {
        data: databasesArray,
        source: 'api',
        fetchTime,
      };
    } catch (error) {
      this.logError('Failed to fetch databases list from Metabase API', error);

      // If we have stale cached data, return it as fallback
      if (this.listDatabasesCache) {
        this.logWarn('Using stale cached data for databases list as fallback due to API error');
        return {
          data: this.listDatabasesCache.data,
          source: 'cache',
          fetchTime: 0,
        };
      }

      throw error;
    }
  }

  /**
   * Get list of collections with caching
   */
  async getCollectionsList(): Promise<CachedResponse<any[]>> {
    const now = Date.now();

    // Check if we have cached data that's still valid
    if (
      this.listCollectionsCache &&
      now - this.listCollectionsCache.timestamp < this.CACHE_TTL_MS
    ) {
      this.logDebug('Using cached data for collections list');
      return {
        data: this.listCollectionsCache.data,
        source: 'cache',
        fetchTime: 0,
      };
    }

    // Cache miss or stale, fetch from API
    this.logDebug('Fetching collections list from Metabase API (cache miss or stale)');
    const startTime = Date.now();

    try {
      const collections = await this.request<any[]>('/api/collection');
      const fetchTime = Date.now() - startTime;

      // Cache the result
      this.listCollectionsCache = {
        data: collections,
        timestamp: now,
      };

      this.logInfo(`Successfully fetched collections list in ${fetchTime}ms`);
      return {
        data: collections,
        source: 'api',
        fetchTime,
      };
    } catch (error) {
      this.logError('Failed to fetch collections list from Metabase API', error);

      // If we have stale cached data, return it as fallback
      if (this.listCollectionsCache) {
        this.logWarn('Using stale cached data for collections list as fallback due to API error');
        return {
          data: this.listCollectionsCache.data,
          source: 'cache',
          fetchTime: 0,
        };
      }

      throw error;
    }
  }

  /**
   * Clear list caches
   */
  clearListCaches(): void {
    this.listCardsCache = null;
    this.listDashboardsCache = null;
    this.listTablesCache = null;
    this.listDatabasesCache = null;
    this.listCollectionsCache = null;
    this.logInfo('All list caches cleared');
  }

  /**
   * Clear individual list cache methods
   */
  clearCardsListCache(): void {
    this.listCardsCache = null;
    this.logDebug('Cards list cache cleared');
  }

  clearDashboardsListCache(): void {
    this.listDashboardsCache = null;
    this.logDebug('Dashboards list cache cleared');
  }

  clearTablesListCache(): void {
    this.listTablesCache = null;
    this.logDebug('Tables list cache cleared');
  }

  clearDatabasesListCache(): void {
    this.listDatabasesCache = null;
    this.logDebug('Databases list cache cleared');
  }

  clearCollectionsListCache(): void {
    this.listCollectionsCache = null;
    this.logDebug('Collections list cache cleared');
  }

  /**
   * Clear all caches (individual items and lists)
   */
  clearAllCache(): void {
    this.clearCardsCache();
    this.clearDashboardsCache();
    this.clearTablesCache();
    this.clearDatabasesCache();
    this.clearCollectionsCache();
    this.clearFieldsCache();
    this.clearListCaches();
    this.logInfo('All caches cleared (individual items and lists)');
  }

  /**
   * Get Metabase session token (handles all auth methods)
   */
  async getSessionToken(): Promise<string> {
    // If using API Key authentication, return the API key directly
    if (this.authMethod === AuthMethod.API_KEY && this.apiKey) {
      this.logInfo('Using API Key authentication', {
        keyLength: this.apiKey.length,
        keyFormat: this.apiKey.includes('mb_') ? 'starts with mb_' : 'other format',
      });
      return this.apiKey;
    }

    // For Google SSO auth, use stored tokens
    if (this.authMethod === AuthMethod.GOOGLE_SSO) {
      // Check if we already have a valid session token
      if (this.sessionToken) {
        return this.sessionToken;
      }

      // Try to get session from token store
      this.logInfo('Checking for stored Google SSO session');
      try {
        const storedToken = await getValidSession();
        if (storedToken) {
          this.sessionToken = storedToken;
          this.logInfo('Using stored Google SSO session');
          return this.sessionToken;
        }
      } catch (error) {
        this.logWarn('Failed to retrieve stored Google SSO session', undefined, error as Error);
      }

      // No valid session found - user needs to authenticate
      this.logError(
        'No valid Google SSO session found',
        new Error('Please run "npx metabase-mcp auth login" to authenticate with Google SSO')
      );
      throw new McpError(
        ErrorCode.InternalError,
        'No valid Google SSO session found. Please run "npx metabase-mcp auth login" to authenticate.'
      );
    }

    // For session auth, continue with existing logic
    if (this.sessionToken) {
      return this.sessionToken;
    }

    this.logInfo('Initiating authentication with Metabase');
    try {
      const response = await this.request<{ id: string }>('/api/session', {
        method: 'POST',
        body: JSON.stringify({
          username: config.METABASE_USER_EMAIL,
          password: config.METABASE_PASSWORD,
        }),
      });

      this.sessionToken = response.id;
      this.logInfo('Successfully authenticated with Metabase');
      return this.sessionToken;
    } catch (error) {
      this.logError('Authentication with Metabase failed', error);
      throw new McpError(ErrorCode.InternalError, 'Failed to authenticate with Metabase');
    }
  }

  /**
   * Initialize Google SSO authentication from stored tokens
   * Call this method during startup for Google SSO auth
   */
  async initializeGoogleSsoAuth(): Promise<boolean> {
    if (this.authMethod !== AuthMethod.GOOGLE_SSO) {
      return false;
    }

    try {
      const storedToken = await tokenStore.getSessionToken();
      if (storedToken) {
        this.sessionToken = storedToken;
        this.logInfo('Initialized with stored Google SSO session');
        return true;
      }
    } catch (error) {
      this.logWarn('Failed to initialize Google SSO auth', undefined, error as Error);
    }

    return false;
  }

  /**
   * Get a single table with caching - fetches query metadata
   */
  async getTable(tableId: number): Promise<CachedResponse<any>> {
    const now = Date.now();
    const cached = this.tableCache.get(tableId);

    // Check if we have cached data that's still valid
    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      this.logDebug(`Using cached data for table ${tableId}`);
      return {
        data: cached.data,
        source: 'cache',
        fetchTime: 0,
      };
    }

    // Cache miss or stale, fetch from API
    this.logDebug(`Fetching fresh data for table ${tableId} from Metabase API`);
    const startTime = Date.now();

    try {
      const table = await this.request<any>(`/api/table/${tableId}/query_metadata`);
      const fetchTime = Date.now() - startTime;

      // Update cache with full table data
      this.tableCache.set(tableId, {
        data: table,
        timestamp: now,
      });

      this.logInfo(`Successfully fetched table ${tableId} in ${fetchTime}ms`);
      return {
        data: table,
        source: 'api',
        fetchTime,
      };
    } catch (error) {
      this.logError(`Failed to fetch table ${tableId} from Metabase API`, error);

      // If we have stale cached data, return it as fallback
      if (cached) {
        this.logWarn(`Using stale cached data for table ${tableId} as fallback due to API error`);
        return {
          data: cached.data,
          source: 'cache',
          fetchTime: 0,
        };
      }

      throw error;
    }
  }

  /**
   * Get a single database with caching - includes tables
   */
  async getDatabase(databaseId: number): Promise<CachedResponse<any>> {
    const now = Date.now();
    const cached = this.databaseCache.get(databaseId);

    // Check if we have cached data that's still valid
    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      this.logDebug(`Using cached data for database ${databaseId}`);
      return {
        data: cached.data,
        source: 'cache',
        fetchTime: 0,
      };
    }

    // Cache miss or stale, fetch from API
    this.logDebug(`Fetching fresh data for database ${databaseId} from Metabase API`);
    const startTime = Date.now();

    try {
      const database = await this.request<any>(`/api/database/${databaseId}?include=tables`);
      const fetchTime = Date.now() - startTime;

      // Update cache with full database data
      this.databaseCache.set(databaseId, {
        data: database,
        timestamp: now,
      });

      this.logInfo(`Successfully fetched database ${databaseId} in ${fetchTime}ms`);
      return {
        data: database,
        source: 'api',
        fetchTime,
      };
    } catch (error) {
      this.logError(`Failed to fetch database ${databaseId} from Metabase API`, error);

      // If we have stale cached data, return it as fallback
      if (cached) {
        this.logWarn(
          `Using stale cached data for database ${databaseId} as fallback due to API error`
        );
        return {
          data: cached.data,
          source: 'cache',
          fetchTime: 0,
        };
      }

      throw error;
    }
  }

  /**
   * Get a single collection with caching
   */
  async getCollection(collectionId: number): Promise<CachedResponse<any>> {
    const now = Date.now();
    const cached = this.collectionCache.get(collectionId);

    // Check if we have cached data that's still valid
    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      this.logDebug(`Using cached data for collection ${collectionId}`);
      return {
        data: cached.data,
        source: 'cache',
        fetchTime: 0,
      };
    }

    // Cache miss or stale, fetch from API
    this.logDebug(`Fetching fresh data for collection ${collectionId} from Metabase API`);
    const startTime = Date.now();

    try {
      const collection = await this.request<any>(`/api/collection/${collectionId}`);
      const fetchTime = Date.now() - startTime;

      // Update cache with full collection data
      this.collectionCache.set(collectionId, {
        data: collection,
        timestamp: now,
      });

      this.logInfo(`Successfully fetched collection ${collectionId} in ${fetchTime}ms`);
      return {
        data: collection,
        source: 'api',
        fetchTime,
      };
    } catch (error) {
      this.logError(`Failed to fetch collection ${collectionId} from Metabase API`, error);

      // If we have stale cached data, return it as fallback
      if (cached) {
        this.logWarn(
          `Using stale cached data for collection ${collectionId} as fallback due to API error`
        );
        return {
          data: cached.data,
          source: 'cache',
          fetchTime: 0,
        };
      }

      throw error;
    }
  }

  /**
   * Get a single field with caching
   */
  async getField(fieldId: number): Promise<CachedResponse<any>> {
    const now = Date.now();
    const cached = this.fieldCache.get(fieldId);

    // Check if we have cached data that's still valid
    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      this.logDebug(`Using cached data for field ${fieldId}`);
      return {
        data: cached.data,
        source: 'cache',
        fetchTime: 0,
      };
    }

    // Cache miss or stale, fetch from API
    this.logDebug(`Fetching fresh data for field ${fieldId} from Metabase API`);
    const startTime = Date.now();

    try {
      const field = await this.request<any>(`/api/field/${fieldId}`);
      const fetchTime = Date.now() - startTime;

      // Update cache with full field data
      this.fieldCache.set(fieldId, {
        data: field,
        timestamp: now,
      });

      this.logInfo(`Successfully fetched field ${fieldId} in ${fetchTime}ms`);
      return {
        data: field,
        source: 'api',
        fetchTime,
      };
    } catch (error) {
      this.logError(`Failed to fetch field ${fieldId} from Metabase API`, error);

      // If we have stale cached data, return it as fallback
      if (cached) {
        this.logWarn(`Using stale cached data for field ${fieldId} as fallback due to API error`);
        return {
          data: cached.data,
          source: 'cache',
          fetchTime: 0,
        };
      }

      throw error;
    }
  }

  /**
   * Clear the tables cache
   */
  clearTablesCache(): void {
    this.tableCache.clear();
    this.logDebug('Tables cache cleared');
  }

  /**
   * Clear the databases cache
   */
  clearDatabasesCache(): void {
    this.databaseCache.clear();
    this.logDebug('Databases cache cleared');
  }

  /**
   * Clear the collections cache
   */
  clearCollectionsCache(): void {
    this.collectionCache.clear();
    this.logDebug('Collections cache cleared');
  }

  /**
   * Clear the fields cache
   */
  clearFieldsCache(): void {
    this.fieldCache.clear();
    this.logDebug('Fields cache cleared');
  }

  /**
   * Get items within a specific collection
   * Returns cards, dashboards, and other items in the collection
   */
  async getCollectionItems(collectionId: number): Promise<CachedResponse<any[]>> {
    const startTime = Date.now();

    try {
      this.logDebug(`Fetching items for collection ${collectionId} from Metabase API`);
      const response = await this.request<any>(`/api/collection/${collectionId}/items`);
      const fetchTime = Date.now() - startTime;

      // Extract data array from response
      const items = response.data || [];

      this.logInfo(
        `Successfully fetched ${items.length} items for collection ${collectionId} in ${fetchTime}ms`
      );
      return {
        data: items,
        source: 'api',
        fetchTime,
      };
    } catch (error) {
      this.logError(
        `Failed to fetch items for collection ${collectionId} from Metabase API`,
        error
      );
      throw error;
    }
  }

  /**
   * Get current user information to determine user ID for personal collection filtering
   */
  async getCurrentUser(): Promise<CachedResponse<any>> {
    const startTime = Date.now();

    try {
      this.logDebug('Fetching current user information from Metabase API');
      const user = await this.request<any>('/api/user/current');
      const fetchTime = Date.now() - startTime;

      this.logInfo(`Successfully fetched current user information in ${fetchTime}ms`);
      return {
        data: user,
        source: 'api',
        fetchTime,
      };
    } catch (error) {
      this.logError('Failed to fetch current user information from Metabase API', error);
      throw error;
    }
  }
}
