import { MetabaseApiClient } from '../../api.js';
import { handleApiError, sanitizeFilename, analyzeXlsxContent } from '../../utils/index.js';
import { config, authMethod, AuthMethod } from '../../config.js';
import * as XLSX from 'xlsx';
import { CardExportParams, ExportResponse } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Extract first 5 rows preview in standardized JSON format from export data
 */
function extractPreviewData(responseData: any, format: string): any[] {
  try {
    if (format === 'json') {
      // Handle different JSON response structures
      let rows: any[] = [];

      if (responseData?.data?.rows) {
        rows = responseData.data.rows;
      } else if (responseData?.rows) {
        rows = responseData.rows;
      } else if (Array.isArray(responseData)) {
        rows = responseData;
      }

      // Take first 5 rows
      return rows.slice(0, 5);
    } else if (format === 'csv') {
      // Parse CSV to get first 5 data rows
      const lines = responseData.split('\n').filter((line: string) => line.trim());
      if (lines.length <= 1) {
        return []; // No data rows (just header or empty)
      }

      const header = lines[0].split(',').map((col: string) => col.trim().replace(/^"|"$/g, ''));
      const dataRows = lines.slice(1, 6); // Take first 5 data rows

      return dataRows.map((row: string) => {
        const values = row.split(',').map((val: string) => val.trim().replace(/^"|"$/g, ''));
        const rowObj: any = {};
        header.forEach((col: string, index: number) => {
          rowObj[col] = values[index] || null;
        });
        return rowObj;
      });
    } else if (format === 'xlsx') {
      // Parse XLSX ArrayBuffer to extract preview data
      const workbook = XLSX.read(responseData);
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return [];
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Skip header row and take first 5 data rows
      const dataRows = jsonData.slice(1, 6);
      if (jsonData.length === 0 || dataRows.length === 0) {
        return [];
      }

      // Convert to objects using header row
      const headers = jsonData[0] as string[];
      return dataRows.map((row: any) => {
        const rowObj: any = {};
        headers.forEach((header: string, index: number) => {
          rowObj[header] = row[index] || null;
        });
        return rowObj;
      });
    }

    return [];
  } catch (error) {
    // If preview extraction fails, return empty array
    return [];
  }
}

export async function exportCard(
  params: CardExportParams,
  requestId: string,
  apiClient: MetabaseApiClient,
  logDebug: (message: string, data?: unknown) => void,
  logInfo: (message: string, data?: unknown) => void,
  logWarn: (message: string, data?: unknown, error?: Error) => void,
  logError: (message: string, error: unknown) => void
): Promise<ExportResponse> {
  const { cardId, cardParameters, format, filename } = params;

  logDebug(`Exporting card ${cardId} in ${format} format`);

  try {
    // First, fetch the card to get its name for filename purposes
    let cardName = `card_${cardId}`;
    try {
      const cardResponse = await apiClient.getCard(cardId);
      if (cardResponse.data.name) {
        cardName = cardResponse.data.name;
      }
    } catch (cardError) {
      logWarn(`Failed to fetch card name for card ${cardId}`, cardError);
    }

    // Use the export endpoint which supports larger result sets (up to 1M rows)
    const exportEndpoint = `/api/card/${cardId}/query/${format}`;

    // Build the request body with parameters if provided
    const requestBody = cardParameters.length > 0 ? { parameters: cardParameters } : {};

    // For export endpoints, we need to handle different response types
    const url = new URL(exportEndpoint, config.METABASE_URL);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add appropriate authentication headers
    if (authMethod === AuthMethod.API_KEY && config.METABASE_API_KEY) {
      headers['X-API-KEY'] = config.METABASE_API_KEY;
    } else if (authMethod === AuthMethod.SESSION && apiClient.sessionToken) {
      headers['X-Metabase-Session'] = apiClient.sessionToken;
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = `Export API request failed with status ${response.status}: ${response.statusText}`;
      logWarn(errorMessage, errorData);
      throw {
        status: response.status,
        message: response.statusText,
        data: errorData,
      };
    }

    // Handle different response types based on format
    let responseData;
    let rowCount: number | undefined = 0;
    let fileSize = 0;

    try {
      if (format === 'json') {
        responseData = await response.json();
        // JSON export format might have different structures, let's be more flexible
        if (responseData && typeof responseData === 'object') {
          // Try different possible structures for row counting
          rowCount =
            responseData?.data?.rows?.length ??
            responseData?.rows?.length ??
            (Array.isArray(responseData) ? responseData.length : 0);
        }
        logDebug(`JSON export row count: ${rowCount}`);
      } else if (format === 'csv') {
        responseData = await response.text();
        // Count rows for CSV (subtract header row)
        const rows = responseData.split('\n').filter((row: string) => row.trim());
        rowCount = Math.max(0, rows.length - 1);
        logDebug(`CSV export row count: ${rowCount}`);
      } else if (format === 'xlsx') {
        responseData = await response.arrayBuffer();
        fileSize = responseData.byteLength;

        // Analyze XLSX content to get accurate row count and data validation
        const xlsxAnalysis = analyzeXlsxContent(responseData);
        rowCount = xlsxAnalysis.rowCount;

        logDebug(
          `XLSX export - file size: ${fileSize} bytes, rows: ${rowCount}, has data: ${xlsxAnalysis.hasData}`
        );
      }
    } catch (parseError) {
      logError(`Failed to parse ${format} response: ${parseError}`, parseError);
      throw new Error(`Failed to parse ${format} response: ${parseError}`);
    }

    // Validate that we have data before proceeding with file operations
    // Check row count for all formats
    const hasData = rowCount !== null && rowCount !== undefined && rowCount > 0;
    if (!hasData) {
      logWarn(`Card ${cardId} returned no data for export`, { requestId });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                message: 'Card executed successfully but returned no data to export',
                card_id: cardId,
                card_name: cardName,
                format: format,
                row_count: rowCount,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Always save files to Downloads/Metabase directory
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const sanitizedCustomFilename = sanitizeFilename(filename);
    const sanitizedCardName = sanitizeFilename(cardName);
    const baseFilename = sanitizedCustomFilename || `${sanitizedCardName}_${timestamp}`;
    const finalFilename = `${baseFilename}.${format}`;

    // Use configured export directory
    const exportDirectory = config.EXPORT_DIRECTORY;
    const savedFilePath = path.join(exportDirectory, finalFilename);

    let fileSaveError: string | undefined;

    try {
      // Ensure export directory exists
      if (!fs.existsSync(exportDirectory)) {
        fs.mkdirSync(exportDirectory, { recursive: true });
      }

      // Write the file based on format and calculate file size
      if (format === 'json') {
        const jsonString = JSON.stringify(responseData, null, 2);
        fs.writeFileSync(savedFilePath, jsonString, 'utf8');
        fileSize = Buffer.byteLength(jsonString, 'utf8');
      } else if (format === 'csv') {
        fs.writeFileSync(savedFilePath, responseData, 'utf8');
        fileSize = Buffer.byteLength(responseData, 'utf8');
      } else if (format === 'xlsx') {
        // Handle binary data for XLSX
        if (responseData instanceof ArrayBuffer) {
          const buffer = Buffer.from(responseData);
          fs.writeFileSync(savedFilePath, buffer);
          fileSize = buffer.length;
        } else {
          throw new Error('XLSX response is not in expected ArrayBuffer format');
        }
      }

      logInfo(`Successfully exported to ${savedFilePath}`);
    } catch (saveError) {
      fileSaveError = saveError instanceof Error ? saveError.message : 'Unknown file save error';
      logError(`Failed to save export file: ${fileSaveError}`, saveError);
    }

    // Generate standardized JSON response
    if (fileSaveError) {
      const errorResponse: any = {
        success: false,
        message: 'Export completed but failed to save file',
        error: fileSaveError,
        card_id: cardId,
        card_name: cardName,
        format: format,
        row_count: rowCount,
        intended_file_path: savedFilePath,
      };

      // Add file size for all formats
      if (fileSize > 0) {
        errorResponse.file_size_bytes = fileSize;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(errorResponse, null, 2),
          },
        ],
        isError: true,
      };
    }

    // Extract preview data (first 5 rows) for the response
    const previewData = extractPreviewData(responseData, format);

    // Successful export - return standardized JSON response
    const successResponse: any = {
      success: true,
      message: 'Export completed successfully',
      card_id: cardId,
      card_name: cardName,
      file_path: savedFilePath,
      filename: finalFilename,
      format: format,
      row_count: rowCount,
      file_size_bytes: fileSize,
      preview_data: previewData,
      preview_note:
        previewData.length > 0
          ? `First ${previewData.length} rows shown (${rowCount} total rows exported)`
          : 'No preview data available',
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(successResponse, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleApiError(
      error,
      {
        operation: 'Export card',
        resourceType: 'card',
        resourceId: cardId,
        customMessages: {
          '400':
            "Invalid card parameters or export format issue. Ensure format is csv, json, or xlsx. If parameter issues persist, consider using export_query with the card's underlying SQL query instead, which provides more reliable parameter handling and validation.",
          '404':
            'Card not found or not accessible. Alternatively, use export_query to export the SQL query results directly from the database.',
          '413':
            'Export payload too large. Try reducing the result set size or use query filters. Consider using export_query with LIMIT clauses for better control over result size.',
          '500':
            "Server error. The card may have caused a timeout or database issue. Try using export_query with the card's SQL query for better error handling and timeout control.",
        },
      },
      logError
    );
  }
}
