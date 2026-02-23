import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { MetabaseApiClient } from '../../api.js';
import { ErrorCode, McpError } from '../../types/core.js';
import {
  handleApiError,
  validatePositiveInteger,
  validateRowLimit,
  validateMetabaseResponse,
  formatJson,
} from '../../utils/index.js';
import {
  DashboardExecutionResponse,
  DashboardFilterValue,
  DashboardParameterInfo,
  DashboardCardExecutionError,
  ExecuteDashboardRequest,
  ExecutableDashcard,
  SkippedDashcard,
} from './types.js';
import { mapDashboardFiltersToCardParameters } from './mapping.js';
import { normalizeCardResponseData } from './normalizers.js';

const DEFAULT_ROW_LIMIT = 100;
const EXECUTION_CONCURRENCY = 3;

function parseDashboardIdFromUrl(urlString: string): number | null {
  try {
    const parsedUrl = new URL(urlString);
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const dashboardSegmentIndex = pathSegments.findIndex(segment => segment === 'dashboard');

    if (dashboardSegmentIndex === -1 || dashboardSegmentIndex === pathSegments.length - 1) {
      return null;
    }

    const rawDashboardSegment = pathSegments[dashboardSegmentIndex + 1];
    const idMatch = rawDashboardSegment.match(/^(\d+)/);
    if (!idMatch) {
      return null;
    }

    const dashboardId = parseInt(idMatch[1], 10);
    return Number.isInteger(dashboardId) && dashboardId > 0 ? dashboardId : null;
  } catch {
    return null;
  }
}

function normalizeDashboardFilters(
  rawFilters: unknown,
  requestId: string,
  logWarn: (message: string, data?: unknown, error?: Error) => void
): Record<string, DashboardFilterValue> {
  if (rawFilters === undefined) {
    return {};
  }

  if (!rawFilters || typeof rawFilters !== 'object' || Array.isArray(rawFilters)) {
    logWarn('Invalid dashboard_filters parameter - must be an object map', { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      'dashboard_filters must be an object map in the format {"filter_slug": value}'
    );
  }

  const normalized: Record<string, DashboardFilterValue> = {};
  for (const [slug, value] of Object.entries(rawFilters)) {
    if (!slug || slug.trim() === '') {
      logWarn('Invalid dashboard filter slug - cannot be empty', { requestId });
      throw new McpError(ErrorCode.InvalidParams, 'dashboard filter slugs cannot be empty');
    }

    const valueType = typeof value;
    if (valueType !== 'string' && valueType !== 'number' && valueType !== 'boolean') {
      logWarn('Invalid dashboard filter value type', { requestId, slug, valueType });
      throw new McpError(
        ErrorCode.InvalidParams,
        `dashboard_filters["${slug}"] must be a string, number, or boolean`
      );
    }

    normalized[slug] = value as DashboardFilterValue;
  }

  return normalized;
}

function extractDashboardParameters(dashboard: any): Map<string, DashboardParameterInfo> {
  const parameterBySlug = new Map<string, DashboardParameterInfo>();
  const dashboardParameters = Array.isArray(dashboard?.parameters) ? dashboard.parameters : [];

  dashboardParameters.forEach((param: any) => {
    if (param?.slug && param?.id !== undefined && param?.id !== null) {
      parameterBySlug.set(param.slug, {
        id: String(param.id),
        slug: String(param.slug),
        type: typeof param.type === 'string' ? param.type : 'text',
      });
    }
  });

  return parameterBySlug;
}

function categorizeDashcards(dashboard: any): {
  executable: ExecutableDashcard[];
  skipped: SkippedDashcard[];
} {
  const dashcards = Array.isArray(dashboard?.dashcards) ? dashboard.dashcards : [];
  const executable: ExecutableDashcard[] = [];
  const skipped: SkippedDashcard[] = [];

  for (const dashcard of dashcards) {
    const dashcardId = typeof dashcard?.id === 'number' ? dashcard.id : null;
    const cardId = typeof dashcard?.card_id === 'number' ? dashcard.card_id : null;
    const cardName =
      typeof dashcard?.card?.name === 'string' && dashcard.card.name.trim() !== ''
        ? dashcard.card.name
        : cardId !== null
          ? `card_${cardId}`
          : 'unknown';

    if (!dashcardId || !cardId) {
      skipped.push({
        dashcard_id: dashcardId,
        card_id: cardId,
        reason: 'non-executable dashcard (missing dashcard id or card id)',
      });
      continue;
    }

    executable.push({
      dashcardId,
      cardId,
      cardName,
      parameterMappings: Array.isArray(dashcard?.parameter_mappings)
        ? dashcard.parameter_mappings
        : [],
    });
  }

  return { executable, skipped };
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex++;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await task(items[currentIndex]);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function handleExecuteDashboard(
  request: CallToolRequest,
  requestId: string,
  apiClient: MetabaseApiClient,
  logDebug: (message: string, data?: unknown) => void,
  logInfo: (message: string, data?: unknown) => void,
  logWarn: (message: string, data?: unknown, error?: Error) => void,
  logError: (message: string, error: unknown) => void
): Promise<DashboardExecutionResponse> {
  const args = request.params?.arguments as ExecuteDashboardRequest;

  const dashboardIdArg = args?.dashboard_id;
  const dashboardUrlArg = args?.dashboard_url;
  const rowLimitArg = args?.row_limit;
  const rowLimit = typeof rowLimitArg === 'number' ? rowLimitArg : DEFAULT_ROW_LIMIT;
  const dashboardFilters = normalizeDashboardFilters(args?.dashboard_filters, requestId, logWarn);

  if (dashboardIdArg === undefined && dashboardUrlArg === undefined) {
    logWarn('Missing required parameters: dashboard_id or dashboard_url must be provided', {
      requestId,
    });
    throw new McpError(
      ErrorCode.InvalidParams,
      'Either dashboard_id or dashboard_url parameter is required'
    );
  }

  if (dashboardIdArg !== undefined && typeof dashboardIdArg !== 'number') {
    logWarn('Invalid dashboard_id parameter - must be a number', { requestId });
    throw new McpError(ErrorCode.InvalidParams, 'dashboard_id parameter must be a number');
  }

  if (dashboardUrlArg !== undefined && typeof dashboardUrlArg !== 'string') {
    logWarn('Invalid dashboard_url parameter - must be a string', { requestId });
    throw new McpError(ErrorCode.InvalidParams, 'dashboard_url parameter must be a string');
  }

  validateRowLimit(rowLimit, 'row_limit', requestId, logWarn);

  let dashboardId: number;
  if (dashboardIdArg !== undefined) {
    validatePositiveInteger(dashboardIdArg, 'dashboard_id', requestId, logWarn);
    dashboardId = dashboardIdArg;

    if (dashboardUrlArg) {
      logWarn('Both dashboard_id and dashboard_url were provided; dashboard_id takes precedence', {
        requestId,
      });
    }
  } else {
    const parsedDashboardId = parseDashboardIdFromUrl((dashboardUrlArg || '').trim());
    if (!parsedDashboardId) {
      logWarn('Could not parse dashboard ID from dashboard_url', { requestId, dashboardUrlArg });
      throw new McpError(
        ErrorCode.InvalidParams,
        'dashboard_url must be a valid Metabase app dashboard URL containing a numeric dashboard ID'
      );
    }
    dashboardId = parsedDashboardId;
  }

  logDebug(`Executing dashboard ${dashboardId} with row limit: ${rowLimit}`, {
    filterCount: Object.keys(dashboardFilters).length,
  });

  try {
    const dashboardResponse = await apiClient.getDashboard(dashboardId);
    const dashboard = dashboardResponse.data;
    const dashboardName =
      typeof dashboard?.name === 'string' && dashboard.name.trim() !== ''
        ? dashboard.name
        : `dashboard_${dashboardId}`;

    const warnings = new Set<string>();
    const parameterBySlug = extractDashboardParameters(dashboard);

    for (const slug of Object.keys(dashboardFilters)) {
      if (!parameterBySlug.has(slug)) {
        warnings.add(`Dashboard filter "${slug}" was not found in dashboard parameters`);
      }
    }

    const { executable, skipped } = categorizeDashcards(dashboard);

    const errors: DashboardCardExecutionError[] = [];
    const cards: any[] = [];

    const executionResults = await runWithConcurrency(
      executable,
      EXECUTION_CONCURRENCY,
      async card => {
        const mappingResult = mapDashboardFiltersToCardParameters(
          card.dashcardId,
          dashboardFilters,
          card.parameterMappings,
          parameterBySlug
        );

        mappingResult.warnings.forEach(warning => warnings.add(warning));

        const requestBody = {
          parameters: mappingResult.cardParameters,
          pivot_results: false,
          format_rows: false,
        };

        const endpoint = `/api/dashboard/${dashboardId}/dashcard/${card.dashcardId}/card/${card.cardId}/query`;

        try {
          const response = await apiClient.request<any>(endpoint, {
            method: 'POST',
            body: JSON.stringify(requestBody),
          });

          validateMetabaseResponse(
            response,
            { operation: 'Dashboard card execution', resourceId: card.cardId },
            logError
          );

          const normalized = normalizeCardResponseData(response, rowLimit);

          return {
            status: 'success' as const,
            card: {
              dashcard_id: card.dashcardId,
              card_id: card.cardId,
              card_name: card.cardName,
              status: 'success',
              row_count: normalized.rowCount,
              original_row_count: normalized.originalRowCount,
              applied_limit: rowLimit,
              data: normalized.data,
            },
          };
        } catch (error: any) {
          const handledError = handleApiError(
            error,
            {
              operation: 'Dashboard card execution',
              resourceType: 'card',
              resourceId: card.cardId,
            },
            logError
          );

          return {
            status: 'error' as const,
            error: {
              dashcard_id: card.dashcardId,
              card_id: card.cardId,
              card_name: card.cardName,
              error: handledError.message,
            },
          };
        }
      }
    );

    executionResults.forEach(result => {
      if (result.status === 'success') {
        cards.push(result.card);
      } else {
        errors.push(result.error);
      }
    });

    const response = {
      success: true,
      dashboard: {
        id: dashboardId,
        name: dashboardName,
        source: dashboardResponse.source,
        total_dashcards: executable.length + skipped.length,
        executable_dashcards: executable.length,
        executed_cards: cards.length,
        failed_cards: errors.length,
        skipped_cards: skipped.length,
      },
      applied_filters: dashboardFilters,
      warnings: Array.from(warnings),
      skipped,
      errors,
      cards,
      usage_guidance:
        'This response mirrors dashboard-style execution in API context. For very large cards or dashboards, reduce row_limit or run execute/export on specific card IDs.',
      retrieved_at: new Date().toISOString(),
    };

    logInfo(
      `Dashboard execution complete for ${dashboardId}: ${cards.length} succeeded, ${errors.length} failed, ${skipped.length} skipped`,
      { requestId }
    );

    return {
      content: [
        {
          type: 'text',
          text: formatJson(response),
        },
      ],
    };
  } catch (error: any) {
    throw handleApiError(
      error,
      {
        operation: 'Execute dashboard',
        resourceType: 'dashboard',
        resourceId: dashboardId,
      },
      logError
    );
  }
}
