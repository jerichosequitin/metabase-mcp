export interface ExportRequest {
  database_id?: number;
  query?: string;
  card_id?: number;
  native_parameters?: any[];
  card_parameters?: any[];
  format?: 'csv' | 'json' | 'xlsx';
  filename?: string;
}

export interface SqlExportParams {
  databaseId: number;
  query: string;
  nativeParameters: any[];
  format: 'csv' | 'json' | 'xlsx';
  filename?: string;
}

export interface CardExportParams {
  cardId: number;
  cardParameters: any[];
  format: 'csv' | 'json' | 'xlsx';
  filename?: string;
}

export interface ExportResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}
