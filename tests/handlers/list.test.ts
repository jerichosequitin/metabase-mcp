/**
 * Unit tests for the list handler
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleList } from '../../src/handlers/list/index.js';
import { McpError } from '../../src/types/core.js';
import {
  mockApiClient,
  mockLogger,
  resetAllMocks,
  createMockRequest,
  createCachedResponse,
  getLoggerFunctions,
  sampleCard,
  sampleDashboard,
  sampleTable,
  sampleDatabase,
  sampleCollection
} from '../setup.js';

describe('handleList', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Parameter validation', () => {
    it('should throw error when model parameter is missing', async () => {
      const request = createMockRequest('list', {});
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Missing or invalid model parameter in list request',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when model parameter is invalid', async () => {
      const request = createMockRequest('list', { model: 'invalid-model' });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Invalid model parameter: invalid-model',
        expect.objectContaining({ 
          requestId: 'test-request-id',
          validValues: expect.any(Array)
        })
      );
    });

    it('should throw error when model parameter is not a string', async () => {
      const request = createMockRequest('list', { model: 123 });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Missing or invalid model parameter in list request',
        { requestId: 'test-request-id' }
      );
    });
  });

  describe('Cards listing', () => {
    it('should successfully list cards', async () => {
      const mockCards = [sampleCard];
      mockApiClient.getCardsList.mockResolvedValue(createCachedResponse(mockCards));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'cards' });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getCardsList).toHaveBeenCalled();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Test Card');
    });

    it('should handle empty cards list', async () => {
      mockApiClient.getCardsList.mockResolvedValue(createCachedResponse([]));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'cards' });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.total_items).toBe(0);
    });

    it('should handle API errors for cards', async () => {
      const apiError = new Error('API Error');
      mockApiClient.getCardsList.mockRejectedValue(apiError);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'cards' });

      await expect(
        handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow();
    });
  });

  describe('Dashboards listing', () => {
    it('should successfully list dashboards', async () => {
      const mockDashboards = [sampleDashboard];
      mockApiClient.getDashboardsList.mockResolvedValue(createCachedResponse(mockDashboards));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'dashboards' });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getDashboardsList).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Test Dashboard');
    });

    it('should handle empty dashboards list', async () => {
      mockApiClient.getDashboardsList.mockResolvedValue(createCachedResponse([]));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'dashboards' });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.total_items).toBe(0);
    });
  });

  describe('Tables listing', () => {
    it('should successfully list tables', async () => {
      const mockTables = [sampleTable];
      mockApiClient.getTablesList.mockResolvedValue(createCachedResponse(mockTables));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'tables' });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getTablesList).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Test Table');
    });

    it('should handle empty tables list', async () => {
      mockApiClient.getTablesList.mockResolvedValue(createCachedResponse([]));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'tables' });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.total_items).toBe(0);
    });
  });

  describe('Databases listing', () => {
    it('should successfully list databases', async () => {
      const mockDatabases = [sampleDatabase];
      mockApiClient.getDatabasesList.mockResolvedValue(createCachedResponse(mockDatabases));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'databases' });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getDatabasesList).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Test Database');
    });

    it('should handle empty databases list', async () => {
      mockApiClient.getDatabasesList.mockResolvedValue(createCachedResponse([]));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'databases' });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.total_items).toBe(0);
    });
  });

  describe('Collections listing', () => {
    it('should successfully list collections', async () => {
      const mockCollections = [sampleCollection];
      mockApiClient.getCollectionsList.mockResolvedValue(createCachedResponse(mockCollections));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'collections' });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getCollectionsList).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Test Collection');
    });

    it('should handle empty collections list', async () => {
      mockApiClient.getCollectionsList.mockResolvedValue(createCachedResponse([]));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'collections' });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.total_items).toBe(0);
    });
  });

  describe('Logging', () => {
    it('should log debug information', async () => {
      mockApiClient.getCardsList.mockResolvedValue(createCachedResponse([sampleCard]));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'cards' });
      await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logDebug).toHaveBeenCalledWith('Listing cards from Metabase (all items)');
    });

    it('should log success information', async () => {
      mockApiClient.getCardsList.mockResolvedValue(createCachedResponse([sampleCard]));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'cards' });
      await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logInfo).toHaveBeenCalledWith('Successfully listed 1 cards');
    });
  });

  describe('Cache source handling', () => {
    it('should indicate cache source in response', async () => {
      mockApiClient.getCardsList.mockResolvedValue(createCachedResponse([sampleCard], 'cache'));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'cards' });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.source).toBe('cache');
    });

    it('should indicate API source in response', async () => {
      mockApiClient.getCardsList.mockResolvedValue(createCachedResponse([sampleCard], 'api'));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'cards' });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.source).toBe('api');
    });
  });

  describe('List pagination', () => {
    it('should support pagination with offset and limit for cards', async () => {
      const manyCards = Array.from({ length: 50 }, (_, i) => ({
        ...sampleCard,
        id: i + 1,
        name: `Test Card ${i + 1}`,
      }));

      mockApiClient.getCardsList.mockResolvedValue(createCachedResponse(manyCards));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { 
        model: 'cards', 
        offset: 10, 
        limit: 20 
      });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getCardsList).toHaveBeenCalled();
      
      const responseData = JSON.parse(result.content[0].text);
      
      // Check pagination metadata
      expect(responseData.pagination).toBeDefined();
      expect(responseData.pagination.total_items).toBe(50);
      expect(responseData.pagination.offset).toBe(10);
      expect(responseData.pagination.limit).toBe(20);
      expect(responseData.pagination.current_page_size).toBe(20);
      expect(responseData.pagination.has_more).toBe(true);
      expect(responseData.pagination.next_offset).toBe(30);
      
      // Check that only the requested slice of items is returned
      expect(responseData.results).toHaveLength(20);
      expect(responseData.results[0].name).toBe('Test Card 11'); // 0-based slice starting at index 10
      expect(responseData.results[19].name).toBe('Test Card 30'); // Last item in the slice
    });

    it('should handle pagination for the last page correctly', async () => {
      const cards = Array.from({ length: 25 }, (_, i) => ({
        ...sampleCard,
        id: i + 1,
        name: `Test Card ${i + 1}`,
      }));

      mockApiClient.getCardsList.mockResolvedValue(createCachedResponse(cards));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { 
        model: 'cards', 
        offset: 20, 
        limit: 20 
      });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      
      // Check pagination metadata for last page
      expect(responseData.pagination.total_items).toBe(25);
      expect(responseData.pagination.offset).toBe(20);
      expect(responseData.pagination.limit).toBe(20);
      expect(responseData.pagination.current_page_size).toBe(5); // Only 5 items left
      expect(responseData.pagination.has_more).toBe(false);
      expect(responseData.pagination.next_offset).toBeUndefined();
      
      // Check that only the remaining items are returned
      expect(responseData.results).toHaveLength(5);
      expect(responseData.results[0].name).toBe('Test Card 21');
      expect(responseData.results[4].name).toBe('Test Card 25');
    });

    it('should reject limit greater than 1000', async () => {
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { 
        model: 'cards', 
        limit: 1500 
      });

      await expect(
        handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow('Invalid parameter: limit');
    });

    it('should work without pagination parameters (backward compatibility)', async () => {
      mockApiClient.getCardsList.mockResolvedValue(createCachedResponse([sampleCard]));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'cards' });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      
      // No pagination metadata should be present
      expect(responseData.pagination).toBeUndefined();
      expect(responseData.results).toHaveLength(1);
      expect(responseData.usage_guidance).toContain('For large datasets exceeding token limits, use offset and limit parameters');
    });

    it('should include pagination guidance in usage_guidance when pagination is used', async () => {
      const cards = Array.from({ length: 10 }, (_, i) => ({
        ...sampleCard,
        id: i + 1,
        name: `Test Card ${i + 1}`,
      }));

      mockApiClient.getCardsList.mockResolvedValue(createCachedResponse(cards));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { 
        model: 'cards', 
        limit: 5 
      });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.usage_guidance).toContain('paginated overview');
      expect(responseData.usage_guidance).toContain('offset and limit parameters');
    });

    it('should accept offset of 0', async () => {
      const cards = Array.from({ length: 10 }, (_, i) => ({
        ...sampleCard,
        id: i + 1,
        name: `Test Card ${i + 1}`,
      }));

      mockApiClient.getCardsList.mockResolvedValue(createCachedResponse(cards));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { 
        model: 'cards', 
        offset: 0,
        limit: 5 
      });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.pagination.offset).toBe(0);
      expect(responseData.results).toHaveLength(5);
    });

    it('should reject negative offset', async () => {
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { 
        model: 'cards', 
        offset: -1,
        limit: 5 
      });

      await expect(
        handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow('offset must be non-negative');
    });

    it('should accept exact limit boundary value of 1000', async () => {
      const cards = Array.from({ length: 1000 }, (_, i) => ({
        ...sampleCard,
        id: i + 1,
        name: `Test Card ${i + 1}`,
      }));

      mockApiClient.getCardsList.mockResolvedValue(createCachedResponse(cards));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { 
        model: 'cards', 
        limit: 1000 
      });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.pagination.limit).toBe(1000);
      expect(responseData.results).toHaveLength(1000);
    });

    it('should reject non-numeric offset parameter', async () => {
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { 
        model: 'cards', 
        offset: 'invalid',
        limit: 5 
      });

      await expect(
        handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow('offset must be a number');
    });

    it('should reject non-numeric limit parameter', async () => {
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { 
        model: 'cards', 
        limit: 'invalid'
      });

      await expect(
        handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow('limit must be a number');
    });
  });
});
