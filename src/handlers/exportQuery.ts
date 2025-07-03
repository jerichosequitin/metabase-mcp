import { z } from 'zod';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MetabaseApiClient } from '../api.js';
import { ErrorCode, McpError } from '../types.js';
import { handleApiError } from '../utils.js';
import { config, authMethod, AuthMethod } from '../config.js';
import { sanitizeFilename } from '../utils.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function handleExportQuery(
  request: z.infer<typeof CallToolRequestSchema>,
  requestId: string,
  apiClient: MetabaseApiClient,
  logDebug: (message: string, data?: unknown) => void,
  logInfo: (message: string, data?: unknown) => void,
  logWarn: (message: string, data?: unknown, error?: Error) => void,
  logError: (message: string, error: unknown) => void
) {
  const databaseId = request.params?.arguments?.database_id as number;
  const query = request.params?.arguments?.query as string;
  const format = (request.params?.arguments?.format as string) || 'csv';
  const nativeParameters = request.params?.arguments?.native_parameters || [];
  const customFilename = request.params?.arguments?.filename as string;

  if (!databaseId) {
    logWarn('Missing database_id parameter in export_query request', { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      'Database ID parameter is required'
    );
  }

  if (!query) {
    logWarn('Missing query parameter in export_query request', { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      'SQL query parameter is required'
    );
  }

  if (!['csv', 'json', 'xlsx'].includes(format)) {
    logWarn(`Invalid format parameter in export_query request: ${format}`, { requestId });
    throw new McpError(
      ErrorCode.InvalidParams,
      'Format must be one of: csv, json, xlsx'
    );
  }

  logDebug(`Exporting query in ${format} format from database ID: ${databaseId}`);

  try {
    // Build query request body according to Metabase export API requirements
    const queryData = {
      type: 'native',
      native: {
        query: query,
        template_tags: {}
      },
      parameters: nativeParameters,
      database: databaseId
    };

    // Use the export endpoint which supports larger result sets (up to 1M rows)
    const exportEndpoint = `/api/dataset/${format}`;

    // Build the request body with required parameters as per API documentation
    const requestBody = {
      query: queryData,
      format_rows: false,
      pivot_results: false,
      visualization_settings: {}
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
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = `Export API request failed with status ${response.status}: ${response.statusText}`;
      logWarn(errorMessage, errorData);
      throw {
        status: response.status,
        message: response.statusText,
        data: errorData
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
          rowCount = responseData?.data?.rows?.length ||
                    responseData?.rows?.length ||
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
        // For XLSX, we can't easily count rows from ArrayBuffer
        rowCount = undefined;
        logDebug(`XLSX export file size: ${fileSize} bytes`);
      }
    } catch (parseError) {
      logError(`Failed to parse ${format} response: ${parseError}`, parseError);
      throw new Error(`Failed to parse ${format} response: ${parseError}`);
    }

    // Validate that we have data before proceeding with file operations
    // For XLSX, check file size; for others, check row count
    const hasData = format === 'xlsx' ? fileSize > 100 : (rowCount && rowCount > 0);
    if (!hasData) {
      logWarn(`Query returned no data for export`, { requestId });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            message: "Query executed successfully but returned no data to export",
            query: query,
            database_id: databaseId,
            format: format,
            row_count: rowCount
          }, null, 2)
        }]
      };
    }

    // Always save files to Downloads/Metabase directory
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const sanitizedCustomFilename = sanitizeFilename(customFilename);
    const baseFilename = sanitizedCustomFilename || `metabase_export_${timestamp}`;
    const filename = `${baseFilename}.${format}`;

    // Create Metabase subdirectory in Downloads
    const downloadsPath = path.join(os.homedir(), 'Downloads', 'Metabase');
    const savedFilePath = path.join(downloadsPath, filename);

    let fileSaveError: string | undefined;

    try {
      // Ensure Downloads/Metabase directory exists
      if (!fs.existsSync(downloadsPath)) {
        fs.mkdirSync(downloadsPath, { recursive: true });
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
        message: "Export completed but failed to save file",
        error: fileSaveError,
        query: query,
        database_id: databaseId,
        format: format,
        row_count: rowCount,
        intended_file_path: savedFilePath
      };

      // Add file size for all formats
      if (fileSize > 0) {
        errorResponse.file_size_bytes = fileSize;
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(errorResponse, null, 2)
        }],
        isError: true
      };
    }

    // Successful export - return standardized JSON response
    const successResponse: any = {
      success: true,
      message: "Export completed successfully",
      query: query,
      file_path: savedFilePath,
      filename: filename,
      format: format,
      row_count: rowCount,
      database_id: databaseId,
      file_size_bytes: fileSize
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(successResponse, null, 2)
      }]
    };
  } catch (error: any) {
    throw handleApiError(error, {
      operation: 'Export query',
      resourceType: 'database',
      resourceId: databaseId,
      customMessages: {
        '400': 'Invalid query parameters, SQL syntax error, or export format issue. Ensure format is csv, json, or xlsx.',
        '413': 'Export payload too large. Try reducing the result set size or use query filters.',
        '500': 'Database server error. The query may have caused a timeout or database issue.'
      }
    }, logError);
  }
}
