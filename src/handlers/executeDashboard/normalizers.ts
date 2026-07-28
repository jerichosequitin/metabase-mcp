export interface NormalizedCardData {
  rowCount: number;
  originalRowCount: number;
  data: unknown;
}

/**
 * Normalize Metabase response payloads to consistently enforce row limits.
 * Supports row+cols, numbered-key, and array result formats.
 */
export function normalizeCardResponseData(response: any, rowLimit: number): NormalizedCardData {
  // Numbered-key format: {"0": {...}, "1": {...}, "data": {...}}
  const numberedKeys = Object.keys(response || {})
    .filter(key => /^\d+$/.test(key))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  if (numberedKeys.length > 0) {
    const originalRowCount = numberedKeys.length;
    const limitedKeys = numberedKeys.slice(0, rowLimit);
    const limitedData = { ...response };

    numberedKeys.forEach(key => {
      if (!limitedKeys.includes(key)) {
        delete limitedData[key];
      }
    });

    return {
      rowCount: Math.min(originalRowCount, rowLimit),
      originalRowCount,
      data: limitedData,
    };
  }

  // Standard row+cols format: {"data": {"rows": [...], "cols": [...]}}
  if (response?.data?.rows && Array.isArray(response.data.rows)) {
    const originalRowCount = response.data.rows.length;
    const limitedRows = response.data.rows.slice(0, rowLimit);

    return {
      rowCount: Math.min(originalRowCount, rowLimit),
      originalRowCount,
      data: {
        ...response,
        data: {
          ...response.data,
          rows: limitedRows,
        },
      },
    };
  }

  // Plain array format: [{...}, {...}]
  if (Array.isArray(response)) {
    const originalRowCount = response.length;
    const limitedRows = response.slice(0, rowLimit);
    return {
      rowCount: Math.min(originalRowCount, rowLimit),
      originalRowCount,
      data: limitedRows,
    };
  }

  return {
    rowCount: 0,
    originalRowCount: 0,
    data: response,
  };
}
