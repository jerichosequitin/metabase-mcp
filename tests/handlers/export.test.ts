/**
 * Unit tests for the export handler
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleExport } from '../../src/handlers/export/index.js';
import { McpError } from '../../src/types/core.js';
import {
  mockApiClient,
  mockLogger,
  resetAllMocks,
  createMockRequest,
  getLoggerFunctions,
} from '../setup.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as XLSX from 'xlsx';

// Mock fs and path modules
vi.mock('fs');
vi.mock('path');
vi.mock('os');

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper function to create a valid XLSX ArrayBuffer with test data
function createMockXlsxWithData(): ArrayBuffer {
  const testData = [
    ['Name', 'Age', 'City'],
    ['John Doe', 30, 'New York'],
    ['Jane Smith', 25, 'London'],
    ['Bob Johnson', 35, 'Paris'],
  ];
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(testData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  // Ensure we return a proper ArrayBuffer
  if (buffer instanceof ArrayBuffer) {
    return buffer;
  } else if (buffer instanceof Uint8Array) {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  } else {
    // If buffer is a regular array, convert to ArrayBuffer
    const uint8Array = new Uint8Array(buffer);
    return uint8Array.buffer;
  }
}

describe('handleExport (export command)', () => {
  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(os.homedir).mockReturnValue('/home/user');
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
  });

  describe('Parameter validation', () => {
    it('should throw error when neither database_id nor card_id is provided', async () => {
      const request = createMockRequest('export', {});
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExport(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Missing required parameters: either card_id or database_id must be provided',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when both database_id and card_id are provided', async () => {
      const request = createMockRequest('export', { database_id: 1, card_id: 2 });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExport(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Both card_id and database_id provided - only one is allowed',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when invalid format is provided', async () => {
      const request = createMockRequest('export', { database_id: 1, query: 'SELECT 1', format: 'invalid' });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExport(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Invalid format parameter: invalid',
        expect.objectContaining({ 
          requestId: 'test-request-id',
          validValues: expect.any(Array)
        })
      );
    });

    it('should throw error when SQL mode has invalid parameters', async () => {
      const request = createMockRequest('export', { 
        database_id: 1, 
        query: 'SELECT 1',
        card_id: 2,
        card_parameters: [{ name: 'param' }]
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExport(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);
    });

    it('should throw error when card mode has invalid parameters', async () => {
      const request = createMockRequest('export', { 
        card_id: 1,
        database_id: 2,
        query: 'SELECT 1',
        native_parameters: [{ name: 'param' }]
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExport(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);
    });

    it('should throw error when card_id is negative', async () => {
      const request = createMockRequest('export', { card_id: -1, format: 'csv' });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExport(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Invalid card_id parameter - must be a positive number',
        expect.objectContaining({ 
          requestId: 'test-request-id',
          value: -1
        })
      );
    });

    it('should throw error when card_id is zero', async () => {
      const request = createMockRequest('export', { card_id: 0, format: 'csv' });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExport(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Invalid card_id parameter - must be a positive number',
        expect.objectContaining({ 
          requestId: 'test-request-id',
          value: 0
        })
      );
    });

    it('should throw error when database_id is negative', async () => {
      const request = createMockRequest('export', { database_id: -1, query: 'SELECT 1', format: 'csv' });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExport(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Invalid database_id parameter - must be a positive number',
        expect.objectContaining({ 
          requestId: 'test-request-id',
          value: -1
        })
      );
    });

    it('should throw error when database_id is zero', async () => {
      const request = createMockRequest('export', { database_id: 0, query: 'SELECT 1', format: 'csv' });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExport(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Invalid database_id parameter - must be a positive number',
        expect.objectContaining({ 
          requestId: 'test-request-id',
          value: 0
        })
      );
    });
  });

  describe('SQL export mode', () => {
    it('should export SQL query in CSV format successfully', async () => {
      const request = createMockRequest('export', {
        database_id: 1,
        query: 'SELECT * FROM users',
        format: 'csv'
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      // Mock successful fetch response
      const csvData = 'id,name,email\n1,John,john@example.com\n2,Jane,jane@example.com';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(csvData),
      });

      const result = await handleExport(
        request, 
        'test-request-id', 
        mockApiClient as any, 
        logDebug, 
        logInfo, 
        logWarn, 
        logError
      );

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.success).toBe(true);
      expect(responseData.format).toBe('csv');
      expect(responseData.row_count).toBe(2);
      expect(responseData.database_id).toBe(1);
      expect(responseData.query).toBe('SELECT * FROM users');
    });

    it('should export SQL query in JSON format successfully', async () => {
      const request = createMockRequest('export', {
        database_id: 1,
        query: 'SELECT * FROM users',
        format: 'json'
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      // Mock successful fetch response
      const jsonData = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' }
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(jsonData),
      });

      const result = await handleExport(
        request, 
        'test-request-id', 
        mockApiClient as any, 
        logDebug, 
        logInfo, 
        logWarn, 
        logError
      );

      expect(result.content).toHaveLength(1);
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.success).toBe(true);
      expect(responseData.format).toBe('json');
      expect(responseData.row_count).toBe(2);
    });

    it('should export SQL query in XLSX format successfully', async () => {
      const request = createMockRequest('export', {
        database_id: 1,
        query: 'SELECT * FROM users',
        format: 'xlsx'
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      // Mock successful fetch response with ArrayBuffer containing actual data
      const mockArrayBuffer = createMockXlsxWithData();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      });

      const result = await handleExport(
        request, 
        'test-request-id', 
        mockApiClient as any, 
        logDebug, 
        logInfo, 
        logWarn, 
        logError
      );

      expect(result.content).toHaveLength(1);
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.success).toBe(true);
      expect(responseData.format).toBe('xlsx');
      expect(responseData.row_count).toBe(3); // 3 data rows in mock
      expect(responseData.file_size_bytes).toBeGreaterThan(1000); // XLSX files are typically larger
      expect(responseData.preview_data).toHaveLength(3); // Should have preview of all 3 rows
      expect(responseData.preview_data[0]).toEqual({
        'Name': 'John Doe',
        'Age': 30,
        'City': 'New York'
      });
      expect(responseData.preview_note).toContain('First 3 rows shown (3 total rows exported)');
    });

    it('should handle empty query results', async () => {
      const request = createMockRequest('export', {
        database_id: 1,
        query: 'SELECT * FROM empty_table',
        format: 'csv'
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      // Mock empty CSV response
      const csvData = 'id,name,email\n';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(csvData),
      });

      const result = await handleExport(
        request, 
        'test-request-id', 
        mockApiClient as any, 
        logDebug, 
        logInfo, 
        logWarn, 
        logError
      );

      expect(result.content).toHaveLength(1);
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Query executed successfully but returned no data to export');
    });

    it('should handle SQL export with custom filename', async () => {
      const request = createMockRequest('export', {
        database_id: 1,
        query: 'SELECT * FROM users',
        format: 'csv',
        filename: 'my_custom_export'
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const csvData = 'id,name\n1,John';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(csvData),
      });

      const result = await handleExport(
        request, 
        'test-request-id', 
        mockApiClient as any, 
        logDebug, 
        logInfo, 
        logWarn, 
        logError
      );

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.filename).toBe('my_custom_export.csv');
    });
  });

  describe('Card parameter validation', () => {
    it('should throw error when card_parameters has invalid format - missing required fields', async () => {
      const request = createMockRequest('export', {
        card_id: 1,
        card_parameters: [
          { id: 'test-id', slug: 'test-param' } // missing target, type, value
        ]
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExport(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('Missing required field \'target\''),
        expect.objectContaining({ requestId: 'test-request-id' })
      );
    });

    it('should throw error when card_parameters has invalid target structure', async () => {
      const request = createMockRequest('export', {
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
        handleExport(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid \'target\' field'),
        expect.objectContaining({ requestId: 'test-request-id' })
      );
    });

    it('should accept valid card_parameters format for export', async () => {
      const request = createMockRequest('export', {
        card_id: 1,
        card_parameters: [
          {
            id: 'b86c100e-87cb-09d6-7c33-e58cd2cdbcb2',
            slug: 'user_id',
            target: ['dimension', ['template-tag', 'user_id']],
            type: 'id',
            value: '12345'
          }
        ],
        format: 'csv'
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      // Mock card details
      mockApiClient.getCard.mockResolvedValueOnce({
        data: { id: 1, name: 'Test Export Card' },
        source: 'api',
        fetchTime: 100
      });

      // Mock successful export
      const csvData = 'id,name\n1,John';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(csvData),
      });

      const result = await handleExport(
        request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError
      );

      expect(result.content).toHaveLength(1);
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.success).toBe(true);
      expect(responseData.card_id).toBe(1);
    });
  });

  describe('Card export mode', () => {
    it('should export card in CSV format successfully', async () => {
      const request = createMockRequest('export', {
        card_id: 123,
        format: 'csv'
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      // Mock card details
      mockApiClient.getCard.mockResolvedValueOnce({
        data: { id: 123, name: 'User Report' },
        source: 'api',
        fetchTime: 100
      });

      // Mock successful export
      const csvData = 'id,name,email\n1,John,john@example.com';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(csvData),
      });

      const result = await handleExport(
        request, 
        'test-request-id', 
        mockApiClient as any, 
        logDebug, 
        logInfo, 
        logWarn, 
        logError
      );

      expect(result.content).toHaveLength(1);
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.success).toBe(true);
      expect(responseData.card_id).toBe(123);
      expect(responseData.card_name).toBe('User Report');
      expect(responseData.format).toBe('csv');
    });

    it('should export card with parameters', async () => {
      const request = createMockRequest('export', {
        card_id: 123,
        card_parameters: [
          {
            id: 'b86c100e-87cb-09d6-7c33-e58cd2cdbcb2',
            slug: 'user_id',
            target: ['dimension', ['template-tag', 'user_id']],
            type: 'id',
            value: '42'
          }
        ],
        format: 'json'
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      // Mock card details
      mockApiClient.getCard.mockResolvedValueOnce({
        data: { id: 123, name: 'Filtered Report' },
        source: 'api',
        fetchTime: 100
      });

      const jsonData = [{ id: 42, name: 'Specific User' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(jsonData),
      });

      const result = await handleExport(
        request, 
        'test-request-id', 
        mockApiClient as any, 
        logDebug, 
        logInfo, 
        logWarn, 
        logError
      );

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.success).toBe(true);
      expect(responseData.card_id).toBe(123);

      // Verify the request was made with parameters in the correct format
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/card/123/query/json'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ 
            parameters: [
              {
                id: 'b86c100e-87cb-09d6-7c33-e58cd2cdbcb2',
                slug: 'user_id',
                target: ['dimension', ['template-tag', 'user_id']],
                type: 'id',
                value: '42'
              }
            ]
          })
        })
      );
    });

    it('should handle card not found error', async () => {
      const request = createMockRequest('export', {
        card_id: 999,
        format: 'csv'
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      // Mock card fetch failure
      mockApiClient.getCard.mockRejectedValueOnce(new Error('Card not found'));

      // Mock export failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'Card not found' })
      });

      await expect(
        handleExport(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow();
    });
  });

  describe('Error handling', () => {
    it('should handle API errors gracefully', async () => {
      const request = createMockRequest('export', {
        database_id: 1,
        query: 'SELECT * FROM users',
        format: 'csv'
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      // Mock API error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ message: 'Database connection failed' })
      });

      await expect(
        handleExport(request, 'test-request-id', mockApiClient as any, logDebug, logInfo, logWarn, logError)
      ).rejects.toThrow();
    });

    it('should handle file save errors', async () => {
      const request = createMockRequest('export', {
        database_id: 1,
        query: 'SELECT * FROM users',
        format: 'csv'
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const csvData = 'id,name\n1,John';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(csvData),
      });

      // Mock file save error
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await handleExport(
        request, 
        'test-request-id', 
        mockApiClient as any, 
        logDebug, 
        logInfo, 
        logWarn, 
        logError
      );

      expect(result.isError).toBe(true);
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Permission denied');
    });
  });

  describe('Format handling', () => {
    it('should default to CSV format when not specified', async () => {
      const request = createMockRequest('export', {
        database_id: 1,
        query: 'SELECT 1'
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const csvData = 'column1\n1';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(csvData),
      });

      const result = await handleExport(
        request, 
        'test-request-id', 
        mockApiClient as any, 
        logDebug, 
        logInfo, 
        logWarn, 
        logError
      );

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.format).toBe('csv');
    });

    it('should handle uppercase format parameters', async () => {
      const request = createMockRequest('export', {
        database_id: 1,
        query: 'SELECT 1',
        format: 'CSV'
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const csvData = 'column1\n1';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(csvData),
      });

      const result = await handleExport(
        request, 
        'test-request-id', 
        mockApiClient as any, 
        logDebug, 
        logInfo, 
        logWarn, 
        logError
      );

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.format).toBe('csv');
    });

    it('should handle mixed case format parameters', async () => {
      const request = createMockRequest('export', {
        database_id: 1,
        query: 'SELECT 1',
        format: 'JsOn'
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const jsonData = [{ column1: 1 }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(jsonData),
      });

      const result = await handleExport(
        request, 
        'test-request-id', 
        mockApiClient as any, 
        logDebug, 
        logInfo, 
        logWarn, 
        logError
      );

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.format).toBe('json');
    });

    it('should handle XLSX format case-insensitively', async () => {
      const request = createMockRequest('export', {
        database_id: 1,
        query: 'SELECT 1',
        format: 'XLSX'
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      const mockArrayBuffer = new ArrayBuffer(1024);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      });

      const result = await handleExport(
        request, 
        'test-request-id', 
        mockApiClient as any, 
        logDebug, 
        logInfo, 
        logWarn, 
        logError
      );

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.format).toBe('xlsx');
    });
  });
});