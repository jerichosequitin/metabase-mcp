# Metabase MCP Server

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/jerichosequitin/metabase-mcp)

**Version**: 1.1.3

**Author**: Jericho Sequitin (@jerichosequitin)

A high-performance Model Context Protocol server for AI integration with Metabase analytics platforms. Features response optimization, robust error handling, and comprehensive data access tools.

## Key Features

- **Response Optimization**: Up to 90% token reduction for efficient AI context usage
- **Robust Error Handling**: Comprehensive error handling with structured, actionable responses
- **Smart Caching**: Multi-layer caching with configurable TTL for improved performance
- **Unified Commands**: `list`, `retrieve`, `search`, `execute`, and `export` tools
- **Dual Authentication**: API key or email/password authentication
- **Large Data Export**: Export up to 1M rows in CSV, JSON, and XLSX formats
- **Read-Only Mode**: Enabled by default to restrict execute to SELECT queries only

## Installation

### Option 1: Claude Desktop

Install directly from the [Claude Desktop Directory](https://claude.ai/directory/ant.dir.gh.jerichosequitin.metabase), or:

1. Download `metabase-mcp.mcpb` from [Releases](https://github.com/jerichosequitin/metabase-mcp/releases)
2. Open the `.mcpb` file with Claude Desktop to install
3. Configure your Metabase credentials in Claude Desktop's extension settings

### Option 2: Manual Configuration

Add the following to your MCP client configuration:

```jsonc
{
  "mcpServers": {
    "metabase-mcp": {
      "command": "npx",
      "args": ["-y", "@jerichosequitin/metabase-mcp"],
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
        "LOG_LEVEL": "info",                           // debug, info, warn, error, fatal (debug enables pretty JSON)
        "CACHE_TTL_MS": "600000",                      // 10 minutes
        "REQUEST_TIMEOUT_MS": "600000"                 // 10 minutes
      }
    }
  }
}
```

### Option 3: Docker

For containerized deployments without installing Node.js. Add to your MCP client configuration:

```jsonc
{
  "mcpServers": {
    "metabase-mcp": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm", "--init",
        "-e", "METABASE_URL=https://your-metabase-instance.com",
        "-e", "METABASE_API_KEY=your_api_key",
        // Optional: mount volume for exports
        // "-v", "~/Downloads/Metabase:/home/node/exports",
        "ghcr.io/jerichosequitin/metabase-mcp:latest"
      ]
    }
  }
}
```

Or build locally: `docker build -t metabase-mcp .` and use `metabase-mcp` as the image name.

**Required flags:** `-i` (interactive, for MCP stdio), `--rm` (cleanup), `--init` (signal handling)

**Environment variables:** Pass via `-e` flags. See [Manual Configuration](#option-2-manual-configuration) for all options. Docker defaults: `LOG_LEVEL=info`, `METABASE_READ_ONLY_MODE=true`, `EXPORT_DIRECTORY=/home/node/exports`.

## Available Tools

### `list`
Fetch all records for a resource type with optimized responses returning only essential fields.
- **Models**: `cards`, `dashboards`, `tables`, `databases`, `collections`
- **Pagination**: `offset`/`limit` parameters for large datasets

### `retrieve`
Get detailed information for specific items by ID with concurrent processing.
- **Models**: `card`, `dashboard`, `table`, `database`, `collection`, `field`
- **Batch Support**: Up to 50 IDs per request
- **Pagination**: `table_offset`/`table_limit` for databases with many tables

### `search`
Search across all Metabase items using the native search API.
- **Filtering**: By model type, database ID, or content
- **Options**: Search native SQL queries, include dashboard questions

### `execute`
Execute SQL queries or run saved cards with configurable row limits (default: 100, max: 500).
- **SQL Mode**: Custom queries with `database_id` and `query`
- **Card Mode**: Saved cards with `card_id` and optional `card_parameters` for filtering
- **Security**: Respects Read-Only Mode (blocks INSERT, UPDATE, DELETE, DROP, etc.)

### `export`
Export large datasets up to 1M rows to the configured export directory.
- **Formats**: CSV, JSON, XLSX
- **SQL Mode**: Export custom query results
- **Card Mode**: Export saved card results with optional filtering

### `clear_cache`
Clear internal cache with granular control.
- **Targets**: Individual model caches, list caches, or bulk operations (`all`, `all-lists`, `all-individual`)

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

Then configure your MCP client to use the local build:

```jsonc
{
  "mcpServers": {
    "metabase-mcp": {
      "command": "node",
      "args": ["/path/to/metabase-mcp/build/src/index.js"],
      "env": { /* see Manual Configuration for options */ }
    }
  }
}
```

### Debugging

Use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) for development:

```bash
npm run inspector
```

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

## Security

**Read-Only Mode** is enabled by default (`METABASE_READ_ONLY_MODE=true`), restricting the `execute` tool to SELECT queries only. Write operations (INSERT, UPDATE, DELETE, DROP, etc.) are blocked. Set to `false` to allow write operations.

**Authentication**: API key authentication is recommended over email/password for production use.

## License

This project is licensed under the MIT License.
