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
  sampleCollectionItems,
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

    it('should throw error when too many IDs are requested for cards', async () => {
      const tooManyIds = Array.from({ length: 51 }, (_, i) => i + 1); // MAX_IDS_PER_REQUEST is 50
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

    it('should throw error when too many database IDs are requested', async () => {
      const tooManyIds = Array.from({ length: 3 }, (_, i) => i + 1); // MAX_DATABASE_IDS_PER_REQUEST is 2
      const request = createMockRequest('retrieve', { model: 'database', ids: tooManyIds });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('Too many IDs requested: 3. Maximum allowed for database: 2'),
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when too many IDs are requested for dashboards', async () => {
      const tooManyIds = Array.from({ length: 51 }, (_, i) => i + 1); // MAX_IDS_PER_REQUEST is 50
      const request = createMockRequest('retrieve', { model: 'dashboard', ids: tooManyIds });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('Too many IDs requested'),
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when too many IDs are requested for tables', async () => {
      const tooManyIds = Array.from({ length: 51 }, (_, i) => i + 1); // MAX_IDS_PER_REQUEST is 50
      const request = createMockRequest('retrieve', { model: 'table', ids: tooManyIds });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('Too many IDs requested'),
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when too many IDs are requested for collections', async () => {
      const tooManyIds = Array.from({ length: 51 }, (_, i) => i + 1); // MAX_IDS_PER_REQUEST is 50
      const request = createMockRequest('retrieve', { model: 'collection', ids: tooManyIds });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('Too many IDs requested'),
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when too many IDs are requested for fields', async () => {
      const tooManyIds = Array.from({ length: 51 }, (_, i) => i + 1); // MAX_IDS_PER_REQUEST is 50
      const request = createMockRequest('retrieve', { model: 'field', ids: tooManyIds });
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
      
      // When all requests fail, it should now throw an error instead of returning partial success
      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow();

      expect(mockApiClient.getCard).toHaveBeenCalledWith(1);
    });

    it('should handle partial failures (some succeed, some fail)', async () => {
      const sampleCard = { id: 1, name: 'Test Card' };
      const apiError = new Error('API Error');
      
      // First call succeeds, second fails
      mockApiClient.getCard
        .mockResolvedValueOnce(createCachedResponse(sampleCard))
        .mockRejectedValueOnce(apiError);
        
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids: [1, 2] });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getCard).toHaveBeenCalledTimes(2);
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.successful_retrievals).toBe(1);
      expect(responseData.failed_retrievals).toBe(1);
    });

    it('should include values_source_type and values_source_config in card parameters', async () => {
      const cardWithParameters = {
        ...sampleCard,
        parameters: [
          {
            id: 'param1',
            name: 'Test Parameter',
            type: 'category',
            slug: 'test_param',
            target: ['dimension', ['template-tag', 'test_param']],
            values_source_type: 'static-list',
            values_source_config: {
              values: ['option1', 'option2', 'option3']
            }
          },
          {
            id: 'param2',
            name: 'Simple Parameter',
            type: 'text',
            slug: 'simple_param',
            target: ['dimension', ['template-tag', 'simple_param']]
            // No values_source_type or values_source_config
          }
        ]
      };
      
      mockApiClient.getCard.mockResolvedValue(createCachedResponse(cardWithParameters));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids: [1] });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(result.content).toHaveLength(1);
      const responseData = JSON.parse(result.content[0].text);
      
      // Check that optimized card includes parameters
      expect(responseData.results).toHaveLength(1);
      const optimizedCard = responseData.results[0];
      expect(optimizedCard.parameters).toHaveLength(2);
      
      // Check first parameter has values source information
      const param1 = optimizedCard.parameters.find((p: any) => p.id === 'param1');
      expect(param1).toBeDefined();
      expect(param1.values_source_type).toBe('static-list');
      expect(param1.values_source_config).toEqual({
        values: ['option1', 'option2', 'option3']
      });
      
      // Check second parameter doesn't have values source information
      const param2 = optimizedCard.parameters.find((p: any) => p.id === 'param2');
      expect(param2).toBeDefined();
      expect(param2.values_source_type).toBeUndefined();
      expect(param2.values_source_config).toBeUndefined();
    });
  });

  describe('Database retrieval', () => {
    it('should handle database not found error correctly', async () => {
      // Mock a 404 error with enhanced error details for non-existent database
      const mockError = {
        details: {
          category: 'resource_not_found',
          httpStatus: 404,
          retryable: false
        },
        message: 'database not found: 999'
      };
      Object.setPrototypeOf(mockError, McpError.prototype);
      
      mockApiClient.getDatabase.mockRejectedValue(mockError);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'database', ids: [999] });
      
      // Should throw a proper resource not found error, not a database connection error
      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow('database not found');

      expect(mockApiClient.getDatabase).toHaveBeenCalledWith(999);
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

    it('should support table pagination for large databases', async () => {
      const largeDatabaseWithTables = {
        ...sampleDatabase,
        tables: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          name: `table_${i + 1}`,
          display_name: `Table ${i + 1}`,
          schema: 'public',
          active: true,
          db_id: 1,
          field_order: 'database',
          is_upload: false,
          initial_sync_status: 'complete',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        }))
      };

      mockApiClient.getDatabase.mockResolvedValue(createCachedResponse(largeDatabaseWithTables));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { 
        model: 'database', 
        ids: [1], 
        table_offset: 10, 
        table_limit: 20 
      });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getDatabase).toHaveBeenCalledWith(1);
      
      const responseData = JSON.parse(result.content[0].text);
      const database = responseData.results[0];
      
      // Check pagination metadata
      expect(database.pagination).toBeDefined();
      expect(database.pagination.total_tables).toBe(50);
      expect(database.pagination.table_offset).toBe(10);
      expect(database.pagination.table_limit).toBe(20);
      expect(database.pagination.current_page_size).toBe(20);
      expect(database.pagination.has_more).toBe(true);
      expect(database.pagination.next_offset).toBe(30);
      
      // Check that only the requested slice of tables is returned
      expect(database.tables).toHaveLength(20);
      expect(database.tables[0].name).toBe('table_11'); // 0-based slice starting at index 10
      expect(database.tables[19].name).toBe('table_30'); // Last item in the slice
    });

    it('should handle pagination for the last page correctly', async () => {
      const largeDatabaseWithTables = {
        ...sampleDatabase,
        tables: Array.from({ length: 25 }, (_, i) => ({
          id: i + 1,
          name: `table_${i + 1}`,
          display_name: `Table ${i + 1}`,
          schema: 'public',
          active: true,
          db_id: 1,
          field_order: 'database',
          is_upload: false,
          initial_sync_status: 'complete',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        }))
      };

      mockApiClient.getDatabase.mockResolvedValue(createCachedResponse(largeDatabaseWithTables));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { 
        model: 'database', 
        ids: [1], 
        table_offset: 20, 
        table_limit: 20 
      });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      const database = responseData.results[0];
      
      // Check pagination metadata for last page
      expect(database.pagination.total_tables).toBe(25);
      expect(database.pagination.table_offset).toBe(20);
      expect(database.pagination.table_limit).toBe(20);
      expect(database.pagination.current_page_size).toBe(5); // Only 5 tables left
      expect(database.pagination.has_more).toBe(false);
      expect(database.pagination.next_offset).toBeUndefined();
      
      // Check that only the remaining tables are returned
      expect(database.tables).toHaveLength(5);
      expect(database.tables[0].name).toBe('table_21');
      expect(database.tables[4].name).toBe('table_25');
    });

    it('should reject pagination parameters for non-database models', async () => {
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { 
        model: 'card', 
        ids: [1], 
        table_offset: 0, 
        table_limit: 10 
      });

      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow('Invalid parameter: table_offset/table_limit');
    });

    it('should reject table_limit greater than 100', async () => {
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { 
        model: 'database', 
        ids: [1], 
        table_limit: 150 
      });

      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow('Invalid parameter: table_limit');
    });

    it('should include pagination guidance in usage_guidance when pagination is used', async () => {
      const largeDatabaseWithTables = {
        ...sampleDatabase,
        tables: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          name: `table_${i + 1}`,
          display_name: `Table ${i + 1}`,
          schema: 'public',
          active: true,
          db_id: 1,
          field_order: 'database',
          is_upload: false,
          initial_sync_status: 'complete',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        }))
      };

      mockApiClient.getDatabase.mockResolvedValue(createCachedResponse(largeDatabaseWithTables));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { 
        model: 'database', 
        ids: [1], 
        table_limit: 5 
      });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.usage_guidance).toContain('paginated table information');
      expect(responseData.usage_guidance).toContain('table_offset and table_limit parameters');
    });

    it('should accept table_offset of 0 for database pagination', async () => {
      const largeDatabaseWithTables = {
        ...sampleDatabase,
        tables: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          name: `table_${i + 1}`,
          display_name: `Table ${i + 1}`,
          schema: 'public',
          active: true,
          db_id: 1,
          field_order: 'database',
          is_upload: false,
          initial_sync_status: 'complete',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        }))
      };

      mockApiClient.getDatabase.mockResolvedValue(createCachedResponse(largeDatabaseWithTables));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { 
        model: 'database', 
        ids: [1], 
        table_offset: 0,
        table_limit: 5 
      });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      const database = responseData.results[0];
      expect(database.pagination.table_offset).toBe(0);
      expect(database.tables).toHaveLength(5);
    });

    it('should reject negative table_offset for database pagination', async () => {
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { 
        model: 'database', 
        ids: [1], 
        table_offset: -1,
        table_limit: 5 
      });

      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow('table_offset must be non-negative');
    });

    it('should reject non-numeric table_offset for database pagination', async () => {
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { 
        model: 'database', 
        ids: [1], 
        table_offset: 'invalid',
        table_limit: 5 
      });

      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow('table_offset must be a number');
    });

    it('should reject non-numeric table_limit for database pagination', async () => {
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { 
        model: 'database', 
        ids: [1], 
        table_limit: 'invalid'
      });

      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow('table_limit must be a number');
    });

    it('should accept exact table_limit boundary value of 100', async () => {
      const largeDatabaseWithTables = {
        ...sampleDatabase,
        tables: Array.from({ length: 200 }, (_, i) => ({
          id: i + 1,
          name: `table_${i + 1}`,
          display_name: `Table ${i + 1}`,
          schema: 'public',
          active: true,
          db_id: 1,
          field_order: 'database',
          is_upload: false,
          initial_sync_status: 'complete',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        }))
      };

      mockApiClient.getDatabase.mockResolvedValue(createCachedResponse(largeDatabaseWithTables));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { 
        model: 'database', 
        ids: [1], 
        table_limit: 100 
      });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      const database = responseData.results[0];
      expect(database.pagination.table_limit).toBe(100);
      expect(database.tables).toHaveLength(100);
    });
  });

  describe('Collection retrieval', () => {
    it('should successfully retrieve collections with items', async () => {
      mockApiClient.getCollection.mockResolvedValue(createCachedResponse(sampleCollection));
      mockApiClient.getCollectionItems.mockResolvedValue(createCachedResponse(sampleCollectionItems));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'collection', ids: [1] });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.getCollection).toHaveBeenCalledWith(1);
      expect(mockApiClient.getCollectionItems).toHaveBeenCalledWith(1);
      expect(result.content[0].text).toContain('Test Collection');
      
      // Check that items are included and organized by type
      const response = JSON.parse(result.content[0].text);
      const collections = response.results;
      expect(collections).toHaveLength(1);
      expect(collections[0].items).toBeDefined();
      expect(collections[0].items.total_count).toBe(3);
      expect(collections[0].items.cards).toHaveLength(1);
      expect(collections[0].items.dashboards).toHaveLength(1);
      expect(collections[0].items.collections).toHaveLength(1);
      expect(collections[0].items.cards[0].name).toBe('Marketing Report');
      expect(collections[0].items.dashboards[0].name).toBe('Marketing Dashboard');
      expect(collections[0].items.collections[0].name).toBe('Campaigns');
    });

    it('should retrieve collections without items when getCollectionItems fails', async () => {
      mockApiClient.getCollection.mockResolvedValue(createCachedResponse(sampleCollection));
      mockApiClient.getCollectionItems.mockRejectedValue(new Error('Items not accessible'));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'collection', ids: [1] });
      
      // This should fail completely since we're using Promise.all
      await expect(
        handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow();

      expect(mockApiClient.getCollection).toHaveBeenCalledWith(1);
      expect(mockApiClient.getCollectionItems).toHaveBeenCalledWith(1);
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

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.source.cache).toBe(1);
      expect(responseData.source.api).toBe(0);
    });

    it('should indicate API source in response', async () => {
      mockApiClient.getCard.mockResolvedValue(sampleCard);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids: [1] });
      const result = await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.source.cache).toBe(0);
      expect(responseData.source.api).toBe(1);
    });
  });

  describe('Optimization levels', () => {
    it('should use STANDARD optimization for small requests (≤9 items)', async () => {
      mockApiClient.getCard.mockResolvedValue(createCachedResponse(sampleCard));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids: [1, 2, 3] });
      await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logDebug).toHaveBeenCalledWith(
        expect.stringContaining('optimization level: standard')
      );
    });

    it('should use AGGRESSIVE optimization for medium requests (10-24 items)', async () => {
      const ids = Array.from({ length: 15 }, (_, i) => i + 1);
      mockApiClient.getCard.mockResolvedValue(createCachedResponse(sampleCard));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids });
      await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logDebug).toHaveBeenCalledWith(
        expect.stringContaining('optimization level: aggressive')
      );
    });

    it('should use ULTRA_MINIMAL optimization for large requests (≥25 items)', async () => {
      const ids = Array.from({ length: 30 }, (_, i) => i + 1);
      mockApiClient.getCard.mockResolvedValue(createCachedResponse(sampleCard));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids });
      await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logDebug).toHaveBeenCalledWith(
        expect.stringContaining('optimization level: ultra_minimal')
      );
    });
  });

  describe('Response size monitoring', () => {
    it('should log warning for very large responses (>20k estimated tokens)', async () => {
      // Create a large card response that would generate many tokens
      const largeCard = {
        ...sampleCard,
        description: 'A'.repeat(10000), // Large description to increase response size
        parameters: Array.from({ length: 20 }, (_, i) => ({
          id: `param${i}`,
          name: `Parameter ${i}`,
          type: 'category',
          slug: `param_${i}`,
          target: ['dimension', ['template-tag', `param_${i}`]],
          values_source_type: 'static-list',
          values_source_config: {
            values: Array.from({ length: 50 }, (_, j) => `option${i}_${j}`)
          }
        }))
      };

      const ids = Array.from({ length: 30 }, (_, i) => i + 1);
      mockApiClient.getCard.mockResolvedValue(createCachedResponse(largeCard));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids });
      await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('Large response detected'),
        expect.objectContaining({
          requestId: 'test-request-id',
          responseSize: expect.any(Number),
          estimatedTokens: expect.any(Number),
          optimizationLevel: expect.any(String),
          itemCount: 30
        })
      );
    });

    it('should log debug message for moderate responses (15k-20k estimated tokens)', async () => {
      // Create a moderately sized response
      const moderateCard = {
        ...sampleCard,
        description: 'A'.repeat(2000),
        parameters: Array.from({ length: 10 }, (_, i) => ({
          id: `param${i}`,
          name: `Parameter ${i}`,
          type: 'category',
          slug: `param_${i}`,
          target: ['dimension', ['template-tag', `param_${i}`]]
        }))
      };

      const ids = Array.from({ length: 15 }, (_, i) => i + 1);
      mockApiClient.getCard.mockResolvedValue(createCachedResponse(moderateCard));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids });
      await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      // Check for the moderate response size debug log
      const debugCalls = mockLogger.logDebug.mock.calls;
      const moderateResponseLog = debugCalls.find(call => 
        call[0] && call[0].includes('Moderate response size')
      );
      
      if (moderateResponseLog) {
        expect(moderateResponseLog[1]).toEqual(
          expect.objectContaining({
            requestId: 'test-request-id',
            responseSize: expect.any(Number),
            estimatedTokens: expect.any(Number),
            optimizationLevel: expect.any(String)
          })
        );
      }
    });
  });

  describe('Concurrency control', () => {
    it('should use full concurrency for small requests (≤3 items)', async () => {
      mockApiClient.getCard.mockResolvedValue(createCachedResponse(sampleCard));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids: [1, 2, 3] });
      await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logDebug).toHaveBeenCalledWith(
        expect.stringContaining('concurrency limit: 3')
      );
    });

    it('should use moderate batching for medium requests (4-20 items)', async () => {
      const ids = Array.from({ length: 10 }, (_, i) => i + 1);
      mockApiClient.getCard.mockResolvedValue(createCachedResponse(sampleCard));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids });
      await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logDebug).toHaveBeenCalledWith(
        expect.stringContaining('concurrency limit: 8')
      );
    });

    it('should use conservative batching for large requests (21-50 items)', async () => {
      const ids = Array.from({ length: 25 }, (_, i) => i + 1);
      mockApiClient.getCard.mockResolvedValue(createCachedResponse(sampleCard));
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('retrieve', { model: 'card', ids });
      await handleRetrieve(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logDebug).toHaveBeenCalledWith(
        expect.stringContaining('concurrency limit: 5')
      );
    });
  });
});
