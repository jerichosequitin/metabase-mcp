/**
 * Response optimizers for execute operations to reduce token usage
 * while preserving essential data for result interpretation
 */

/**
 * Optimized execute response data structure using card-style format
 * Converts rows+cols format to numbered objects for maximum token efficiency
 */
export interface OptimizedExecuteData {
  [key: string]: any; // Numbered keys like "0", "1", "2" with row objects
}

/**
 * Optimize execute query response by converting rows+cols format to card-style
 * numbered objects, eliminating column metadata overhead entirely
 */
export function optimizeExecuteData(responseData: any): OptimizedExecuteData {
  const rows = responseData?.rows || [];
  const cols = responseData?.cols || [];

  const optimized: OptimizedExecuteData = {};

  // Transform each row from array format to object format
  rows.forEach((row: any[], index: number) => {
    const rowObject: Record<string, any> = {};

    // Map each column value to its field name
    row.forEach((value: any, colIndex: number) => {
      const column = cols[colIndex];
      if (column?.name) {
        rowObject[column.name] = value;
      }
    });

    // Add as numbered entry (matching card execution format)
    optimized[index.toString()] = rowObject;
  });

  return optimized;
}
