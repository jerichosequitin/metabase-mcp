import { QueryTemplateCategory } from './types.js';

/**
 * SQL query templates organized by category
 */
export const queryTemplates: Record<QueryTemplateCategory, string> = {
  joins: `-- Common JOIN patterns for Metabase queries

-- Inner Join
SELECT a.*, b.*
FROM table_a a
INNER JOIN table_b b ON a.id = b.foreign_id

-- Left Join with filtering
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '{{start_date}}'
GROUP BY u.id, u.name

-- Multiple table joins
SELECT 
  c.name as customer_name,
  p.name as product_name,
  oi.quantity,
  o.order_date
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id`,

  aggregations: `-- Aggregation patterns for analytics

-- Basic aggregations with grouping
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_records,
  AVG(amount) as avg_amount,
  SUM(amount) as total_amount
FROM transactions
WHERE created_at >= '{{start_date}}'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month

-- Window functions for running totals
SELECT 
  date,
  daily_sales,
  SUM(daily_sales) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) as running_total
FROM daily_sales_summary
ORDER BY date

-- Percentiles and quartiles
SELECT 
  category,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median_price,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price) as q1_price,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price) as q3_price
FROM products
GROUP BY category`,

  filters: `-- Common filtering patterns

-- Date range filtering with parameters
SELECT *
FROM events
WHERE created_at BETWEEN '{{start_date}}' AND '{{end_date}}'

-- Dynamic filtering with optional parameters
SELECT *
FROM products
WHERE 1=1
  [[AND category = {{category}}]]
  [[AND price >= {{min_price}}]]
  [[AND price <= {{max_price}}]]
  [[AND in_stock = {{in_stock}}]]

-- Text search with LIKE patterns
SELECT *
FROM customers
WHERE LOWER(name) LIKE LOWER('%{{search_term}}%')
   OR LOWER(email) LIKE LOWER('%{{search_term}}%')`,

  'time-series': `-- Time series analysis patterns

-- Daily, weekly, monthly aggregations
SELECT 
  DATE_TRUNC('{{time_period}}', created_at) as period,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM transactions
WHERE created_at >= CURRENT_DATE - INTERVAL '{{days_back}} days'
GROUP BY DATE_TRUNC('{{time_period}}', created_at)
ORDER BY period

-- Year-over-year comparison
SELECT 
  EXTRACT(month FROM created_at) as month,
  EXTRACT(year FROM created_at) as year,
  COUNT(*) as count
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY EXTRACT(year FROM created_at), EXTRACT(month FROM created_at)
ORDER BY year, month`,

  cohort: `-- Cohort analysis patterns

-- User retention cohort
WITH first_orders AS (
  SELECT 
    user_id,
    MIN(DATE_TRUNC('month', created_at)) as cohort_month
  FROM orders
  GROUP BY user_id
),
order_periods AS (
  SELECT 
    o.user_id,
    fo.cohort_month,
    DATE_TRUNC('month', o.created_at) as order_month
  FROM orders o
  JOIN first_orders fo ON o.user_id = fo.user_id
)
SELECT 
  cohort_month,
  order_month,
  COUNT(DISTINCT user_id) as users
FROM order_periods
GROUP BY cohort_month, order_month
ORDER BY cohort_month, order_month`,
};

/**
 * Get query template by category
 */
export function getQueryTemplate(category: string): string {
  const availableCategories = Object.keys(queryTemplates);

  if (category in queryTemplates) {
    return queryTemplates[category as QueryTemplateCategory];
  }

  return `-- No templates found for category: ${category}
-- Available categories: ${availableCategories.join(', ')}`;
}
