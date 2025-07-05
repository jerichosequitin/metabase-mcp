import { MetabaseApiClient } from '../../api.js';
import { handleApiError, validatePositiveInteger } from '../../utils/index.js';
import { CardExecutionParams, ExecutionResponse } from './types.js';

export async function executeCard(
  params: CardExecutionParams,
  requestId: string,
  apiClient: MetabaseApiClient,
  logDebug: (message: string, data?: unknown) => void,
  logInfo: (message: string, data?: unknown) => void,
  logWarn: (message: string, data?: unknown, error?: Error) => void,
  logError: (message: string, error: unknown) => void
): Promise<ExecutionResponse> {
  const { cardId, cardParameters, rowLimit } = params;

  // Validate positive integer parameters
  validatePositiveInteger(cardId, 'card_id', requestId, logWarn);
  validatePositiveInteger(rowLimit, 'row_limit', requestId, logWarn);

  logDebug(`Executing card ID: ${cardId} with row limit: ${rowLimit}`);

  // Build card execution request body
  const cardRequestBody = {
    parameters: cardParameters,
    pivot_results: false,
    format_rows: false,
  };

  try {
    const response = await apiClient.request<any>(`/api/card/${cardId}/query/json`, {
      method: 'POST',
      body: JSON.stringify(cardRequestBody),
    });

    // Handle different response formats from Metabase cards
    let originalRowCount = 0;
    let limitedData = response;

    // Check if response has numbered keys (actual card response format)
    const numberedKeys = Object.keys(response || {}).filter(
      key => /^\d+$/.test(key) && key !== 'data'
    );

    if (numberedKeys.length > 0) {
      // Response format: {"0": {...}, "1": {...}, "2": {...}, "data": {...}}
      originalRowCount = numberedKeys.length;

      // Apply row limit by keeping only the first N numbered entries
      const limitedKeys = numberedKeys.slice(0, rowLimit);
      limitedData = {
        ...response,
      };

      // Remove entries beyond the limit
      numberedKeys.forEach(key => {
        if (!limitedKeys.includes(key)) {
          delete limitedData[key];
        }
      });
    } else if (response?.data?.rows) {
      // Standard format: {"data": {"rows": [...]}}
      originalRowCount = response.data.rows.length;
      const limitedRows = response.data.rows.slice(0, rowLimit);
      limitedData = {
        ...response,
        data: {
          ...response.data,
          rows: limitedRows,
        },
      };
    }

    const finalRowCount = Math.min(originalRowCount, rowLimit);
    logInfo(
      `Successfully executed card: ${cardId}, returned ${finalRowCount} rows (original: ${originalRowCount})`
    );

    if (originalRowCount > rowLimit) {
      logDebug(
        `Applied row limit: ${rowLimit} to card results (truncated from ${originalRowCount} rows)`
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              card_id: cardId,
              row_count: finalRowCount,
              original_row_count: originalRowCount,
              applied_limit: rowLimit,
              data: limitedData,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: any) {
    throw handleApiError(
      error,
      {
        operation: 'Card execution',
        resourceType: 'card',
        resourceId: cardId,
        customMessages: {
          '400':
            'Invalid card parameters or card configuration error. Check that the card exists and all required parameters are provided.',
          '404': 'Card not found. Verify the card ID exists and you have permission to access it.',
          '500':
            'Database server error. The card query may have caused a timeout or database issue.',
        },
      },
      logError
    );
  }
}
