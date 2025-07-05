/**
 * File handling and sanitization utilities for the Metabase MCP server.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string | undefined): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  // Remove path separators and other dangerous characters
  // Keep only alphanumeric, hyphens, underscores, spaces, and dots
  return filename
    .replace(/[/\\:*?"<>|]/g, '') // Remove path separators and invalid filename chars
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/^\.+/, '') // Remove leading dots
    .trim()
    .substring(0, 255); // Limit length to prevent filesystem issues
}

/**
 * Generate standardized export result message
 */
export function generateExportMessage(
  format: string,
  query: string,
  databaseId: number,
  rowCount: number,
  fileSize: string,
  saveFile: boolean,
  savedFilePath: string,
  filename: string,
  fileSaveError?: string
): string {
  const queryPreview = query.length > 100 ? `${query.substring(0, 100)}...` : query;

  let statusMessage = '';
  if (saveFile) {
    if (fileSaveError) {
      statusMessage = `\nFile Save Status: FAILED - ${fileSaveError}\nFallback: Use manual copy-paste method below\n`;
    } else {
      statusMessage = `\nFile Save Status: SUCCESS\nFile Location: ${savedFilePath}\nDownloads Folder: Available for use\n`;
    }
  }

  const formatUpper = format.toUpperCase();

  return `# Query Export Results (${formatUpper} Format)

Query: ${queryPreview}
Database ID: ${databaseId}
${format === 'xlsx' ? `File Size: ${fileSize} bytes` : `Rows Exported: ${rowCount.toLocaleString()}`}
Export Method: Metabase high-capacity API (supports up to 1M rows)${statusMessage}

## Manual Save Instructions${saveFile && !fileSaveError ? ' (Alternative Method)' : ''}:

1. Select all the ${formatUpper} content below${format === 'csv' ? ' (between the ```csv markers)' : ''}
2. Copy the selected text (Cmd+C / Ctrl+C)
3. Open a ${format === 'xlsx' ? 'spreadsheet application' : format === 'json' ? 'text editor' : 'text editor or spreadsheet application'}
4. Paste the content (Cmd+V / Ctrl+V)
5. Save as: ${filename}

## ${formatUpper} Data:

${
  format === 'xlsx'
    ? `Excel file exported successfully. ${
        saveFile && !fileSaveError
          ? `File has been saved to: ${savedFilePath}\nCompatible with: Excel, Google Sheets, LibreOffice Calc, and other spreadsheet applications`
          : 'To save this Excel file:\n1. Set save_file: true in your export_query parameters\n2. The file will be automatically saved to your Downloads folder\n3. Open with Excel, Google Sheets, or any spreadsheet application'
      }\n\nTechnical Details:\n- Binary Data: Contains Excel binary data (.xlsx format)\n- High Capacity: Supports up to 1 million rows (vs. 2,000 row limit of standard queries)\n- Native Format: Preserves data types and formatting for spreadsheet applications`
    : '```' + format + '\n'
}`;
}

/**
 * Save raw response structure to reference file for documentation
 * Used to maintain field references for optimization decisions
 */
export function saveRawStructure(model: string, rawData: any, enableSave: boolean = false): void {
  if (!enableSave) {
    return;
  }

  try {
    const docsDir = path.join(process.cwd(), 'docs', 'reference-responses');
    const filePath = path.join(docsDir, `${model}-raw-response.json`);

    // Generate structure and flattened fields
    const structure = generateTypeStructure(rawData);
    const flattenedFields = generateFlattenedFields(rawData).sort();

    const referenceDoc = {
      model,
      description: `Raw response structure for a Metabase ${model}. This shows the field structure without actual data values.`,
      status: 'AUTO-GENERATED from actual API response',
      generated_at: new Date().toISOString(),
      optimization_notes: {
        essential_fields: [],
        fields_to_investigate: [],
        likely_removable_fields: [],
        note: 'These fields need to be manually categorized based on usage analysis',
      },
      response_structure: structure,
      flattened_fields: flattenedFields,
    };

    // Ensure directory exists
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(referenceDoc, null, 2));
    // Debug: Saved raw structure for analysis
  } catch (error) {
    // Debug: Failed to save raw structure
  }
}

/**
 * Generate a flattened field list from a nested object structure
 * Used for creating reference documentation of API response structures
 */
export function generateFlattenedFields(obj: any, prefix = '', result: string[] = []): string[] {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Nested object - recurse
        generateFlattenedFields(value, currentPath, result);
      } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        // Array of objects - add array notation and recurse with first element
        result.push(`${currentPath}[]`);
        generateFlattenedFields(value[0], `${currentPath}[]`, result);
      } else {
        // Leaf node
        result.push(currentPath);
      }
    }
  }
  return result;
}

/**
 * Convert actual data to type structure for documentation
 * Removes actual values and shows only the data structure/types
 */
export function generateTypeStructure(obj: any): any {
  if (obj === null) {
    return 'null';
  }
  if (obj === undefined) {
    return 'undefined';
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return 'array (empty)';
    }
    return [generateTypeStructure(obj[0])];
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = generateTypeStructure(obj[key]);
      }
    }
    return result;
  }

  // Primitive types
  if (typeof obj === 'string') {
    // Check if it looks like a date
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
      return 'string (ISO date)';
    }
    // Check if it looks like a UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(obj)) {
      return 'string (UUID)';
    }
    return 'string';
  }

  return typeof obj;
}
