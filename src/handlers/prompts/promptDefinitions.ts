import { Prompt } from './types.js';

/**
 * Definitions for all available prompts
 */
export const promptDefinitions: Prompt[] = [
  {
    name: 'build_sql_query',
    description:
      'Interactive assistant for building optimized SQL queries with proper joins, filters, and aggregations',
    arguments: [
      {
        name: 'query_goal',
        description:
          'What you want to achieve with this query (e.g., "find top customers by revenue")',
        required: true,
      },
      {
        name: 'database_id',
        description: 'ID of the database to query against',
        required: false,
      },
      {
        name: 'tables',
        description: 'Specific tables you want to include (comma-separated)',
        required: false,
      },
      {
        name: 'time_range',
        description: 'Time range for the analysis (e.g., "last 30 days", "this quarter")',
        required: false,
      },
    ],
  },
  {
    name: 'analyze_dashboard',
    description: 'Comprehensive analysis of a Metabase dashboard with insights and recommendations',
    arguments: [
      {
        name: 'dashboard_id',
        description: 'ID of the dashboard to analyze',
        required: true,
      },
      {
        name: 'analysis_type',
        description: 'Type of analysis: performance, design, data_quality, or comprehensive',
        required: false,
      },
    ],
  },
  {
    name: 'create_business_report',
    description: 'Generate a structured business report with multiple visualizations and insights',
    arguments: [
      {
        name: 'report_topic',
        description: 'Main topic of the report (e.g., "sales performance", "user engagement")',
        required: true,
      },
      {
        name: 'time_period',
        description: 'Time period to analyze (e.g., "Q1 2024", "last 6 months")',
        required: true,
      },
      {
        name: 'target_audience',
        description: 'Who will read this report (e.g., "executives", "marketing team", "analysts")',
        required: false,
      },
      {
        name: 'key_metrics',
        description: 'Specific metrics to include (comma-separated)',
        required: false,
      },
    ],
  },
  {
    name: 'troubleshoot_query_performance',
    description: 'Analyze and optimize slow-running queries with specific recommendations',
    arguments: [
      {
        name: 'query_id',
        description: 'ID of the card/question with performance issues',
        required: false,
      },
      {
        name: 'sql_query',
        description: 'Raw SQL query to analyze (if not using query_id)',
        required: false,
      },
      {
        name: 'database_id',
        description: 'ID of the database where the query runs',
        required: true,
      },
    ],
  },
];
