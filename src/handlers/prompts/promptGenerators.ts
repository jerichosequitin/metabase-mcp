import { ErrorCode, McpError } from '../../types/core.js';
import { MetabaseApiClient } from '../../api.js';
import { AnalysisType, LogFunction } from './types.js';

/**
 * Generate SQL query building prompt
 */
export async function generateQueryBuildingPrompt(
  args: Record<string, any>,
  apiClient: MetabaseApiClient,
  logWarn: LogFunction
) {
  const queryGoal = args.query_goal || 'analyze data';
  const databaseId = args.database_id;
  const tables = args.tables;
  const timeRange = args.time_range || 'recent data';

  let context = '';

  // If database ID provided, get schema information
  if (databaseId) {
    try {
      const dbResponse = await apiClient.getDatabase(parseInt(databaseId, 10));
      const tableList =
        dbResponse.data.tables?.map((t: any) => `- ${t.name} (${t.display_name})`).join('\n') || '';
      context += `\n\nAvailable tables in database "${dbResponse.data.name}":\n${tableList}`;
    } catch (error) {
      logWarn('Could not fetch database schema for prompt', error);
    }
  }

  return {
    description: `SQL Query Builder Assistant`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `I need help building a SQL query to ${queryGoal}.

**Requirements:**
- Goal: ${queryGoal}
- Time range: ${timeRange}
${tables ? `- Preferred tables: ${tables}` : ''}
${databaseId ? `- Target database ID: ${databaseId}` : ''}

${context}

Please help me:
1. Design an optimal SQL query structure
2. Suggest appropriate joins if multiple tables are needed
3. Recommend efficient filtering and aggregation patterns
4. Include proper parameterization for reusability
5. Optimize for performance

Start by asking clarifying questions if needed, then provide a complete, well-commented SQL query.`,
        },
      },
    ],
  };
}

/**
 * Generate dashboard analysis prompt
 */
export async function generateDashboardAnalysisPrompt(
  args: Record<string, any>,
  apiClient: MetabaseApiClient,
  logWarn: LogFunction
) {
  const dashboardId = args.dashboard_id;
  const analysisType: AnalysisType = args.analysis_type || 'comprehensive';

  if (!dashboardId) {
    throw new McpError(ErrorCode.InvalidParams, 'dashboard_id is required for dashboard analysis');
  }

  let dashboardData = '';
  try {
    const dashboard = await apiClient.getDashboard(parseInt(dashboardId, 10));
    dashboardData = JSON.stringify(dashboard.data, null, 2);
  } catch (error) {
    logWarn('Could not fetch dashboard data for prompt', error);
    dashboardData = 'Dashboard data could not be retrieved';
  }

  const analysisInstructions = {
    performance: 'Focus on loading times, query efficiency, and optimization opportunities',
    design: 'Analyze visual design, layout, user experience, and dashboard organization',
    data_quality: 'Examine data accuracy, completeness, and potential data issues',
    comprehensive: 'Provide a complete analysis covering performance, design, and data quality',
  };

  return {
    description: `Dashboard Analysis Assistant`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Please analyze this Metabase dashboard with focus on: ${analysisType}

**Dashboard Data:**
\`\`\`json
${dashboardData}
\`\`\`

**Analysis Instructions:**
${analysisInstructions[analysisType] || analysisInstructions.comprehensive}

Please provide:
1. Executive summary of findings
2. Detailed analysis based on the focus area
3. Specific recommendations for improvement
4. Priority ranking of suggested changes
5. Implementation guidance

Format your response with clear sections and actionable insights.`,
        },
      },
    ],
  };
}

/**
 * Generate business report prompt
 */
export async function generateBusinessReportPrompt(args: Record<string, any>) {
  const reportTopic = args.report_topic;
  const timePeriod = args.time_period;
  const targetAudience = args.target_audience || 'general business audience';
  const keyMetrics = args.key_metrics;

  if (!reportTopic) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'report_topic is required for business report generation'
    );
  }

  if (!timePeriod) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'time_period is required for business report generation'
    );
  }

  return {
    description: `Business Report Generator`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a comprehensive business report on: "${reportTopic}"

**Report Parameters:**
- Topic: ${reportTopic}
- Time Period: ${timePeriod}
- Target Audience: ${targetAudience}
${keyMetrics ? `- Key Metrics to Include: ${keyMetrics}` : ''}

**Please structure the report with:**

1. **Executive Summary** (2-3 key takeaways)
2. **Data Collection Plan** (what queries/dashboards to use)
3. **Key Metrics Analysis** (specific calculations and comparisons)
4. **Trends and Insights** (patterns and notable findings)
5. **Recommendations** (actionable next steps)
6. **Supporting Visualizations** (chart types and data requirements)

**For each section, provide:**
- Specific Metabase queries or dashboard references
- Data interpretation guidelines
- Visual presentation suggestions
- Key messages for the ${targetAudience}

Start by outlining the report structure, then guide me through collecting and analyzing the data step by step.`,
        },
      },
    ],
  };
}

/**
 * Generate performance troubleshooting prompt
 */
export async function generatePerformanceTroubleshootingPrompt(
  args: Record<string, any>,
  apiClient: MetabaseApiClient,
  logWarn: LogFunction
) {
  const queryId = args.query_id;
  const sqlQuery = args.sql_query;
  const databaseId = args.database_id;

  if (!queryId && !sqlQuery) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Either query_id or sql_query is required for performance troubleshooting'
    );
  }

  if (!databaseId) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'database_id is required for performance troubleshooting'
    );
  }

  let queryContext = '';

  // If query ID provided, fetch the query details
  if (queryId) {
    try {
      const cardResponse = await apiClient.getCard(parseInt(queryId, 10));
      const query =
        cardResponse.data.dataset_query?.native?.query || cardResponse.data.dataset_query;
      queryContext = `\n**Query from Card ${queryId}:**\n\`\`\`sql\n${typeof query === 'string' ? query : JSON.stringify(query, null, 2)}\n\`\`\``;
    } catch (error) {
      logWarn('Could not fetch query for performance troubleshooting', error);
    }
  } else if (sqlQuery) {
    queryContext = `\n**Provided SQL Query:**\n\`\`\`sql\n${sqlQuery}\n\`\`\``;
  }

  // Get database schema information
  let schemaContext = '';
  try {
    const dbResponse = await apiClient.getDatabase(parseInt(databaseId, 10));
    const tableInfo =
      dbResponse.data.tables
        ?.map((t: any) => `- ${t.name}: ${t.rows || 'unknown'} rows`)
        .join('\n') || '';
    schemaContext = `\n**Database: "${dbResponse.data.name}"**\nTables:\n${tableInfo}`;
  } catch (error) {
    logWarn('Could not fetch database schema for performance prompt', error);
  }

  return {
    description: `Query Performance Troubleshooting Assistant`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Help me troubleshoot and optimize this slow-running query.

${queryContext}

${schemaContext}

**Please analyze and provide:**

1. **Performance Assessment**
   - Identify potential bottlenecks
   - Estimate query complexity
   - Highlight expensive operations

2. **Optimization Recommendations**
   - Index suggestions
   - Query restructuring options
   - Join optimization
   - Filter improvements

3. **Alternative Approaches**
   - Different query patterns
   - Data model improvements
   - Caching strategies

4. **Implementation Plan**
   - Priority order for optimizations
   - Expected performance impact
   - Testing approach

5. **Monitoring Setup**
   - Key metrics to track
   - Performance benchmarks
   - Alert thresholds

Start with the most impactful optimizations and provide specific, actionable recommendations.`,
        },
      },
    ],
  };
}
