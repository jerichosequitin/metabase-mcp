/**
 * Unit tests for the executeQuery handler
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleExecute } from '../../src/handlers/execute/index.js';
import { McpError } from '../../src/types/core.js';
import {
  mockApiClient,
  mockLogger,
  resetAllMocks,
  createMockRequest,
  getLoggerFunctions,
  sampleQueryResult
} from '../setup.js';

describe('handleExecute (execute command)', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Parameter validation', () => {
    it('should throw error when neither database_id nor card_id is provided', async () => {
      const request = createMockRequest('execute', {});
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Missing required parameters: either card_id or database_id must be provided',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when both database_id and card_id are provided', async () => {
      const request = createMockRequest('execute', { database_id: 1, card_id: 2 });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Both card_id and database_id provided - only one is allowed',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when card execution mode has SQL parameters', async () => {
      const request = createMockRequest('execute', { 
        card_id: 1, 
        query: 'SELECT * FROM users',
        native_parameters: [{ name: 'param1', value: 'test' }]
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Invalid parameters for card execution mode',
        expect.objectContaining({
          requestId: 'test-request-id',
          invalidParams: expect.objectContaining({
            query: 'provided',
            native_parameters: 'provided'
          })
        })
      );
    });

    it('should throw error when SQL execution mode has card parameters', async () => {
      const request = createMockRequest('execute', { 
        database_id: 1, 
        query: 'SELECT * FROM users',
        card_parameters: [{ name: 'param1', value: 'test' }]
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Invalid parameters for SQL execution mode',
        expect.objectContaining({
          requestId: 'test-request-id',
          invalidParams: expect.objectContaining({
            card_parameters: 'provided'
          })
        })
      );
    });

    it('should throw error when card execution mode has database_id', async () => {
      const request = createMockRequest('execute', { 
        card_id: 1, 
        database_id: 2
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Both card_id and database_id provided - only one is allowed',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when database_id is provided but query is missing', async () => {
      const request = createMockRequest('execute', { database_id: 1 });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Missing or invalid query parameter in execute request',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when query parameter is not a string', async () => {
      const request = createMockRequest('execute', { database_id: 1, query: 123 });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Missing or invalid query parameter in execute request',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when card_id is not a number', async () => {
      const request = createMockRequest('execute', { card_id: 'not-a-number' });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Invalid card_id parameter - must be a number',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when row_limit is too small', async () => {
      const request = createMockRequest('execute', {
        database_id: 1,
        query: 'SELECT 1',
        row_limit: 0
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Invalid row_limit parameter: 0. Must be between 1 and 2000.',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when row_limit is too large', async () => {
      const request = createMockRequest('execute', {
        database_id: 1,
        query: 'SELECT 1',
        row_limit: 3000
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Invalid row_limit parameter: 3000. Must be between 1 and 2000.',
        { requestId: 'test-request-id' }
      );
    });
  });

  describe('Card parameter validation', () => {
    it('should throw error when card_parameters has invalid format - missing required fields', async () => {
      const request = createMockRequest('execute', {
        card_id: 1,
        card_parameters: [
          { id: 'test-id', slug: 'test-param' } // missing target, type, value
        ]
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('Missing required field \'target\''),
        expect.objectContaining({ requestId: 'test-request-id' })
      );
    });

    it('should throw error when card_parameters has invalid target structure', async () => {
      const request = createMockRequest('execute', {
        card_id: 1,
        card_parameters: [
          {
            id: 'test-id',
            slug: 'test-param',
            target: ['dimension'], // missing second element
            type: 'text',
            value: 'test-value'
          }
        ]
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid \'target\' field'),
        expect.objectContaining({ requestId: 'test-request-id' })
      );
    });

    it('should throw error when card_parameters has invalid value type', async () => {
      const request = createMockRequest('execute', {
        card_id: 1,
        card_parameters: [
          {
            id: 'test-id',
            slug: 'test-param',
            target: ['dimension', ['template-tag', 'test-param']],
            type: 'text',
            value: null // invalid value type
          }
        ]
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid \'value\' field'),
        expect.objectContaining({ requestId: 'test-request-id' })
      );
    });

    it('should accept valid card_parameters format', async () => {
      const request = createMockRequest('execute', {
        card_id: 1,
        card_parameters: [
          {
            id: 'b86c100e-87cb-09d6-7c33-e58cd2cdbcb2',
            slug: 'user_id',
            target: ['dimension', ['template-tag', 'user_id']],
            type: 'id',
            value: '12345'
          },
          {
            id: '1646c8b5-b9fb-32db-c198-7685b3f793d8',
            slug: 'date_range',
            target: ['dimension', ['template-tag', 'date_range']],
            type: 'date/all-options',
            value: '2025-01-01~2025-12-31'
          }
        ],
        row_limit: 100
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      // Mock the card execution
      mockApiClient.getCard.mockResolvedValueOnce({
        data: { id: 1, name: 'Test Card' },
        source: 'api',
        fetchTime: 100
      });

      const mockResponse = {
        "0": { first_name: 'John', last_name: 'Doe' },
        "1": { first_name: 'Jane', last_name: 'Smith' },
        data: {
          rows: [['John', 'Doe'], ['Jane', 'Smith']],
          cols: [{ name: 'first_name' }, { name: 'last_name' }]
        }
      };
      mockApiClient.request.mockResolvedValueOnce(mockResponse);

      const result = await handleExecute(
        request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError
      );

      expect(result.content).toHaveLength(1);
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.success).toBe(true);
      expect(responseData.card_id).toBe(1);
    });

    it('should throw error when card_parameters has empty string values', async () => {
      const request = createMockRequest('execute', {
        card_id: 1,
        card_parameters: [
          {
            id: 'test-id',
            slug: 'test-param',
            target: ['dimension', ['template-tag', 'test-param']],
            type: 'text',
            value: '' // empty string
          }
        ]
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('string value cannot be empty'),
        expect.objectContaining({ requestId: 'test-request-id' })
      );
    });
  });

  describe('Query execution', () => {
    it('should successfully execute a simple query', async () => {
      mockApiClient.request.mockResolvedValue(sampleQueryResult);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('execute', {
        database_id: 1,
        query: 'SELECT * FROM users'
      });

      const result = await handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/dataset', {
        method: 'POST',
        body: JSON.stringify({
          type: 'native',
          native: {
            query: 'SELECT * FROM users LIMIT 500',
            template_tags: {},
          },
          parameters: [],
          database: 1,
        }),
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('success');
    });

    it('should use custom row limit', async () => {
      mockApiClient.request.mockResolvedValue(sampleQueryResult);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('execute', {
        database_id: 1,
        query: 'SELECT * FROM users',
        row_limit: 100
      });

      await handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/dataset', {
        method: 'POST',
        body: JSON.stringify({
          type: 'native',
          native: {
            query: 'SELECT * FROM users LIMIT 100',
            template_tags: {},
          },
          parameters: [],
          database: 1,
        }),
      });
    });

    it('should preserve existing LIMIT clause if more restrictive', async () => {
      mockApiClient.request.mockResolvedValue(sampleQueryResult);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('execute', {
        database_id: 1,
        query: 'SELECT * FROM users LIMIT 10',
        row_limit: 100
      });

      await handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/dataset', {
        method: 'POST',
        body: JSON.stringify({
          type: 'native',
          native: {
            query: 'SELECT * FROM users LIMIT 10',
            template_tags: {},
          },
          parameters: [],
          database: 1,
        }),
      });
    });

    it('should override existing LIMIT clause if less restrictive', async () => {
      mockApiClient.request.mockResolvedValue(sampleQueryResult);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('execute', {
        database_id: 1,
        query: 'SELECT * FROM users LIMIT 1000',
        row_limit: 100
      });

      await handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/dataset', {
        method: 'POST',
        body: JSON.stringify({
          type: 'native',
          native: {
            query: 'SELECT * FROM users LIMIT 100',
            template_tags: {},
          },
          parameters: [],
          database: 1,
        }),
      });
    });

    it('should handle native parameters', async () => {
      mockApiClient.request.mockResolvedValue(sampleQueryResult);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const nativeParameters = [
        { type: 'text', target: ['variable', ['template-tag', 'user_id']], value: '123' }
      ];

      const request = createMockRequest('execute', {
        database_id: 1,
        query: 'SELECT * FROM users WHERE id = {{user_id}}',
        native_parameters: nativeParameters
      });

      await handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/dataset', {
        method: 'POST',
        body: JSON.stringify({
          type: 'native',
          native: {
            query: 'SELECT * FROM users WHERE id = {{user_id}} LIMIT 500',
            template_tags: {},
          },
          parameters: nativeParameters,
          database: 1,
        }),
      });
    });

    it('should handle API errors', async () => {
      const apiError = new Error('Database connection failed');
      mockApiClient.request.mockRejectedValue(apiError);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('execute', {
        database_id: 1,
        query: 'SELECT * FROM users'
      });

      await expect(
        handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);
    });
  });

  describe('Card execution', () => {
    const sampleCardResult = {
      data: {
        rows: [
          [1, 'John Doe', 'john@example.com'],
          [2, 'Jane Smith', 'jane@example.com'],
        ],
        cols: [
          { name: 'id', display_name: 'ID', base_type: 'type/Integer' },
          { name: 'name', display_name: 'Name', base_type: 'type/Text' },
          { name: 'email', display_name: 'Email', base_type: 'type/Text' },
        ],
      },
    };

    it('should successfully execute a card without parameters', async () => {
      mockApiClient.request.mockResolvedValue(sampleCardResult);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('execute', {
        card_id: 123
      });

      const result = await handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/card/123/query/json', {
        method: 'POST',
        body: JSON.stringify({
          parameters: [],
          pivot_results: false,
          format_rows: false,
        }),
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('success');
      expect(result.content[0].text).toContain('card_id');
    });

    it('should successfully execute a card with parameters', async () => {
      mockApiClient.request.mockResolvedValue(sampleCardResult);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const cardParameters = [
        {
          type: 'id',
          target: ['dimension', ['template-tag', 'cp_id']],
          value: '9458014662',
          id: 'b86c100e-87cb-09d6-7c33-e58cd2cdbcb2',
          slug: 'cp_id'
        }
      ];

      const request = createMockRequest('execute', {
        card_id: 123,
        card_parameters: cardParameters
      });

      const result = await handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/card/123/query/json', {
        method: 'POST',
        body: JSON.stringify({
          parameters: cardParameters,
          pivot_results: false,
          format_rows: false,
        }),
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('success');
    });

    it('should apply row limit to card results (standard format)', async () => {
      const largeCardResult = {
        data: {
          rows: Array.from({ length: 1000 }, (_, i) => [i + 1, `User ${i + 1}`, `user${i + 1}@example.com`]),
          cols: [
            { name: 'id', display_name: 'ID', base_type: 'type/Integer' },
            { name: 'name', display_name: 'Name', base_type: 'type/Text' },
            { name: 'email', display_name: 'Email', base_type: 'type/Text' },
          ],
        },
      };

      mockApiClient.request.mockResolvedValue(largeCardResult);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('execute', {
        card_id: 123,
        row_limit: 100
      });

      const result = await handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.row_count).toBe(100);
      expect(responseData.original_row_count).toBe(1000);
      expect(responseData.applied_limit).toBe(100);
      expect(responseData.data.data.rows).toHaveLength(100);
    });

    it('should apply row limit to card results (numbered keys format)', async () => {
      // Create a response with numbered keys (actual Metabase format)
      const numberedKeysResult: any = {
        data: { rows: [] }
      };
      
      // Add 50 numbered entries
      for (let i = 0; i < 50; i++) {
        numberedKeysResult[i.toString()] = {
          id: i + 1,
          name: `User ${i + 1}`,
          email: `user${i + 1}@example.com`
        };
      }

      mockApiClient.request.mockResolvedValue(numberedKeysResult);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('execute', {
        card_id: 123,
        row_limit: 10
      });

      const result = await handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.row_count).toBe(10);
      expect(responseData.original_row_count).toBe(50);
      expect(responseData.applied_limit).toBe(10);
      
      // Check that only keys 0-9 exist in the response data
      const dataKeys = Object.keys(responseData.data).filter(key => /^\d+$/.test(key));
      expect(dataKeys).toHaveLength(10);
      expect(dataKeys.map(k => parseInt(k)).sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should handle card execution errors', async () => {
      const apiError = new Error('Card not found');
      mockApiClient.request.mockRejectedValue(apiError);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('execute', {
        card_id: 999
      });

      await expect(
        handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);
    });

    it('should log card execution information', async () => {
      mockApiClient.request.mockResolvedValue(sampleCardResult);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('execute', {
        card_id: 123
      });

      await handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logDebug).toHaveBeenCalledWith(
        'Executing card ID: 123 with row limit: 500'
      );
      expect(mockLogger.logInfo).toHaveBeenCalledWith(
        'Successfully executed card: 123, returned 2 rows (original: 2)'
      );
    });
  });

  describe('Query formatting', () => {
    it('should handle queries with different whitespace', async () => {
      mockApiClient.request.mockResolvedValue(sampleQueryResult);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('execute', {
        database_id: 1,
        query: '  SELECT * FROM users  \n\n  '
      });

      await handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/dataset', {
        method: 'POST',
        body: JSON.stringify({
          type: 'native',
          native: {
            query: 'SELECT * FROM users LIMIT 500',
            template_tags: {},
          },
          parameters: [],
          database: 1,
        }),
      });
    });

    it('should handle queries ending with semicolon', async () => {
      mockApiClient.request.mockResolvedValue(sampleQueryResult);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('execute', {
        database_id: 1,
        query: 'SELECT * FROM users;'
      });

      await handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/dataset', {
        method: 'POST',
        body: JSON.stringify({
          type: 'native',
          native: {
            query: 'SELECT * FROM users LIMIT 500;',
            template_tags: {},
          },
          parameters: [],
          database: 1,
        }),
      });
    });
  });

  describe('Logging', () => {
    it('should log debug information', async () => {
      mockApiClient.request.mockResolvedValue(sampleQueryResult);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('execute', {
        database_id: 1,
        query: 'SELECT * FROM users'
      });

      await handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logDebug).toHaveBeenCalledWith(
        'Executing SQL query against database ID: 1 with row limit: 500'
      );
    });

    it('should log success information', async () => {
      mockApiClient.request.mockResolvedValue(sampleQueryResult);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('execute', {
        database_id: 1,
        query: 'SELECT * FROM users'
      });

      await handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockLogger.logInfo).toHaveBeenCalledWith(
        expect.stringContaining('Successfully executed SQL query against database: 1')
      );
    });
  });

  describe('Default values', () => {
    it('should use default row limit when not specified', async () => {
      mockApiClient.request.mockResolvedValue(sampleQueryResult);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('execute', {
        database_id: 1,
        query: 'SELECT * FROM users'
      });

      await handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/dataset', {
        method: 'POST',
        body: JSON.stringify({
          type: 'native',
          native: {
            query: 'SELECT * FROM users LIMIT 500',
            template_tags: {},
          },
          parameters: [],
          database: 1,
        }),
      });
    });

    it('should use empty array for native_parameters when not specified', async () => {
      mockApiClient.request.mockResolvedValue(sampleQueryResult);
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const request = createMockRequest('execute', {
        database_id: 1,
        query: 'SELECT * FROM users'
      });

      await handleExecute(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError);

      expect(mockApiClient.request).toHaveBeenCalledWith('/api/dataset', {
        method: 'POST',
        body: JSON.stringify({
          type: 'native',
          native: {
            query: 'SELECT * FROM users LIMIT 500',
            template_tags: {},
          },
          parameters: [],
          database: 1,
        }),
      });
    });
  });
});
