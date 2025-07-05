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

      expect(result.content[0].text).toContain('total_items": 0');
    });

    it('should handle API errors for cards', async () => {
      const apiError = new Error('API Error');
      mockApiClient.getCardsList.mockRejectedValue(apiError);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'cards' });

      await expect(
        handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);
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

      expect(result.content[0].text).toContain('total_items": 0');
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

      expect(result.content[0].text).toContain('total_items": 0');
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

      expect(result.content[0].text).toContain('total_items": 0');
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

      expect(result.content[0].text).toContain('total_items": 0');
    });
  });

  describe('Logging', () => {
    it('should log debug information', async () => {
      mockApiClient.getCardsList.mockResolvedValue(createCachedResponse([sampleCard]));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'cards' });
      await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logDebug).toHaveBeenCalledWith('Listing cards from Metabase');
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

      expect(result.content[0].text).toContain('"source": "cache"');
    });

    it('should indicate API source in response', async () => {
      mockApiClient.getCardsList.mockResolvedValue(createCachedResponse([sampleCard], 'api'));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('list', { model: 'cards' });
      const result = await handleList(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(result.content[0].text).toContain('"source": "api"');
    });
  });
});
