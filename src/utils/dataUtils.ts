/**
 * Data manipulation and optimization utilities for the Metabase MCP server.
 */

/**
 * Minimal card interface containing only the fields needed by MCP operations
 */
export interface MinimalCard {
  id: number;
  name: string;
  description?: string;
  database_id: number;
  dataset_query?: {
    type?: string;
    native?: {
      query?: string;
      template_tags?: Record<string, any>;
    };
  };
  collection_id?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Minimal dashboard card interface containing only the fields needed by MCP operations
 */
export interface MinimalDashboardCard {
  id: number;
  card_id: number;
  dashboard_id: number;
  row: number;
  col: number;
  size_x: number;
  size_y: number;
  parameter_mappings?: Array<{
    parameter_id: string;
    card_id: number;
    target: any;
  }>;
  visualization_settings?: Record<string, any>;
  card?: {
    id: number;
    name: string;
    description?: string;
    database_id: number;
    query_type?: string;
    display?: string;
    dataset_query?: {
      type?: string;
      native?: {
        query?: string;
        template_tags?: Record<string, any>;
      };
    };
  };
}

/**
 * Strip unnecessary fields from card objects to improve memory usage and performance
 * Only keeps fields that are actually used in MCP operations
 */
export function stripCardFields(card: any): MinimalCard {
  const result: MinimalCard = {
    id: card.id,
    name: card.name,
    database_id: card.database_id,
  };

  // Only add optional fields if they exist to reduce memory footprint
  if (card.description) {
    result.description = card.description;
  }

  if (card.dataset_query) {
    result.dataset_query = {
      type: card.dataset_query.type,
      native: card.dataset_query.native
        ? {
            query: card.dataset_query.native.query,
            template_tags: card.dataset_query.native.template_tags,
          }
        : undefined,
    };
  }

  if (card.collection_id !== null && card.collection_id !== undefined) {
    result.collection_id = card.collection_id;
  }

  if (card.created_at) {
    result.created_at = card.created_at;
  }

  if (card.updated_at) {
    result.updated_at = card.updated_at;
  }

  return result;
}

/**
 * Strip unnecessary fields from dashboard card objects to improve memory usage and performance
 * Only keeps fields that are actually used in MCP operations
 */
export function stripDashboardCardFields(dashcard: any): MinimalDashboardCard {
  const result: MinimalDashboardCard = {
    id: dashcard.id,
    card_id: dashcard.card_id,
    dashboard_id: dashcard.dashboard_id,
    row: dashcard.row,
    col: dashcard.col,
    size_x: dashcard.size_x,
    size_y: dashcard.size_y,
  };

  // Only add optional fields if they exist to reduce memory footprint
  if (dashcard.parameter_mappings && Array.isArray(dashcard.parameter_mappings)) {
    result.parameter_mappings = dashcard.parameter_mappings.map((mapping: any) => ({
      parameter_id: mapping.parameter_id,
      card_id: mapping.card_id,
      target: mapping.target,
    }));
  }

  if (dashcard.visualization_settings && Object.keys(dashcard.visualization_settings).length > 0) {
    result.visualization_settings = dashcard.visualization_settings;
  }

  // Strip the nested card object using the existing stripCardFields logic
  if (dashcard.card) {
    result.card = {
      id: dashcard.card.id,
      name: dashcard.card.name,
      database_id: dashcard.card.database_id,
    };

    // Only add optional card fields if they exist
    if (dashcard.card.description) {
      result.card.description = dashcard.card.description;
    }

    if (dashcard.card.query_type) {
      result.card.query_type = dashcard.card.query_type;
    }

    if (dashcard.card.display) {
      result.card.display = dashcard.card.display;
    }

    if (dashcard.card.dataset_query) {
      result.card.dataset_query = {
        type: dashcard.card.dataset_query.type,
        native: dashcard.card.dataset_query.native
          ? {
              query: dashcard.card.dataset_query.native.query,
              template_tags: dashcard.card.dataset_query.native.template_tags,
            }
          : undefined,
      };
    }
  }

  return result;
}
