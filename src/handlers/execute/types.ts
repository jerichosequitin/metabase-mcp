export interface ExecuteRequest {
  database_id?: number;
  query?: string;
  card_id?: number;
  native_parameters?: any[];
  card_parameters?: any[];
  row_limit?: number;
  collection?: string;
}

export interface SqlExecutionParams {
  databaseId: number;
  query: string;
  nativeParameters: any[];
  rowLimit: number;
  collection?: string;
}

export interface CardExecutionParams {
  cardId: number;
  cardParameters: any[];
  rowLimit: number;
}

export interface ExecutionResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}
