export type DashboardFilterPrimitive = string | number | boolean;
export type DashboardFilterValue = DashboardFilterPrimitive | DashboardFilterPrimitive[];

export interface ExecuteDashboardRequest {
  dashboard_id?: number;
  dashboard_url?: string;
  dashboard_filters?: Record<string, DashboardFilterValue>;
  row_limit?: number;
}

export interface DashboardExecutionResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export interface DashboardParameterInfo {
  id: string;
  slug: string;
  type: string;
  name: string;
}

export interface ExecutableDashcard {
  dashcardId: number;
  cardId: number;
  cardName: string;
  parameterMappings: unknown[];
}

export interface SkippedDashcard {
  dashcard_id: number | null;
  card_id: number | null;
  reason: string;
}

export interface DashboardCardExecutionError {
  dashcard_id: number;
  card_id: number;
  card_name: string;
  error: string;
}
