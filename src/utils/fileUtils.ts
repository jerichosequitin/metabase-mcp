/**
 * File handling and sanitization utilities for the Metabase MCP server.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

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
  } catch (_error) {
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

/**
 * Analyze XLSX file to detect if it contains only headers without data rows
 * Provides accurate row counting without needing to run queries twice
 */
export function analyzeXlsxContent(arrayBuffer: ArrayBuffer): {
  hasData: boolean;
  rowCount: number;
  headerCount: number;
} {
  try {
    // Parse the ArrayBuffer using SheetJS
    const workbook = XLSX.read(arrayBuffer);

    // Get the first worksheet (most common case)
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { hasData: false, rowCount: 0, headerCount: 0 };
    }

    const worksheet = workbook.Sheets[sheetName];

    // Convert to array of arrays to analyze structure
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const totalRows = jsonData.length;
    const headerCount = totalRows > 0 ? 1 : 0;
    const dataRowCount = Math.max(0, totalRows - 1);

    // Check if any non-header rows contain actual data
    let hasActualData = false;
    if (dataRowCount > 0) {
      // Check rows after the header (slice(1))
      hasActualData = jsonData.slice(1).some((row: any) => {
        if (!Array.isArray(row)) {
          return false;
        }
        // Check if row has any non-empty cells
        return row.some(
          (cell: any) =>
            cell !== null && cell !== undefined && cell !== '' && String(cell).trim() !== ''
        );
      });
    }

    return {
      hasData: hasActualData,
      rowCount: dataRowCount,
      headerCount,
    };
  } catch (_error) {
    // If XLSX parsing fails, fall back to file size heuristic
    // An XLSX with meaningful data is typically larger than just headers
    const hasData = arrayBuffer.byteLength > 2000; // More conservative threshold
    return {
      hasData,
      rowCount: -1, // Unknown due to parsing error
      headerCount: -1, // Unknown due to parsing error
    };
  }
}
