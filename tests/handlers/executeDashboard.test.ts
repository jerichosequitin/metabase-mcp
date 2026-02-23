/**
 * Unit tests for the execute_dashboard handler
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { handleExecuteDashboard } from '../../src/handlers/executeDashboard/index.js';
import { McpError } from '../../src/types/core.js';
import {
  createCachedResponse,
  createMockRequest,
  getLoggerFunctions,
  mockApiClient,
  mockLogger,
  resetAllMocks,
} from '../setup.js';

describe('handleExecuteDashboard (execute_dashboard command)', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Parameter validation', () => {
    it('should throw error when neither dashboard_id nor dashboard_url is provided', async () => {
      const request = createMockRequest('execute_dashboard', {});
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecuteDashboard(
          request as any,
          'test-request-id',
          mockApiClient as any,
          logDebug,
          logInfo,
          logWarn,
          logError
        )
      ).rejects.toThrow(McpError);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Missing required parameters: dashboard_id or dashboard_url must be provided',
        { requestId: 'test-request-id' }
      );
    });

    it('should throw error when dashboard_url cannot be parsed', async () => {
      const request = createMockRequest('execute_dashboard', {
        dashboard_url: 'https://metabase.example.com/dashboard/not-a-number',
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecuteDashboard(
          request as any,
          'test-request-id',
          mockApiClient as any,
          logDebug,
          logInfo,
          logWarn,
          logError
        )
      ).rejects.toThrow(McpError);
    });

    it('should throw error when dashboard_filters is not an object', async () => {
      const request = createMockRequest('execute_dashboard', {
        dashboard_id: 1,
        dashboard_filters: 'invalid',
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecuteDashboard(
          request as any,
          'test-request-id',
          mockApiClient as any,
          logDebug,
          logInfo,
          logWarn,
          logError
        )
      ).rejects.toThrow(McpError);
    });

    it('should throw error when dashboard filter value type is invalid', async () => {
      const request = createMockRequest('execute_dashboard', {
        dashboard_id: 1,
        dashboard_filters: {
          region: { invalid: true },
        },
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      await expect(
        handleExecuteDashboard(
          request as any,
          'test-request-id',
          mockApiClient as any,
          logDebug,
          logInfo,
          logWarn,
          logError
        )
      ).rejects.toThrow(McpError);
    });
  });

  describe('Dashboard execution flow', () => {
    it('should execute dashboard cards with mapped dashboard filters', async () => {
      const request = createMockRequest('execute_dashboard', {
        dashboard_id: 1,
        dashboard_filters: {
          region: 'EMEA',
        },
        row_limit: 100,
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      mockApiClient.getDashboard.mockResolvedValueOnce(
        createCachedResponse({
          id: 1,
          name: 'Revenue Dashboard',
          parameters: [
            {
              id: 'param-region',
              slug: 'region',
              type: 'category',
            },
          ],
          dashcards: [
            {
              id: 10,
              card_id: 100,
              card: { name: 'Revenue by Region' },
              parameter_mappings: [
                {
                  parameter_id: 'param-region',
                  target: ['dimension', ['template-tag', 'region']],
                },
              ],
            },
            {
              id: 11,
              card_id: null,
              parameter_mappings: [],
            },
          ],
        })
      );

      mockApiClient.request.mockResolvedValueOnce({
        data: {
          rows: [
            ['EMEA', 1000],
            ['EMEA', 1200],
          ],
          cols: [{ name: 'region' }, { name: 'revenue' }],
        },
      });

      const result = await handleExecuteDashboard(
        request as any,
        'test-request-id',
        mockApiClient as any,
        logDebug,
        logInfo,
        logWarn,
        logError
      );

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.success).toBe(true);
      expect(responseData.dashboard.id).toBe(1);
      expect(responseData.dashboard.executed_cards).toBe(1);
      expect(responseData.dashboard.skipped_cards).toBe(1);
      expect(responseData.cards).toHaveLength(1);
      expect(responseData.cards[0].card_id).toBe(100);
      expect(responseData.cards[0].row_count).toBe(2);
      expect(responseData.skipped[0].reason).toContain('non-executable');

      expect(mockApiClient.request).toHaveBeenCalledWith(
        '/api/dashboard/1/dashcard/10/card/100/query',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            parameters: [
              {
                id: 'param-region',
                slug: 'region',
                type: 'category',
                target: ['dimension', ['template-tag', 'region']],
                value: 'EMEA',
              },
            ],
            pivot_results: false,
            format_rows: false,
          }),
        })
      );
    });

    it('should parse dashboard_id from dashboard_url', async () => {
      const request = createMockRequest('execute_dashboard', {
        dashboard_url: 'https://metabase.example.com/dashboard/321-my-dashboard',
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      mockApiClient.getDashboard.mockResolvedValueOnce(
        createCachedResponse({
          id: 321,
          name: 'Parsed Dashboard',
          parameters: [],
          dashcards: [],
        })
      );

      const result = await handleExecuteDashboard(
        request as any,
        'test-request-id',
        mockApiClient as any,
        logDebug,
        logInfo,
        logWarn,
        logError
      );

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.dashboard.id).toBe(321);
    });

    it('should continue executing other cards when one fails', async () => {
      const request = createMockRequest('execute_dashboard', {
        dashboard_id: 2,
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      mockApiClient.getDashboard.mockResolvedValueOnce(
        createCachedResponse({
          id: 2,
          name: 'Partial Dashboard',
          parameters: [],
          dashcards: [
            { id: 20, card_id: 200, card: { name: 'Card A' }, parameter_mappings: [] },
            { id: 21, card_id: 201, card: { name: 'Card B' }, parameter_mappings: [] },
          ],
        })
      );

      mockApiClient.request.mockImplementation((path: string) => {
        if (path.includes('/dashcard/20/')) {
          return Promise.resolve({
            data: {
              rows: [['ok']],
              cols: [{ name: 'status' }],
            },
          });
        }
        return Promise.reject(new Error('query failed'));
      });

      const result = await handleExecuteDashboard(
        request as any,
        'test-request-id',
        mockApiClient as any,
        logDebug,
        logInfo,
        logWarn,
        logError
      );

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.success).toBe(true);
      expect(responseData.dashboard.executed_cards).toBe(1);
      expect(responseData.dashboard.failed_cards).toBe(1);
      expect(responseData.errors).toHaveLength(1);
      expect(responseData.errors[0].card_id).toBe(201);
      expect(responseData.errors[0].error).toContain('Dashboard card execution failed');
    });

    it('should include warning for unknown dashboard filter slug', async () => {
      const request = createMockRequest('execute_dashboard', {
        dashboard_id: 3,
        dashboard_filters: {
          unknown_filter: 'x',
        },
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      mockApiClient.getDashboard.mockResolvedValueOnce(
        createCachedResponse({
          id: 3,
          name: 'Unknown Filter Dashboard',
          parameters: [],
          dashcards: [],
        })
      );

      const result = await handleExecuteDashboard(
        request as any,
        'test-request-id',
        mockApiClient as any,
        logDebug,
        logInfo,
        logWarn,
        logError
      );

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.warnings).toContain(
        'Dashboard filter "unknown_filter" was not found in dashboard parameters'
      );
    });

    it('should enforce row limits on numbered response format', async () => {
      const request = createMockRequest('execute_dashboard', {
        dashboard_id: 4,
        row_limit: 2,
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      mockApiClient.getDashboard.mockResolvedValueOnce(
        createCachedResponse({
          id: 4,
          name: 'Numbered Rows Dashboard',
          parameters: [],
          dashcards: [
            { id: 40, card_id: 400, card: { name: 'Card Numbered' }, parameter_mappings: [] },
          ],
        })
      );

      mockApiClient.request.mockResolvedValueOnce({
        '0': { id: 1 },
        '1': { id: 2 },
        '2': { id: 3 },
        data: { rows_truncated: false },
      });

      const result = await handleExecuteDashboard(
        request as any,
        'test-request-id',
        mockApiClient as any,
        logDebug,
        logInfo,
        logWarn,
        logError
      );

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.cards[0].original_row_count).toBe(3);
      expect(responseData.cards[0].row_count).toBe(2);
      expect(responseData.cards[0].data['2']).toBeUndefined();
      expect(responseData.cards[0].data['1']).toEqual({ id: 2 });
    });
  });
});
