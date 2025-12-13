# Metabase MCP Server

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/jerichosequitin/metabase-mcp)

**Version**: 1.1.2

**Author**: Jericho Sequitin (@jerichosequitin)

A high-performance Model Context Protocol server for AI integration with Metabase analytics platforms. Features intelligent caching, response optimization, and comprehensive data access tools.

## Key Features

- **High Performance**: Up to 90% token reduction through response optimization
- **Unified Commands**: `list`, `retrieve`, `search`, `execute`, and `export` tools
- **Smart Caching**: Multi-layer caching with configurable TTL
- **Dual Authentication**: API key or email/password authentication
- **Large Data Export**: Export up to 1M rows in CSV, JSON, and XLSX formats
- **Read-Only Mode**: Enabled by default to restrict execute to SELECT queries only
- **Error Handling**: Comprehensive error handling with structured error responses

## Installation

### Option 1: MCP Bundle (Claude Desktop)

1. Download `metabase-mcp.mcpb` from [Releases](https://github.com/jerichosequitin/metabase-mcp/releases)
2. Open the `.mcpb` file with Claude Desktop to install
3. Configure your Metabase credentials in Claude Desktop's extension settings

### Option 2: Manual Configuration

Add the following to your MCP client configuration, adjusting the path and removing optional variables as needed:

```jsonc
{
  "mcpServers": {
    "metabase-mcp": {
      "command": "node",
      "args": ["/path/to/metabase-mcp/build/src/index.js"],
      "env": {
        // Required
        "METABASE_URL": "https://your-metabase-instance.com",

        // Authentication (choose one)
        "METABASE_API_KEY": "your_api_key_here",       // API key (recommended)
        "METABASE_USER_EMAIL": "",                     // OR email/password
        "METABASE_PASSWORD": "",

        // Optional (defaults shown)
        "EXPORT_DIRECTORY": "~/Downloads/Metabase",    // Export location
        "METABASE_READ_ONLY_MODE": "true",             // Restrict to SELECT queries
        "LOG_LEVEL": "info",                           // debug, info, warn, error, fatal
        "CACHE_TTL_MS": "600000",                      // 10 minutes
        "REQUEST_TIMEOUT_MS": "600000"                 // 10 minutes
      }
    }
  }
}
```

## Available Tools

The server exposes the following optimized tools for AI assistants:

### Unified Core Tools
- **`list`**: Fetch ALL records for a single resource type with highly optimized responses
  - Supports: `cards`, `dashboards`, `tables`, `databases`, `collections`
  - Returns only essential identifier fields for efficient browsing
  - **Pagination support** for large datasets exceeding token limits (offset/limit parameters)
  - Intelligent caching with performance metrics

- **`retrieve`**: Get detailed information for specific items by ID
  - Supports: `card`, `dashboard`, `table`, `database`, `collection`, `field`
  - Concurrent processing with controlled batch sizes
  - Aggressive response optimization (75-90% token reduction)*
  - **Table pagination** for large databases exceeding 25k token limits

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
  - **Security Warning**: SQL mode can execute ANY valid SQL including destructive operations (DELETE, UPDATE, DROP, TRUNCATE, ALTER). Ensure appropriate database permissions are configured in Metabase. Note: When Read-Only Mode is enabled (default), write operations will be rejected with an error.

- **`export`**: Unified command for exporting large datasets (up to 1M rows)
  - **SQL Mode**: Export custom SQL query results with database_id and query parameters
  - **Card Mode**: Export saved Metabase card results with card_id parameter and optional filtering
  - **Card Parameters**: Filter card results before export using `card_parameters` array
  - Supports CSV, JSON, and XLSX formats with case-insensitive format handling
  - Automatic file saving to configurable directory (defaults to ~/Downloads/Metabase/)

### Utility Tools
- **`clear_cache`**: Clear internal cache with granular control
  - Supports model-specific cache clearing for both individual items and lists
  - Individual item caches: `cards`, `dashboards`, `tables`, `databases`, `collections`, `fields`
  - List caches: `cards-list`, `dashboards-list`, `tables-list`, `databases-list`, `collections-list`
  - Bulk operations: `all`, `all-individual`, `all-lists`

## For Developers

### Prerequisites
- Node.js 18.0.0 or higher
- Active Metabase instance

### Setup

```bash
git clone https://github.com/jerichosequitin/metabase-mcp.git
cd metabase-mcp
npm install
npm run build
```

### Debugging

Use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) for development:

```bash
npm run inspector
```

### Docker

```bash
docker build -t metabase-mcp .
docker run -e METABASE_URL=https://metabase.example.com \
           -e METABASE_API_KEY=your_api_key \
           metabase-mcp
```

*Note: Docker is primarily for development/testing.*

### Testing

```bash
npm test                 # Run tests
npm run test:coverage    # Coverage report
```

### Building MCPB Package

```bash
npm run mcpb:build
```

Creates `metabase-mcp-{version}.mcpb` ready for GitHub Releases.

## Security Considerations

- **API Key Authentication**: Recommended for production environments
- **Credential Security**: Environment variable-based configuration
- **Docker Secrets**: Support for Docker secrets and environment variables
- **Network Security**: Apply appropriate network security measures
- **Rate Limiting**: Built-in request rate limiting and timeout handling

### Read-Only Mode

Read-only mode is **enabled by default** to restrict the `execute` tool to SELECT queries only. To disable:

```bash
METABASE_READ_ONLY_MODE=false
```

When enabled:
- Only SELECT queries are permitted through the `execute` tool
- Write operations (INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, etc.) are rejected with an error
- Stored procedure calls (CALL, EXEC) and permission changes (GRANT, REVOKE) are also blocked

This default is recommended for production environments where AI assistants should only read data, not modify it.

## License

This project is licensed under the MIT License.
