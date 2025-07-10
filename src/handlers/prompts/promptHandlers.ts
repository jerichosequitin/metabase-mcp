import { generateRequestId } from '../../utils/index.js';
import { ErrorCode, McpError } from '../../types/core.js';
import { MetabaseApiClient } from '../../api.js';
import { promptDefinitions } from './promptDefinitions.js';
import {
  generateQueryBuildingPrompt,
  generateDashboardAnalysisPrompt,
  generateBusinessReportPrompt,
  generatePerformanceTroubleshootingPrompt,
} from './promptGenerators.js';
import { ListPromptsRequest, GetPromptRequest, Prompt, LogFunction } from './types.js';

/**
 * Handle listing all available prompts
 */
export async function handleListPrompts(_request: ListPromptsRequest, logInfo: LogFunction) {
  logInfo('Processing request to list available prompts');

  const prompts: Prompt[] = promptDefinitions.map(prompt => ({
    name: prompt.name,
    description: prompt.description,
    arguments: prompt.arguments,
  }));

  return { prompts };
}

/**
 * Handle getting a specific prompt
 */
export async function handleGetPrompt(
  request: GetPromptRequest,
  apiClient: MetabaseApiClient,
  logInfo: LogFunction,
  logWarn: LogFunction,
  logError: LogFunction
) {
  const requestId = generateRequestId();
  const promptName = request.params?.name;
  const args = request.params?.arguments || {};

  logInfo(`Processing prompt request: ${promptName}`, { requestId, arguments: args });

  await apiClient.getSessionToken();

  try {
    switch (promptName) {
      case 'build_sql_query':
        return generateQueryBuildingPrompt(args, apiClient, logWarn);

      case 'analyze_dashboard':
        return generateDashboardAnalysisPrompt(args, apiClient, logWarn);

      case 'create_business_report':
        return generateBusinessReportPrompt(args);

      case 'troubleshoot_query_performance':
        return generatePerformanceTroubleshootingPrompt(args, apiClient, logWarn);

      default:
        throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${promptName}`);
    }
  } catch (error) {
    logError(`Failed to generate prompt: ${promptName}`, error);
    throw error;
  }
}
