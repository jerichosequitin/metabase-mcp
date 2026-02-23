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

    it('should throw error when mode is invalid', async () => {
      const request = createMockRequest('execute_dashboard', {
        dashboard_id: 1,
        mode: 'bad-mode',
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

    it('should throw error when strict_filters is not boolean', async () => {
      const request = createMockRequest('execute_dashboard', {
        dashboard_id: 1,
        strict_filters: 'true',
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

    it('should throw error when dashboard filter array contains invalid values', async () => {
      const request = createMockRequest('execute_dashboard', {
        dashboard_id: 1,
        dashboard_filters: {
          region: ['EMEA', ''],
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

  describe('Discover mode', () => {
    it('should return filter mapping readiness without executing cards', async () => {
      const request = createMockRequest('execute_dashboard', {
        dashboard_id: 1,
        mode: 'discover',
        dashboard_filters: {
          region: 'EMEA',
          year: 2025,
        },
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
              name: 'Region',
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
          ],
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
      expect(responseData.mode).toBe('discover');
      expect(responseData.execution_readiness.ready).toBe(false);
      expect(responseData.execution_readiness.blocking_issues).toHaveLength(1);
      expect(responseData.execution_readiness.suggested_filter_payload).toEqual({
        region: ['EMEA'],
        year: 2025,
      });
      expect(responseData.filter_resolution.matched_filter_slugs).toEqual(['region']);
      expect(responseData.filter_resolution.unmatched_filter_slugs).toEqual(['year']);
      expect(responseData.filter_mapping_matrix).toHaveLength(2);
      expect(mockApiClient.request).not.toHaveBeenCalled();
    });
  });

  describe('Execute mode', () => {
    it('should fail fast in strict mode when filters are unknown or unmapped', async () => {
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
          dashcards: [{ id: 30, card_id: 300, card: { name: 'Card A' }, parameter_mappings: [] }],
        })
      );

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
      ).rejects.toThrow('Dashboard filter validation failed');

      expect(mockApiClient.request).not.toHaveBeenCalled();
    });

    it('should allow best-effort when strict_filters is false', async () => {
      const request = createMockRequest('execute_dashboard', {
        dashboard_id: 7,
        strict_filters: false,
        dashboard_filters: {
          unknown_filter: 'x',
        },
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      mockApiClient.getDashboard.mockResolvedValueOnce(
        createCachedResponse({
          id: 7,
          name: 'Non Strict Dashboard',
          parameters: [],
          dashcards: [{ id: 70, card_id: 700, card: { name: 'Card A' }, parameter_mappings: [] }],
        })
      );

      mockApiClient.request.mockResolvedValueOnce({
        data: {
          rows: [['ok']],
          cols: [{ name: 'status' }],
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
      expect(responseData.mode).toBe('execute');
      expect(responseData.strict_filters).toBe(false);
      expect(responseData.filter_resolution.unmatched_filter_slugs).toEqual(['unknown_filter']);
      expect(mockApiClient.request).toHaveBeenCalledTimes(1);
    });

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
      expect(responseData.mode).toBe('execute');
      expect(responseData.dashboard.id).toBe(1);
      expect(responseData.dashboard.executed_cards).toBe(1);
      expect(responseData.dashboard.skipped_cards).toBe(1);
      expect(responseData.cards).toHaveLength(1);
      expect(responseData.cards[0].card_id).toBe(100);
      expect(responseData.cards[0].row_count).toBe(2);
      expect(responseData.cards[0].applied_parameter_count).toBe(1);
      expect(responseData.cards[0].applied_filters).toEqual(['region']);
      expect(responseData.skipped[0].reason).toContain('non-executable');
      expect(responseData.filter_resolution.matched_filter_slugs).toEqual(['region']);
      expect(responseData.filter_resolution.unmatched_filter_slugs).toEqual([]);

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
                value: ['EMEA'],
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

    it('should pass through array values for dimension mappings', async () => {
      const request = createMockRequest('execute_dashboard', {
        dashboard_id: 5,
        dashboard_filters: {
          facility_name: ['Centro Médico Teknon', 'Clinic B'],
        },
      });
      const [logDebug, logInfo, logWarn, logError] = getLoggerFunctions();

      mockApiClient.getDashboard.mockResolvedValueOnce(
        createCachedResponse({
          id: 5,
          name: 'Facilities Dashboard',
          parameters: [
            {
              id: 'param-facility',
              slug: 'facility_name',
              type: 'category',
            },
          ],
          dashcards: [
            {
              id: 50,
              card_id: 500,
              card: { name: 'Facilities' },
              parameter_mappings: [
                {
                  parameter_id: 'param-facility',
                  target: ['dimension', ['template-tag', 'facility_name']],
                },
              ],
            },
          ],
        })
      );

      mockApiClient.request.mockResolvedValueOnce({
        data: {
          rows: [['Centro Médico Teknon']],
          cols: [{ name: 'facility_name' }],
        },
      });

      await handleExecuteDashboard(
        request as any,
        'test-request-id',
        mockApiClient as any,
        logDebug,
        logInfo,
        logWarn,
        logError
      );

      expect(mockApiClient.request).toHaveBeenCalledWith(
        '/api/dashboard/5/dashcard/50/card/500/query',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            parameters: [
              {
                id: 'param-facility',
                slug: 'facility_name',
                type: 'category',
                target: ['dimension', ['template-tag', 'facility_name']],
                value: ['Centro Médico Teknon', 'Clinic B'],
              },
            ],
            pivot_results: false,
            format_rows: false,
          }),
        })
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
