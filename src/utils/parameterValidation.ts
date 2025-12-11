import { ErrorCode, McpError, isMcpError } from '../types/core.js';
import { validateNonEmptyString } from './validation.js';

export interface MetabaseCardParameter {
  id: string;
  slug: string;
  target: [string, [string, string]];
  type: string;
  value: string | number | boolean;
}

export function validateCardParameters(
  cardParameters: any[],
  requestId: string,
  logWarn: (message: string, data?: unknown, error?: Error) => void
): void {
  if (!Array.isArray(cardParameters)) {
    logWarn('card_parameters must be an array', { requestId });
    throw new McpError(ErrorCode.InvalidParams, 'card_parameters must be an array');
  }

  for (let i = 0; i < cardParameters.length; i++) {
    const param = cardParameters[i];
    const paramIndex = `parameter ${i}`;

    if (!param || typeof param !== 'object') {
      logWarn(`Invalid card parameter at index ${i}: must be an object`, { requestId, param });
      throw new McpError(ErrorCode.InvalidParams, `Card parameter at index ${i} must be an object`);
    }

    // Validate required fields
    const requiredFields = ['id', 'slug', 'target', 'type', 'value'];
    for (const field of requiredFields) {
      if (!(field in param)) {
        logWarn(`Missing required field '${field}' in ${paramIndex}`, { requestId, param });
        throw new McpError(
          ErrorCode.InvalidParams,
          `Card parameter at index ${i} is missing required field '${field}'`
        );
      }
    }

    // Validate field types using validation utilities
    try {
      validateNonEmptyString(param.id, `${paramIndex} 'id' field`, requestId, logWarn);
      validateNonEmptyString(param.slug, `${paramIndex} 'slug' field`, requestId, logWarn);
      validateNonEmptyString(param.type, `${paramIndex} 'type' field`, requestId, logWarn);
    } catch (error) {
      if (isMcpError(error)) {
        throw new McpError(
          error.code,
          `Card parameter at index ${i} has invalid field: ${error.message}`
        );
      }
      throw error;
    }

    // Validate target array structure
    if (!Array.isArray(param.target)) {
      logWarn(`Invalid 'target' field in ${paramIndex}: must be an array`, { requestId, param });
      throw new McpError(
        ErrorCode.InvalidParams,
        `Card parameter at index ${i} has invalid 'target' field: must be an array`
      );
    }

    if (param.target.length !== 2) {
      logWarn(`Invalid 'target' field in ${paramIndex}: must have exactly 2 elements`, {
        requestId,
        param,
      });
      throw new McpError(
        ErrorCode.InvalidParams,
        `Card parameter at index ${i} has invalid 'target' field: must have exactly 2 elements`
      );
    }

    if (typeof param.target[0] !== 'string') {
      logWarn(`Invalid 'target' field in ${paramIndex}: first element must be a string`, {
        requestId,
        param,
      });
      throw new McpError(
        ErrorCode.InvalidParams,
        `Card parameter at index ${i} has invalid 'target' field: first element must be a string`
      );
    }

    if (!Array.isArray(param.target[1]) || param.target[1].length !== 2) {
      logWarn(
        `Invalid 'target' field in ${paramIndex}: second element must be an array with 2 elements`,
        { requestId, param }
      );
      throw new McpError(
        ErrorCode.InvalidParams,
        `Card parameter at index ${i} has invalid 'target' field: second element must be an array with 2 elements`
      );
    }

    if (typeof param.target[1][0] !== 'string' || typeof param.target[1][1] !== 'string') {
      logWarn(
        `Invalid 'target' field in ${paramIndex}: second element array must contain only strings`,
        { requestId, param }
      );
      throw new McpError(
        ErrorCode.InvalidParams,
        `Card parameter at index ${i} has invalid 'target' field: second element array must contain only strings`
      );
    }

    // Validate value field (can be string, number, or boolean)
    const valueType = typeof param.value;
    if (valueType !== 'string' && valueType !== 'number' && valueType !== 'boolean') {
      logWarn(`Invalid 'value' field in ${paramIndex}: must be string, number, or boolean`, {
        requestId,
        param,
      });
      throw new McpError(
        ErrorCode.InvalidParams,
        `Card parameter at index ${i} has invalid 'value' field: must be string, number, or boolean`
      );
    }

    // Additional validation for string values (not empty)
    if (valueType === 'string' && (param.value as string).trim() === '') {
      logWarn(`Invalid 'value' field in ${paramIndex}: string value cannot be empty`, {
        requestId,
        param,
      });
      throw new McpError(
        ErrorCode.InvalidParams,
        `Card parameter at index ${i} has invalid 'value' field: string value cannot be empty`
      );
    }
  }
}
