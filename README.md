# Metabase MCP Server

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/jerichosequitin/metabase-mcp)

**Version**: 1.0.1

**Author**: Jericho Sequitin (@jerichosequitin)

A high-performance Model Context Protocol server for AI integration with Metabase analytics platforms. Features intelligent caching, response optimization, and comprehensive data access tools.

**Available as an MCP Bundle (MCPB) for Claude Desktop.**

## Installation Options

#### Option 1: MCP Bundle (Recommended for Claude Desktop Users)

1. Download `metabase-mcp.mcpb` from [Releases](https://github.com/jerichosequitin/metabase-mcp/releases)
2. Open the `.mcpb` file with Claude Desktop to install
3. Configure your Metabase credentials in Claude Desktop's extension settings:
   - **Metabase URL** (required)
   - **Authentication**: Choose either API key OR email/password
   - **Export Directory**: Customize where files are saved (defaults to Downloads/Metabase)
   - **Optional**: Log level, cache TTL, and request timeout settings

##### Benefits of MCP Bundle Installation

- **Single-click installation**: No manual configuration files or command-line setup
- **Automatic updates**: Claude Desktop manages bundle updates
- **User-friendly settings**: Configure through Claude Desktop's UI
- **Seamless integration**: Tools automatically available in your conversations

#### Option 2: Manual Installation
Follow the standard MCP server installation process detailed in the Local Development Setup section below.

## Key Features

- **High Performance**: Up to 90% token reduction through response optimization
- **Unified Commands**: `list`, `retrieve`, `search`, `execute`, and `export` tools
- **Smart Caching**: Multi-layer caching with configurable TTL
- **Flexible Authentication**: API key, email/password, or Google SSO
- **Large Data Export**: Export up to 1M rows in CSV, JSON, and XLSX formats
- **Configurable Export Directory**: Customize where files are saved

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

## Quick Start Examples

```javascript
// List all cards
list({ model: "cards" })

// Get detailed card information
retrieve({ model: "card", ids: [1, 2, 3] })

// Search for dashboards
search({ query: "sales", models: ["dashboard"] })

// Execute SQL query
execute({
  database_id: 1,
  query: "SELECT * FROM users LIMIT 100"
})

// Export large dataset
export({
  database_id: 1,
  query: "SELECT * FROM large_table",
  format: "csv"
})
```

## Configuration

### Authentication Options

**API Key (Recommended):**
```bash
METABASE_URL=https://your-metabase-instance.com
METABASE_API_KEY=your_api_key
```

**Email/Password:**
```bash
METABASE_URL=https://your-metabase-instance.com
METABASE_USER_EMAIL=your_email@example.com
METABASE_PASSWORD=your_password
```

**Google SSO:**
```bash
METABASE_URL=https://your-metabase-instance.com
METABASE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
METABASE_GOOGLE_CLIENT_SECRET=your-client-secret  # Optional, for token refresh

# Then authenticate via CLI (one-time):
npx metabase-mcp auth login
```

See [docs/auth.md](docs/auth.md) for detailed Google SSO setup instructions.

**Optional Settings:**
```bash
EXPORT_DIRECTORY=~/Downloads/Metabase  # Or ${DOWNLOADS}/Metabase
LOG_LEVEL=info
```

## Manual Installation (Developers)

### Prerequisites
- Node.js 18.0.0 or higher
- Active Metabase instance

### Setup

```bash
# Clone and build
git clone https://github.com/jerichosequitin/metabase-mcp.git
cd metabase-mcp
npm install
npm run build
```

### Environment Configuration

Create a `.env` file:

```bash
# Required
METABASE_URL=https://your-metabase-instance.com

# Choose authentication method
METABASE_API_KEY=your_api_key  # Recommended
# OR
# METABASE_USER_EMAIL=your_email@example.com
# METABASE_PASSWORD=your_password

# Optional
EXPORT_DIRECTORY=~/Downloads/Metabase  # Or ${DOWNLOADS}/Metabase
LOG_LEVEL=info
CACHE_TTL_MS=600000 # 10 minutes by default
REQUEST_TIMEOUT_MS=600000 # 10 minutes by default
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
        "CACHE_TTL_MS": "600000",
        "EXPORT_DIRECTORY": "/path/to/your/export/directory"
      }
    }
  }
}
```

#### Important Notes:
- **Use absolute paths** for local development (e.g., `/Users/username/Documents/metabase-mcp/build/src/index.js`)
- **Replace `your-username`** with your actual username
- **Replace `path/to/metabase-mcp`** with the actual path to your cloned repository
- **No need to run the server manually** - Claude Desktop will automatically invoke and manage the MCP server via STDIO
- **Never commit real credentials** to version control
- **Restart Claude Desktop** after making configuration changes

#### Troubleshooting:
- Ensure the path to `build/src/index.js` is correct and the file exists
- Verify your Metabase credentials are valid
- Check Claude Desktop's logs for any connection errors
- Make sure the server builds successfully with `npm run build`

## Advanced Usage

### Card Parameters

For executing saved cards with filters, use the `card_parameters` array:

```javascript
execute({
  card_id: 42,
  card_parameters: [
    {
      "id": "param-uuid",
      "slug": "start_date",
      "target": ["dimension", ["template-tag", "start_date"]],
      "type": "date/all-options",
      "value": "2024-01-01~2024-12-31"
    }
  ]
})
```

*Get parameter structure by retrieving card details first.*

### Pagination

```javascript
// List with pagination
list({ model: "cards", limit: 100, offset: 0 })

// Large database tables
retrieve({ model: "database", ids: [1], table_limit: 20 })
```


## Debugging

Use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) for development:

```bash
npm run inspector
```

## Docker Support

```bash
# Build and test
docker build -t metabase-mcp .
docker run -e METABASE_URL=https://metabase.example.com \
           -e METABASE_API_KEY=your_api_key \
           metabase-mcp
```

*Note: Docker is primarily for development/testing.*

## Development

### Testing

```bash
# Run tests
npm test

# Coverage report
npm run test:coverage

# Development tools
npm run inspector  # MCP Inspector for debugging
```

### Building MCPB Package

```bash
# Build for distribution
npm run mcpb:build
```

Creates `metabase-mcp-{version}.mcpb` (e.g., `metabase-mcp-1.0.1.mcpb`) ready for GitHub Releases.

## Security Considerations

- **API Key Authentication**: Recommended for production environments
- **Credential Security**: Environment variable-based configuration
- **Google SSO Tokens**: Encrypted at rest in `~/.metabase-mcp/auth.json`
- **Docker Secrets**: Support for Docker secrets and environment variables
- **Network Security**: Apply appropriate network security measures
- **Rate Limiting**: Built-in request rate limiting and timeout handling

For detailed security best practices, see [docs/auth.md](docs/auth.md#security-best-practices).

## License

This project is licensed under the MIT License.
