/**
 * Unit tests for the clearCache handler
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleClearCache } from '../../src/handlers/clearCache.js';
import { McpError } from '../../src/types/core.js';
import {
  mockApiClient,
  mockLogger,
  resetAllMocks,
  createMockRequest
} from '../setup.js';

describe('handleClearCache', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Parameter validation', () => {
    it('should throw error when cache_type is invalid', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'invalid' });

      expect(() => {
        handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);
      }).toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Invalid cache_type parameter: invalid',
        expect.objectContaining({ 
          requestId: 'clearCache',
          validValues: expect.any(Array) 
        })
      );
    });
  });

  describe('Cache clearing functionality', () => {
    it('should successfully clear cards cache', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'cards' });
      const result = handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(mockApiClient.clearCardsCache).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Cards cache cleared successfully');
      expect(result.content[0].text).toContain('cards_cache_empty');
    });

    it('should successfully clear dashboards cache', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'dashboards' });
      const result = handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(mockApiClient.clearDashboardsCache).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Dashboards cache cleared successfully');
    });

    it('should successfully clear tables cache', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'tables' });
      const result = handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(mockApiClient.clearTablesCache).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Tables cache cleared successfully');
    });

    it('should successfully clear databases cache', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'databases' });
      const result = handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(mockApiClient.clearDatabasesCache).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Databases cache cleared successfully');
    });

    it('should successfully clear collections cache', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'collections' });
      const result = handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(mockApiClient.clearCollectionsCache).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Collections cache cleared successfully');
    });

    it('should successfully clear fields cache', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'fields' });
      const result = handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(mockApiClient.clearFieldsCache).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Fields cache cleared successfully');
    });

    it('should successfully clear cards-list cache', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'cards-list' });
      const result = handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(mockApiClient.clearCardsListCache).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Cards list cache cleared successfully');
    });

    it('should successfully clear dashboards-list cache', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'dashboards-list' });
      const result = handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(mockApiClient.clearDashboardsListCache).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Dashboards list cache cleared successfully');
    });

    it('should successfully clear tables-list cache', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'tables-list' });
      const result = handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(mockApiClient.clearTablesListCache).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Tables list cache cleared successfully');
    });

    it('should successfully clear databases-list cache', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'databases-list' });
      const result = handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(mockApiClient.clearDatabasesListCache).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Databases list cache cleared successfully');
    });

    it('should successfully clear collections-list cache', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'collections-list' });
      const result = handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(mockApiClient.clearCollectionsListCache).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Collections list cache cleared successfully');
    });

    it('should successfully clear all-lists cache', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'all-lists' });
      const result = handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(mockApiClient.clearListCaches).toHaveBeenCalled();
      expect(result.content[0].text).toContain('All list caches cleared successfully');
    });

    it('should successfully clear all-individual cache', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'all-individual' });
      const result = handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(mockApiClient.clearCardsCache).toHaveBeenCalled();
      expect(mockApiClient.clearDashboardsCache).toHaveBeenCalled();
      expect(mockApiClient.clearTablesCache).toHaveBeenCalled();
      expect(mockApiClient.clearDatabasesCache).toHaveBeenCalled();
      expect(mockApiClient.clearCollectionsCache).toHaveBeenCalled();
      expect(mockApiClient.clearFieldsCache).toHaveBeenCalled();
      expect(result.content[0].text).toContain('All individual item caches cleared successfully');
    });
  });

  describe('Default values', () => {
    it('should use "all" as default cache_type when not specified', () => {
      const request = createMockRequest('clear_cache', {});
      const result = handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(mockApiClient.clearAllCache).toHaveBeenCalled();
      expect(result.content[0].text).toContain('All caches cleared successfully');
    });
  });

  describe('Response formatting', () => {
    it('should include cache information in response', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'cards' });
      const result = handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(result.content[0].text).toContain('cache_type');
      expect(result.content[0].text).toContain('cache_status');
      expect(result.content[0].text).toContain('next_fetch_will_be');
      expect(result.content[0].text).toContain('cache_info');
    });

    it('should include cache explanation in response', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'all' });
      const result = handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(result.content[0].text).toContain('Unified cache system');
      expect(result.content[0].text).toContain('individual');
      expect(result.content[0].text).toContain('lists');
    });
  });

  describe('Logging', () => {
    it('should log success information', () => {
      const request = createMockRequest('clear_cache', { cache_type: 'cards' });
      handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);

      expect(mockLogger.logInfo).toHaveBeenCalledWith(
        'Cards cache cleared successfully (individual items only)'
      );
    });
  });

  describe('Valid cache types', () => {
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
    ];

    validCacheTypes.forEach(cacheType => {
      it(`should accept valid cache_type: ${cacheType}`, () => {
        const request = createMockRequest('clear_cache', { cache_type: cacheType });

        expect(() => {
          handleClearCache(request, mockApiClient as any, mockLogger.logInfo, mockLogger.logWarn, mockLogger.logError);
        }).not.toThrow();
      });
    });
  });
});
