/**
 * Unit tests for the retrieve handler
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleRetrieve } from '../../src/handlers/retrieve/index.js';
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
  sampleCollection,
  sampleField
} from '../setup.js';

describe('handleRetrieve', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Parameter validation', () => {
    it('should throw error when model parameter is missing', async () => {
      const request = createMockRequest('retrieve', { ids: [1] });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Missing model parameter in retrieve request',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when ids parameter is missing', async () => {
      const request = createMockRequest('retrieve', { model: 'card' });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Missing or invalid ids parameter in retrieve request',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when ids parameter is empty array', async () => {
      const request = createMockRequest('retrieve', { model: 'card', ids: [] });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Missing or invalid ids parameter in retrieve request',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when model is invalid', async () => {
      const request = createMockRequest('retrieve', { model: 'invalid-model', ids: [1] });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Invalid model parameter: invalid-model',
        expect.objectContaining({ 
          requestId: 'test-request-id',
          validValues: expect.any(Array)
        })
      );
    });

    it('should throw error when too many IDs are requested', async () => {
      const tooManyIds = Array.from({ length: 101 }, (_, i) => i + 1); // Assuming MAX_IDS_PER_REQUEST is 100
      const request = createMockRequest('retrieve', { model: 'card', ids: tooManyIds });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('Too many IDs requested'),
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when ID is not a positive integer', async () => {
      const request = createMockRequest('retrieve', { model: 'card', ids: [0] });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Invalid id parameter - must be a positive number',
        expect.objectContaining({ 
          requestId: 'test-request-id',
          value: 0
        })
      );
    });
  });

  describe('Card retrieval', () => {
    it('should successfully retrieve cards', async () => {
      mockApiClient.getCard.mockResolvedValue(createCachedResponse(sampleCard));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids: [1] });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getCard).toHaveBeenCalledWith(1);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Test Card');
    });

    it('should handle multiple card IDs', async () => {
      mockApiClient.getCard.mockResolvedValue(createCachedResponse(sampleCard));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids: [1, 2] });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getCard).toHaveBeenCalledTimes(2);
      expect(mockApiClient.getCard).toHaveBeenCalledWith(1);
      expect(mockApiClient.getCard).toHaveBeenCalledWith(2);
      expect(result.content[0].text).toContain('successful_retrievals');
    });

    it('should handle API errors for card retrieval', async () => {
      const apiError = new Error('API Error');
      mockApiClient.getCard.mockRejectedValue(apiError);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids: [1] });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getCard).toHaveBeenCalledWith(1);
      expect(result.content[0].text).toContain('failed_retrievals');
      expect(result.content[0].text).toContain('API Error');
    });
  });

  describe('Dashboard retrieval', () => {
    it('should successfully retrieve dashboards', async () => {
      mockApiClient.getDashboard.mockResolvedValue(createCachedResponse(sampleDashboard));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'dashboard', ids: [1] });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getDashboard).toHaveBeenCalledWith(1);
      expect(result.content[0].text).toContain('Test Dashboard');
    });
  });

  describe('Table retrieval', () => {
    it('should successfully retrieve tables', async () => {
      mockApiClient.getTable.mockResolvedValue(createCachedResponse(sampleTable));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'table', ids: [1] });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getTable).toHaveBeenCalledWith(1);
      expect(result.content[0].text).toContain('Test Table');
    });
  });

  describe('Database retrieval', () => {
    it('should successfully retrieve databases', async () => {
      mockApiClient.getDatabase.mockResolvedValue(createCachedResponse(sampleDatabase));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'database', ids: [1] });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getDatabase).toHaveBeenCalledWith(1);
      expect(result.content[0].text).toContain('Test Database');
    });
  });

  describe('Collection retrieval', () => {
    it('should successfully retrieve collections', async () => {
      mockApiClient.getCollection.mockResolvedValue(createCachedResponse(sampleCollection));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'collection', ids: [1] });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getCollection).toHaveBeenCalledWith(1);
      expect(result.content[0].text).toContain('Test Collection');
    });
  });

  describe('Field retrieval', () => {
    it('should successfully retrieve fields', async () => {
      mockApiClient.getField.mockResolvedValue(createCachedResponse(sampleField));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'field', ids: [1] });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getField).toHaveBeenCalledWith(1);
      expect(result.content[0].text).toContain('successful_retrievals');
      expect(result.content[0].text).toContain('Test Field');
    });
  });

  describe('Logging', () => {
    it('should log debug information', async () => {
      mockApiClient.getCard.mockResolvedValue(createCachedResponse(sampleCard));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids: [1] });
      await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logDebug).toHaveBeenCalledWith('Retrieving card details for IDs: 1');
    });

    it('should log success information', async () => {
      mockApiClient.getCard.mockResolvedValue(sampleCard);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids: [1] });
      await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logInfo).toHaveBeenCalledWith(
        'Successfully retrieved 1 cards (source: api)'
      );
    });
  });

  describe('Cache source handling', () => {
    it('should indicate cache source in response', async () => {
      mockApiClient.getCard.mockResolvedValue(createCachedResponse(sampleCard, 'cache'));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids: [1] });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(result.content[0].text).toContain('"primary_source": "cache"');
    });

    it('should indicate API source in response', async () => {
      mockApiClient.getCard.mockResolvedValue(sampleCard);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids: [1] });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(result.content[0].text).toContain('"primary_source": "api"');
    });
  });
});
