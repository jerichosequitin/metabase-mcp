# Metabase MCP Server

[![smithery badge](https://smithery.ai/badge/@jerichosequitin/metabase-mcp)](https://smithery.ai/server/@jerichosequitin/metabase-mcp)

**Author**: Jericho Sequitin (@jerichosequitin)

A lightweight, enterprise-grade Model Context Protocol server designed for high-performance integration between AI assistants and Metabase analytics platforms. Built with intelligent caching, response optimization, and unified command architecture for production environments.

## Overview

This TypeScript-based MCP server provides seamless integration with the Metabase API, enabling AI assistants to directly interact with your analytics data with enterprise-level performance and reliability. Designed for Claude and other MCP-compatible AI assistants, this server acts as an optimized bridge between your analytics platform and conversational AI.

### Key Features

- **High Performance**: Aggressive response optimization with up to 90% token reduction*
- **Unified Commands**: Streamlined `list`, `retrieve`, and `search` commands for all resource types
- **Intelligent Caching**: Multi-layer caching system with configurable TTL and fallback support
- **Enterprise Authentication**: Support for both session-based and API key authentication
- **Advanced Search**: Native Metabase search API with model-specific filtering
- **Data Export**: High-capacity export (up to 1M rows) in CSV, JSON, and XLSX formats
- **Structured Data Access**: JSON-formatted responses optimized for AI consumption
- **Comprehensive Logging**: Detailed logging with performance metrics and debugging
- **Robust Error Handling**: Graceful error handling with clear error messages
- **Concurrent Processing**: Batch processing with controlled concurrency for optimal performance

*Performance optimization figures are based on internal testing and may vary depending on your Metabase instance configuration and data complexity.

## Available Tools

The server exposes the following optimized tools for AI assistants:

### Unified Core Tools
- **`list`**: Fetch ALL records for a single resource type with highly optimized responses
  - Supports: `cards`, `dashboards`, `tables`, `databases`, `collections`
  - Returns only essential identifier fields for efficient browsing
  - Intelligent caching with performance metrics

- **`retrieve`**: Get detailed information for specific items by ID
  - Supports: `card`, `dashboard`, `table`, `database`, `collection`, `field`
  - Concurrent processing with controlled batch sizes
  - Aggressive response optimization (75-90% token reduction)*

- **`search`**: Unified search across all Metabase items using native search API
  - Supports all model types with advanced filtering
  - Search by name, ID, content, or database
  - Includes dashboard questions and native query search

### Query Execution Tools
- **`execute`**: Unified command for executing SQL queries or saved cards (2K row limit)
  - **SQL Mode**: Execute custom SQL queries with database_id and query parameters
  - **Card Mode**: Execute saved Metabase cards with card_id parameter and optional filtering
  - **Card Parameters**: Filter card results using `card_parameters` array with name/value pairs
  - Enhanced with proper LIMIT clause handling and parameter validation
  - Intelligent mode detection with strict parameter validation

- **`export`**: Unified command for exporting large datasets (up to 1M rows)
  - **SQL Mode**: Export custom SQL query results with database_id and query parameters
  - **Card Mode**: Export saved Metabase card results with card_id parameter and optional filtering
  - **Card Parameters**: Filter card results before export using `card_parameters` array
  - Supports CSV, JSON, and XLSX formats with case-insensitive format handling
  - Automatic file saving to ~/Downloads/Metabase/ with custom naming support
  - Enhanced validation including positive ID validation

### Utility Tools
- **`clear_cache`**: Clear internal cache with granular control
  - Supports model-specific cache clearing for both individual items and lists
  - Individual item caches: `cards`, `dashboards`, `tables`, `databases`, `collections`, `fields`
  - List caches: `cards-list`, `dashboards-list`, `tables-list`, `databases-list`, `collections-list`
  - Bulk operations: `all`, `all-individual`, `all-lists`

## Performance Optimizations

### Response Optimization
- **Cards**: ~90% reduction (45,000+ → 4,000-5,000 characters)*
- **Dashboards**: ~85% reduction (50,000+ → 7,500 characters)*
- **Tables**: ~80% reduction (40,000+ → 8,000 characters)*
- **Databases**: ~75% reduction (25,000+ → 6,000-7,500 characters)*
- **Collections**: ~15% reduction (2,500+ → 2,000 characters)*
- **Fields**: ~75% reduction (15,000+ → 3,000-4,000 characters)*

*Token reduction figures are based on typical Metabase responses and may vary depending on your specific data structure and configuration.

### Caching System
- **Multi-layer Caching**: Separate caches for individual items and bulk lists
- **Configurable TTL**: Default 10-minute cache duration with environment variable control
- **Fallback Support**: Stale cache data returned during API failures
- **Cache Metrics**: Detailed performance tracking and hit/miss reporting

### Concurrent Processing
- **Batch Processing**: Controlled concurrency for retrieve operations
- **Rate Limiting**: Prevents API overload with intelligent batching
- **Performance Metrics**: Real-time processing statistics and time savings

## Configuration

The server supports two authentication methods:

### Option 1: Username and Password Authentication

```bash
# Required
METABASE_URL=https://your-metabase-instance.com
METABASE_USER_EMAIL=your_email@example.com
METABASE_PASSWORD=your_password

# Optional Performance Settings
LOG_LEVEL=info # Options: debug, info, warn, error, fatal
CACHE_TTL_MS=600000 # Cache duration in milliseconds (default: 10 minutes)
REQUEST_TIMEOUT_MS=600000 # Request timeout in milliseconds (default: 10 minutes)
```

### Option 2: API Key Authentication (Recommended for Production)

```bash
# Required
METABASE_URL=https://your-metabase-instance.com
METABASE_API_KEY=your_api_key

# Optional Performance Settings
LOG_LEVEL=info
CACHE_TTL_MS=600000
REQUEST_TIMEOUT_MS=600000
```

You can set these environment variables directly or use a `.env` file with [dotenv](https://www.npmjs.com/package/dotenv).

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- An active Metabase instance with appropriate credentials

### Development Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start

# For development with auto-rebuild and concurrent watching
npm run dev:watch
```

### Available Scripts

```bash
# Development
npm run dev:watch        # Concurrent TypeScript compilation and nodemon
npm run watch           # TypeScript watch mode only
npm run dev            # Build and run once

# Production
npm run build          # Build TypeScript to JavaScript
npm run build:clean    # Clean build and rebuild
npm start             # Start the built server

# Quality Assurance
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues
npm run format        # Format code with Prettier
npm run format:check  # Check formatting
npm run type-check    # TypeScript type checking
npm run validate      # Run all QA checks

# Debugging
npm run inspector     # Start with MCP Inspector
npm run clean         # Clean build artifacts
```

### Local Development Setup

For local development and testing, follow these steps:

1. **Clone and build the project**:
   ```bash
   git clone <https://github.com/jerichosequitin/metabase-mcp.git>
   cd metabase-mcp
   npm install
   npm run build
   ```

2. **Set up environment variables**:
   Create a `.env` file in the project root:
   ```bash
   # Required - Your Metabase instance
   METABASE_URL=https://your-metabase-instance.com

   # Authentication (choose one method)
   # Method 1: API Key (recommended)
   METABASE_API_KEY=your_api_key_here

   # Method 2: Username/Password
   # METABASE_USER_EMAIL=your_email@example.com
   # METABASE_PASSWORD=your_password

   # Optional settings
   LOG_LEVEL=info
   CACHE_TTL_MS=600000
   REQUEST_TIMEOUT_MS=600000
   ```

3. **Verify the build**:
   ```bash
   # Verify the build was successful
   ls -la build/src/index.js

   # Optional: Test the server manually (for development/debugging only)
   # npm start
   ```

### Claude Desktop Integration

To integrate with Claude Desktop, you'll need to configure the MCP server in Claude's configuration file.

#### Configuration File Locations:
- **MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

#### For Local Development:
```json
{
  "mcpServers": {
    "metabase-mcp": {
      "command": "/Users/your-username/path/to/metabase-mcp/build/src/index.js",
      "env": {
        "METABASE_URL": "https://your-metabase-instance.com",
        "METABASE_API_KEY": "your_api_key_here",
        "LOG_LEVEL": "info",
        "CACHE_TTL_MS": "600000"
      }
    }
  }
}
```

#### For Production/Installed Package:
```json
{
  "mcpServers": {
    "metabase-mcp": {
      "command": "metabase-mcp",
      "env": {
        "METABASE_URL": "https://your-metabase-instance.com",
        "METABASE_API_KEY": "your_api_key_here",
        "LOG_LEVEL": "info",
        "CACHE_TTL_MS": "600000"
      }
    }
  }
}
```

#### Important Notes:
- **Use absolute paths** for local development (e.g., `/Users/username/Documents/metabase-mcp/build/src/index.js`)
- **Replace `your-username`** with your actual username
- **Replace `path/to/metabase-mcp`** with the actual path to your cloned repository
- **No need to run the server manually** - Claude Desktop will automatically start and manage the MCP server process
- **Never commit real credentials** to version control
- **Restart Claude Desktop** after making configuration changes

#### Troubleshooting:
- Ensure the path to `build/src/index.js` is correct and the file exists
- Verify your Metabase credentials are valid
- Check Claude Desktop's logs for any connection errors
- Make sure the server builds successfully with `npm run build`

## Usage Examples

### List All Resources
```javascript
// Get overview of all cards
list({ model: "cards" })

// Get overview of all dashboards
list({ model: "dashboards" })

// Get overview of all tables
list({ model: "tables" })

// Get overview of all databases
list({ model: "databases" })

// Get overview of all collections
list({ model: "collections" })
```

### Retrieve Detailed Information
```javascript
// Get detailed information for specific cards
retrieve({ model: "card", ids: [1, 2, 3] })

// Get detailed dashboard information
retrieve({ model: "dashboard", ids: [42] })

// Get table schema information
retrieve({ model: "table", ids: [10, 11] })
```

### Advanced Search
```javascript
// Search across all model types
search({
  query: "sales",
  models: ["card", "dashboard"],
  max_results: 20
})

// Search with database filtering
search({
  query: "user data",
  models: ["card"],
  database_id: 1,
  search_native_query: true
})

// Search by specific IDs
search({
  ids: [1, 2, 3],
  models: ["card"]
})
```

### Query Execution Workflow

#### Card Parameters Format
When using card mode for both `execute` and `export` commands, you can filter results using the `card_parameters` array. Each parameter follows Metabase's internal parameter structure:

```javascript
{
  "id": "parameter-uuid",           // UUID of the parameter
  "slug": "parameter_name",         // Parameter name/slug
  "target": ["dimension", ["template-tag", "parameter_name"]], // Target definition
  "type": "parameter_type",         // Parameter type (id, text, date/all-options, etc.)
  "value": "parameter_value"        // The actual filter value
}
```

**Examples of valid parameter formats:**

**ID Parameter:**
```javascript
{
  "id": "b86c100e-87cb-09d6-7c33-e58cd2cdbcb2",
  "slug": "user_id",
  "target": ["dimension", ["template-tag", "user_id"]],
  "type": "id",
  "value": "12345"
}
```

**Date Range Parameter:**
```javascript
{
  "id": "1646c8b5-b9fb-32db-c198-7685b3f793d8",
  "slug": "date_range",
  "target": ["dimension", ["template-tag", "date_range"]],
  "type": "date/all-options",
  "value": "2025-01-01~2025-12-31"
}
```

**Text Parameter:**
```javascript
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "slug": "status",
  "target": ["dimension", ["template-tag", "status"]],
  "type": "text",
  "value": "active"
}
```

> **Note**: To get the correct parameter structure for a specific card, you can first retrieve the card details using the `retrieve` command with the card ID, which will show you the parameter definitions including their IDs, types, and expected formats.

#### Execute SQL Queries or Cards
```javascript
// Execute custom SQL query
execute({
  database_id: 1,
  query: "SELECT * FROM users WHERE created_at > '2024-01-01'",
  row_limit: 500
})

// Execute saved card with filtering parameters
execute({
  card_id: 42,
  card_parameters: [
    {
      "id": "1646c8b5-b9fb-32db-c198-7685b3f793d8",
      "slug": "start_date", 
      "target": ["dimension", ["template-tag", "start_date"]],
      "type": "date/all-options",
      "value": "2024-01-01~2024-12-31"
    },
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "slug": "status",
      "target": ["dimension", ["template-tag", "status"]],
      "type": "text",
      "value": "active"
    },
    {
      "id": "b86c100e-87cb-09d6-7c33-e58cd2cdbcb2", 
      "slug": "department_id",
      "target": ["dimension", ["template-tag", "department_id"]],
      "type": "id",
      "value": "123"
    }
  ],
  row_limit: 1000
})
```

#### Export Large Datasets
```javascript
// Export SQL query as CSV with auto-save
export({
  database_id: 1,
  query: "SELECT * FROM large_table",
  format: "csv",  // Case-insensitive: "CSV", "Csv" also work
  filename: "large_export"
})

// Export saved card as Excel file with filtering parameters
export({
  card_id: 123,
  card_parameters: [
    {
      "id": "f1e2d3c4-b5a6-9870-cdef-123456789abc",
      "slug": "year",
      "target": ["dimension", ["template-tag", "year"]], 
      "type": "number",
      "value": "2024"
    },
    {
      "id": "a9b8c7d6-e5f4-3210-9876-fedcba987654",
      "slug": "region",
      "target": ["dimension", ["template-tag", "region"]],
      "type": "text", 
      "value": "North America"
    },
    {
      "id": "1a2b3c4d-5e6f-7890-abcd-ef1234567890",
      "slug": "min_amount",
      "target": ["dimension", ["template-tag", "min_amount"]],
      "type": "number",
      "value": "1000"
    }
  ],
  format: "XLSX"  // Case-insensitive format handling
})

// Export as JSON for API integration
export({
  database_id: 1,
  query: "SELECT id, name, email FROM users",
  format: "json"
})
```

### Cache Management
```javascript
// Clear all caches (individual items and lists)
clear_cache({ cache_type: "all" })

// Clear specific individual item cache
clear_cache({ cache_type: "cards" })

// Clear specific list cache
clear_cache({ cache_type: "cards-list" })

// Clear all individual item caches only
clear_cache({ cache_type: "all-individual" })

// Clear all list caches only
clear_cache({ cache_type: "all-lists" })

// Clear specific model's list cache (for list command optimization)
clear_cache({ cache_type: "dashboards-list" })
```

## Performance Metrics

The server provides detailed performance metrics for all operations:

- **Cache Hit/Miss Ratios**: Track cache effectiveness
- **Response Times**: Monitor API and optimization performance
- **Concurrent Processing**: Measure time savings from parallel operations
- **Token Savings**: Quantify response optimization benefits
- **Memory Usage**: Track cache memory consumption

## Debugging

Since MCP servers communicate over stdio, use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) for debugging:

```bash
npm run inspector
```

The Inspector provides a browser-based interface for monitoring requests, responses, and performance metrics.

## Docker Support

### Building the Docker Image

```bash
# Build the Docker image
docker build -t metabase-mcp .

# Run with API key authentication
docker run -e METABASE_URL=https://metabase.example.com \
           -e METABASE_API_KEY=your_api_key \
           -e LOG_LEVEL=info \
           metabase-mcp

# Run with username/password authentication
docker run -e METABASE_URL=https://metabase.example.com \
           -e METABASE_USER_EMAIL=user@example.com \
           -e METABASE_PASSWORD=password \
           -e LOG_LEVEL=info \
           metabase-mcp
```

## Testing

### Comprehensive Test Suite

The project includes a robust testing framework with comprehensive unit tests covering all MCP commands and edge cases:

#### Test Coverage by Handler
- **clearCache**: Parameter validation, cache operations, response formatting
- **executeQuery**: SQL execution, parameter handling, row limits, query processing
- **exportQuery**: Format support (CSV/JSON/XLSX), file operations, validation
- **list**: All model types, caching, error handling, empty results
- **retrieve**: Multi-entity support, batch operations, cache behavior
- **search**: Advanced search parameters, model restrictions, query combinations

#### Quality Assurance Features
- **80% Coverage Threshold**: Enforced via Vitest configuration
- **Parameter Validation**: Comprehensive testing of all input validation
- **Error Scenarios**: Complete coverage of error conditions and edge cases
- **Mock Infrastructure**: Sophisticated API client and environment mocking
- **Cache Testing**: Verification of cache behavior and performance metrics
- **TypeScript Compliance**: Full type safety validation

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run comprehensive test suite with quality checks
npm run test:all

# Run the full quality assurance pipeline
./scripts/test-all.sh
```

### Test Infrastructure

The testing setup includes:
- **Vitest**: Modern testing framework with TypeScript support
- **Mock API Client**: Complete Metabase API simulation
- **Test Data**: Comprehensive sample data for all entity types
- **Environment Mocking**: Isolated test environment configuration
- **Coverage Analysis**: Detailed coverage reports with HTML output
- **CI Integration**: Automated testing across Node.js versions (18.x, 20.x, 22.x)

### GitHub Actions Integration

Automated testing runs on:
- **Push/PR Events**: Comprehensive test suite execution
- **Multi-Node Testing**: Parallel testing across Node.js versions
- **Quality Gates**: Type checking, linting, formatting, and coverage validation
- **Docker Testing**: Container build and startup verification
- **Performance Monitoring**: Test execution time and coverage metrics

## Development Improvements

### Enhanced Development Experience
- **Concurrent Development**: TypeScript compilation and nodemon running simultaneously
- **ESLint Integration**: Comprehensive linting with TypeScript support
- **Prettier Formatting**: Consistent code formatting
- **Type Checking**: Strict TypeScript configuration
- **CI/CD Pipeline**: Automated testing and validation

### Code Quality
- **Modular Architecture**: Organized handlers, types, and utilities
- **Error Handling**: Comprehensive error handling with detailed logging
- **Documentation**: Extensive inline documentation and type definitions
- **Testing**: Automated CI testing across Node.js versions

## Security Considerations

- **API Key Authentication**: Recommended for production environments
- **Credential Security**: Environment variable-based configuration
- **Docker Secrets**: Support for Docker secrets and environment variables
- **Network Security**: Apply appropriate network security measures
- **Rate Limiting**: Built-in request rate limiting and timeout handling

## License

This project is licensed under the MIT License.
