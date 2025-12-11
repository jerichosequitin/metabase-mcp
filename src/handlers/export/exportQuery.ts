import { MetabaseApiClient } from '../../api.js';
import {
  handleApiError,
  sanitizeFilename,
  analyzeXlsxContent,
  validateMetabaseResponse,
} from '../../utils/index.js';
import { config, authMethod, AuthMethod } from '../../config.js';
import * as XLSX from 'xlsx';
import { SqlExportParams, ExportResponse } from './types.js';
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

export async function exportSqlQuery(
  params: SqlExportParams,
  requestId: string,
  apiClient: MetabaseApiClient,
  logDebug: (message: string, data?: unknown) => void,
  logInfo: (message: string, data?: unknown) => void,
  logWarn: (message: string, data?: unknown, error?: Error) => void,
  logError: (message: string, error: unknown) => void
): Promise<ExportResponse> {
  const { databaseId, query, nativeParameters, format, filename } = params;

  logDebug(`Exporting SQL query in ${format} format from database ID: ${databaseId}`);

  try {
    // Build query request body according to Metabase export API requirements
    const queryData = {
      type: 'native',
      native: {
        query: query,
        template_tags: {},
      },
      parameters: nativeParameters,
      database: databaseId,
    };

    // Use the export endpoint which supports larger result sets (up to 1M rows)
    const exportEndpoint = `/api/dataset/${format}`;

    // Build the request body with required parameters as per API documentation
    const requestBody = {
      query: queryData,
      format_rows: false,
      pivot_results: false,
      visualization_settings: {},
    };

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

        // Check for embedded errors (Metabase returns 200/202 with errors for invalid queries)
        validateMetabaseResponse(
          responseData,
          { operation: 'SQL query export', resourceId: databaseId },
          logError
        );

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
    // For all formats including XLSX, check row count
    const hasData = rowCount !== null && rowCount !== undefined && rowCount > 0;
    if (!hasData) {
      logWarn(`Query returned no data for export`, { requestId });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                message: 'Query executed successfully but returned no data to export',
                query: query,
                database_id: databaseId,
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
    const baseFilename = sanitizedCustomFilename || `metabase_export_${timestamp}`;
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
        query: query,
        database_id: databaseId,
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
      query: query,
      file_path: savedFilePath,
      filename: finalFilename,
      format: format,
      row_count: rowCount,
      database_id: databaseId,
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
      { operation: 'Export query', resourceType: 'database', resourceId: databaseId },
      logError
    );
  }
}
