import type { CallToolRequest } from '@modelcontextprotocol/server';
import { ErrorCode, McpError } from '../types/core.js';

interface NumericArgumentConfig {
  scalar?: readonly string[];
  array?: readonly string[];
}

const NUMERIC_ARGUMENTS_BY_TOOL: Record<string, NumericArgumentConfig> = {
  search: {
    scalar: ['max_results', 'database_id'],
    array: ['ids'],
  },
  retrieve: {
    scalar: ['table_offset', 'table_limit'],
    array: ['ids'],
  },
  list: {
    scalar: ['offset', 'limit'],
  },
  execute: {
    scalar: ['database_id', 'card_id', 'row_limit'],
  },
  export: {
    scalar: ['database_id', 'card_id'],
  },
};

const INTEGER_STRING_PATTERN = /^-?\d+$/;

function normalizeInteger(value: unknown, path: string): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, `${path} must be an integer`);
  }

  const normalizedValue = value.trim();
  if (!INTEGER_STRING_PATTERN.test(normalizedValue)) {
    throw new McpError(ErrorCode.InvalidParams, `${path} must be an integer`);
  }

  const numericValue = Number(normalizedValue);
  if (!Number.isSafeInteger(numericValue)) {
    throw new McpError(ErrorCode.InvalidParams, `${path} must be a safe integer`);
  }

  return numericValue;
}

export function normalizeToolArguments(request: CallToolRequest): CallToolRequest {
  const config = NUMERIC_ARGUMENTS_BY_TOOL[request.params.name];
  const args = request.params.arguments;

  if (!config || !args) {
    return request;
  }

  const normalizedArguments = { ...args };

  for (const field of config.scalar || []) {
    if (normalizedArguments[field] !== undefined) {
      normalizedArguments[field] = normalizeInteger(normalizedArguments[field], field);
    }
  }

  for (const field of config.array || []) {
    const value = normalizedArguments[field];
    if (value === undefined) {
      continue;
    }

    if (!Array.isArray(value)) {
      throw new McpError(ErrorCode.InvalidParams, `${field} must be an array of integers`);
    }

    normalizedArguments[field] = value.map((item, index) =>
      normalizeInteger(item, `${field}[${index}]`)
    );
  }

  return {
    ...request,
    params: {
      ...request.params,
      arguments: normalizedArguments,
    },
  };
}
