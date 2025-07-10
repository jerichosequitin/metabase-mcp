// Resource optimization utilities using standardized optimization strategies
// Delegates to the same optimizers used by command tools for consistency

import { OptimizationLevel } from '../retrieve/optimizers.js';

// Re-export optimization level and functions from retrieve optimizers
export {
  OptimizationLevel,
  optimizeCardResponse as optimizeCardResource,
  optimizeDashboardResponse as optimizeDashboardResource,
  optimizeTableResponse as optimizeTableResource,
  optimizeDatabaseResponse as optimizeDatabaseResource,
  optimizeCollectionResponse as optimizeCollectionResource,
  optimizeFieldResponse as optimizeFieldResource,
} from '../retrieve/optimizers.js';

// Re-export optimized types for consistency
export type {
  OptimizedCard as OptimizedResourceCard,
  OptimizedDashboard as OptimizedResourceDashboard,
  OptimizedTable as OptimizedResourceTable,
  OptimizedDatabase as OptimizedResourceDatabase,
  OptimizedCollection as OptimizedResourceCollection,
  OptimizedField as OptimizedResourceField,
} from '../../types/optimized.js';

// Additional resource-specific optimization functions can be added here if needed
// For metrics optimization, we can create a specialized function since it's not in the retrieve handlers

/**
 * Optimize metric response for resource templates using standardized approach
 */
export function optimizeMetricResource(
  metric: any,
  optimizationLevel: OptimizationLevel = OptimizationLevel.STANDARD
): any {
  const optimized: any = {
    id: metric.id,
    name: metric.name,
    retrieved_at: new Date().toISOString(),
  };

  // Add description for standard and aggressive levels
  if (metric.description && optimizationLevel !== OptimizationLevel.ULTRA_MINIMAL) {
    optimized.description = metric.description;
  }

  // Essential metric metadata
  if (metric.definition) {
    optimized.definition = metric.definition;
  }
  if (metric.table_id) {
    optimized.table_id = metric.table_id;
  }
  if (metric.creator_id && optimizationLevel !== OptimizationLevel.ULTRA_MINIMAL) {
    optimized.creator_id = metric.creator_id;
  }
  if (metric.archived !== undefined) {
    optimized.archived = metric.archived;
  }

  // Table info if available - simplified for better context
  if (metric.table) {
    optimized.table = {
      id: metric.table.id,
      name: metric.table.name,
      display_name: metric.table.display_name,
      database_id: metric.table.database_id,
    };
  }

  // Timestamps for standard level only
  if (optimizationLevel === OptimizationLevel.STANDARD) {
    if (metric.created_at) {
      optimized.created_at = metric.created_at;
    }
    if (metric.updated_at) {
      optimized.updated_at = metric.updated_at;
    }
  }

  return optimized;
}
