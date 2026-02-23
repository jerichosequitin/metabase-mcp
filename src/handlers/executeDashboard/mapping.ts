import type { MetabaseCardParameter } from '../../utils/parameterValidation.js';
import { DashboardFilterValue, DashboardParameterInfo } from './types.js';

function isValidMetabaseTarget(target: unknown): target is [string, [string, string]] {
  if (!Array.isArray(target) || target.length !== 2) {
    return false;
  }

  if (typeof target[0] !== 'string') {
    return false;
  }

  if (!Array.isArray(target[1]) || target[1].length !== 2) {
    return false;
  }

  return typeof target[1][0] === 'string' && typeof target[1][1] === 'string';
}

interface CardMappingResult {
  cardParameters: MetabaseCardParameter[];
  warnings: string[];
}

/**
 * Map dashboard-level filter values (slug->value) into card parameters
 * using dashcard parameter mappings.
 */
export function mapDashboardFiltersToCardParameters(
  dashcardId: number,
  dashboardFilters: Record<string, DashboardFilterValue>,
  parameterMappings: unknown[],
  dashboardParameterBySlug: Map<string, DashboardParameterInfo>
): CardMappingResult {
  const warnings = new Set<string>();
  const cardParameters: MetabaseCardParameter[] = [];

  if (Object.keys(dashboardFilters).length === 0) {
    return { cardParameters, warnings: [] };
  }

  const safeMappings = Array.isArray(parameterMappings) ? parameterMappings : [];

  for (const [slug, value] of Object.entries(dashboardFilters)) {
    const dashboardParam = dashboardParameterBySlug.get(slug);
    if (!dashboardParam) {
      continue;
    }

    const mappedTargets = safeMappings.filter(
      (mapping: any) => String(mapping?.parameter_id ?? '') === dashboardParam.id
    );

    if (mappedTargets.length === 0) {
      warnings.add(
        `Dashcard ${dashcardId} has no parameter mapping for dashboard filter "${slug}"`
      );
      continue;
    }

    for (const mapping of mappedTargets) {
      const target = (mapping as any)?.target;
      if (!isValidMetabaseTarget(target)) {
        warnings.add(
          `Dashcard ${dashcardId} has invalid target mapping for dashboard filter "${slug}"`
        );
        continue;
      }

      cardParameters.push({
        id: dashboardParam.id,
        slug: dashboardParam.slug,
        type: dashboardParam.type,
        target,
        value,
      });
    }
  }

  return { cardParameters, warnings: Array.from(warnings) };
}
