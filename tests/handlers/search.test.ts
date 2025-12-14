/**
 * Unit tests for the search handler
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleSearch } from '../../src/handlers/search.js';
import { McpError } from '../../src/types/core.js';
import {
  mockApiClient,
  mockLogger,
  resetAllMocks,
  createMockRequest,
  getLoggerFunctions,
  sampleCard,
  sampleDashboard
} from '../setup.js';

describe('handleSearch', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Parameter validation', () => {
    it('should throw error when no search parameters are provided', async () => {
      const request = createMockRequest('search', {});
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Missing query, ids, or database_id parameter in search request',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when both query and ids are provided', async () => {
      const request = createMockRequest('search', { query: 'test', ids: [1] });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Cannot use both query and ids parameters simultaneously',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when ids is used with multiple models', async () => {
      const request = createMockRequest('search', { ids: [1], models: ['card', 'dashboard'] });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'ids parameter can only be used with a single model type',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when ids is used with table model', async () => {
      const request = createMockRequest('search', { ids: [1], models: ['table'] });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'ids parameter cannot be used with table model',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when database model is mixed with others', async () => {
      const request = createMockRequest('search', { query: 'test', models: ['database', 'card'] });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'database model cannot be mixed with other models',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when database_id is used with database model', async () => {
      const request = createMockRequest('search', { query: 'test', models: ['database'], database_id: 1 });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'database_id parameter cannot be used when searching solely for databases',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when invalid model types are specified', async () => {
      const request = createMockRequest('search', { query: 'test', models: ['invalid-model'] });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Invalid models[0] parameter: invalid-model',
        expect.objectContaining({ 
          requestId: 'test-request-id',
          validValues: expect.any(Array)
        })
      );
    });

    it('should throw error when database_id is invalid', async () => {
      const request = createMockRequest('search', { database_id: 'invalid' });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);
    });

    it('should throw error when search_native_query is used without cards model', async () => {
      const request = createMockRequest('search', { query: 'test', models: ['dashboard'], search_native_query: true });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'search_native_query parameter can only be used when searching cards exclusively',
        { requestId: 'test-request-id' }
      );
    });
  });

  describe('Search functionality', () => {
    it('should successfully search with query parameter', async () => {
      const searchResults = [sampleCard, sampleDashboard];
      mockApiClient.request.mockResolvedValue(searchResults);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('search', { query: 'test' });
      const result = await handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith(
        expect.stringContaining('/api/search?q=test')
      );

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Test Card');
      expect(result.content[0].text).toContain('Test Dashboard');
    });

    it('should successfully search with ids parameter', async () => {
      const searchResults = [sampleCard];
      mockApiClient.request.mockResolvedValue(searchResults);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('search', { ids: [1], models: ['card'] });
      const result = await handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith(
        expect.stringContaining('/api/search?models=card&ids=1')
      );

      expect(result.content[0].text).toContain('Test Card');
    });

    it('should successfully search with database_id parameter', async () => {
      const searchResults = [sampleCard];
      mockApiClient.request.mockResolvedValue(searchResults);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('search', { database_id: 1 });
      const result = await handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith(
        expect.stringContaining('/api/search?models=card&models=dashboard&table_db_id=1')
      );

      expect(result.content[0].text).toContain('Test Card');
    });

    it('should handle empty search results', async () => {
      const searchResults: any[] = [];
      mockApiClient.request.mockResolvedValue(searchResults);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('search', { query: 'nonexistent' });
      const result = await handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.search_metrics.total_results).toBeDefined();
      expect(responseData.results).toEqual([]);
    });

    it('should handle API errors', async () => {
      const apiError = new Error('API Error');
      mockApiClient.request.mockRejectedValue(apiError);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('search', { query: 'test' });

      await expect(
        handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow();
    });
  });

  describe('Search parameters', () => {
    it('should use custom max_results parameter', async () => {
      const searchResults = [sampleCard];
      mockApiClient.request.mockResolvedValue(searchResults);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('search', { query: 'test', max_results: 10 });
      await handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith(
        expect.stringContaining('/api/search?q=test')
      );
    });

    it('should throw error when max_results is 0', async () => {
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();
      const request = createMockRequest('search', { query: 'test', max_results: 0 });

      await expect(
        handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Invalid max_results parameter - must be a positive number',
        expect.objectContaining({ requestId: 'test-request-id' })
      );
    });

    it('should throw error when max_results exceeds 50', async () => {
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();
      const request = createMockRequest('search', { query: 'test', max_results: 100 });

      await expect(
        handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'max_results exceeds maximum allowed value',
        expect.objectContaining({ requestId: 'test-request-id', maxResults: 100 })
      );
    });

    it('should use search_native_query parameter', async () => {
      const searchResults = [sampleCard];
      mockApiClient.request.mockResolvedValue(searchResults);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('search', { query: 'test', models: ['card'], search_native_query: true });
      await handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith(
        expect.stringContaining('search_native_query=true')
      );
    });

    it('should use include_dashboard_questions parameter', async () => {
      const searchResults = [sampleDashboard];
      mockApiClient.request.mockResolvedValue(searchResults);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('search', { query: 'test', models: ['dashboard'], include_dashboard_questions: true });
      await handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith(
        expect.stringContaining('include_dashboard_questions=true')
      );
    });

    it('should use archived parameter', async () => {
      const searchResults = [sampleCard];
      mockApiClient.request.mockResolvedValue(searchResults);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('search', { query: 'test', archived: true });
      await handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith(
        expect.stringContaining('archived=true')
      );
    });

    it('should use verified parameter', async () => {
      const searchResults = [sampleCard];
      mockApiClient.request.mockResolvedValue(searchResults);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('search', { query: 'test', verified: true });
      await handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith(
        expect.stringContaining('verified=true')
      );
    });
  });

  describe('Logging', () => {
    it('should log debug information', async () => {
      const searchResults = [sampleCard];
      mockApiClient.request.mockResolvedValue(searchResults);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('search', { query: 'test' });
      await handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logDebug).toHaveBeenCalledWith(
        'Search with query: "test", models: card, dashboard'
      );
    });

    it('should log success information', async () => {
      const searchResults = [sampleCard];
      mockApiClient.request.mockResolvedValue(searchResults);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('search', { query: 'test' });
      await handleSearch(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logInfo).toHaveBeenCalledWith(
        expect.stringContaining('Search found 1 items')
      );
    });
  });
});
