# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based Model Context Protocol (MCP) server that provides AI assistants with optimized access to Metabase analytics data. The server acts as a bridge between AI systems (like Claude) and Metabase instances, offering high-performance data retrieval with intelligent caching and response optimization.

## Key Architecture

### Core Components

- **Entry Point**: `src/index.ts` - Main server entry with global error handling
- **Server**: `src/server.ts` - MCP server implementation with tool/resource handlers
- **API Client**: `src/api.ts` - Metabase API client with caching and authentication
- **Handlers**: `src/handlers/` - Tool-specific request handlers (search, list, retrieve, etc.)
- **Types**: `src/types/` - TypeScript definitions for core types and optimized responses
- **Configuration**: `src/config.ts` - Environment validation and configuration management

### Handler Architecture

The server uses a modular handler system:
- `list/` - List all resources of a type (cards, dashboards, tables, databases, collections)
- `retrieve/` - Fetch detailed information for specific items with concurrent processing
- `search.ts` - Native Metabase search with advanced filtering
- `executeQuery.ts` - Execute SQL queries with row limits
- `exportQuery.ts` - Export large datasets in CSV/JSON/XLSX formats
- `clearCache.ts` - Cache management utilities

## Common Development Commands

### Build and Development
```bash
# Full build with validation and tests
npm run build

# Fast build without validation (development only)
npm run build:fast

# Clean build from scratch
npm run build:clean

# Development with auto-rebuild and server restart
npm run dev:watch

# Single development run
npm run dev

# Build versioned MCPB package
npm run mcpb:build
```

### Code Quality
```bash
# Run all quality checks (type-check, lint, format)
npm run validate

# TypeScript type checking
npm run type-check

# ESLint
npm run lint
npm run lint:fix

# Prettier formatting
npm run format
npm run format:check
```

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage (80% threshold enforced)
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run comprehensive test suite
npm run test:all
```

### Server Operations
```bash
# Start built server
npm start

# Debug with MCP Inspector
npm run inspector

# Clean build artifacts
npm run clean
```

## Configuration

The server supports two authentication methods controlled by environment variables:

### API Key Authentication (Recommended)
```bash
METABASE_URL=https://your-metabase-instance.com
METABASE_API_KEY=your_api_key
```

### Session Authentication
```bash
METABASE_URL=https://your-metabase-instance.com
METABASE_USER_EMAIL=your_email@example.com
METABASE_PASSWORD=your_password
```

### Optional Settings
```bash
LOG_LEVEL=info                 # debug, info, warn, error, fatal
CACHE_TTL_MS=600000           # 10 minutes default
REQUEST_TIMEOUT_MS=600000     # 10 minutes default
```

## MCPB Package Management

The project includes MCPB (MCP Bundle) package management for easy distribution.

### Building MCPB Packages
```bash
# Build versioned MCPB package
npm run mcpb:build

# Validate manifest structure
npm run mcpb:validate
```

### Platform Compatibility
The MCPB package supports cross-platform deployment:
- **macOS** (darwin)
- **Windows** (win32)  
- **Linux** (linux)

Platform compatibility is declared in `manifest.json` with runtime requirements:
```json
"compatibility": {
  "claude_desktop": ">=0.11.0",
  "platforms": ["darwin", "win32", "linux"],
  "runtimes": {
    "node": ">=18.0.0"
  }
}
```

## Testing Architecture

The project uses Vitest with comprehensive test coverage:
- **Unit Tests**: All handlers have extensive test coverage
- **Mock Infrastructure**: Complete Metabase API simulation
- **Coverage Enforcement**: 80% threshold across branches, functions, lines, statements
- **CI Integration**: Automated testing across Node.js versions (18.x, 20.x, 22.x)

Test files are located in `tests/` directory with structure mirroring `src/handlers/`.

### Testing Patterns
- **API Client Testing**: Do NOT create dedicated tests for individual API client methods (e.g., `tests/api.test.ts`)
- **Handler-Level Mocking**: All API interactions should be mocked at the handler level in handler tests
- **Consistent Pattern**: Follow the established pattern where `tests/handlers/` contains tests that mock the entire API client
- **No Redundant Tests**: Avoid creating separate API client tests when the methods are already tested through handler tests

## Performance Optimizations

### Caching System
- **Multi-layer Caching**: Separate caches for individual items and bulk lists
- **Cache Types**: `cards`, `dashboards`, `tables`, `databases`, `collections`, `fields`
- **List Caches**: `cards-list`, `dashboards-list`, etc.
- **Configurable TTL**: Default 10 minutes, controlled by `CACHE_TTL_MS`

### Response Optimization
The server implements aggressive response optimization to reduce token usage:
- **Cards**: ~90% token reduction
- **Dashboards**: ~85% token reduction  
- **Tables**: ~80% token reduction
- **Databases**: ~75% token reduction
- **Collections**: ~15% token reduction
- **Fields**: ~75% token reduction

### Concurrent Processing
- **Batch Operations**: Controlled concurrency for retrieve operations
- **Rate Limiting**: Prevents API overload
- **Performance Metrics**: Real-time processing statistics

## MCP Design Patterns: Resources vs Tools

### Core Distinction
Per MCP documentation, there's a fundamental difference between Resources and Tools:

**Resources (Application-Controlled)**
- Users/clients explicitly select and read them
- Represent passive, relatively stable data
- Read-only access to specific content
- Good for: file contents, database records, API responses
- Examples: `metabase://dashboard/123`, `metabase://table/456`

**Tools (Model-Controlled)**
- AI models automatically invoke them
- Enable dynamic actions and computations
- Can modify state or interact with external systems
- Good for: search operations, data processing, workflow actions
- Examples: `search`, `execute_query`, `export`

### Design Rule: Avoid Overlap
**NEVER implement the same functionality as both a Resource and Tool**. This violates MCP principles and creates confusion. For example:
- ❌ Wrong: Having both a `search` tool AND a `metabase://search/{query}` resource
- ✅ Right: Search as tool only (dynamic operation), specific items as resources

### When to Use Each
**Use Resources for:**
- Static data access by ID
- User-specific views (e.g., user's dashboards)
- Content that doesn't require processing
- Reference data

**Use Tools for:**
- Dynamic operations requiring parameters
- Search, filtering, or querying
- Data transformation or processing
- Any operation that modifies state

## MCP Tools Available

### Core Data Access
- **`search`** - Native Metabase search with model filtering
- **`list`** - Fetch all records for a resource type  
- **`retrieve`** - Get detailed information for specific items (supports multiple IDs)

### Query Execution
- **`execute_query`** - Execute SQL queries (up to 2K rows)
- **`export_query`** - Export large datasets (up to 1M rows) in CSV/JSON/XLSX

### Utilities
- **`clear_cache`** - Cache management with granular control

## Development Notes

### Code Style
- Strict TypeScript configuration with `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`
- ESLint with TypeScript support
- Prettier for consistent formatting
- Modular architecture with clean separation of concerns
- **NO EMOJIS**: Never use emojis in code, documentation, comments, or tool descriptions
- **RESPONSE OPTIMIZATION DOCUMENTATION**: For every raw response -> optimized response task, always update docs/responses/ with optimization details including token savings analysis

### Error Handling
- Comprehensive error handling with structured logging
- Custom `McpError` class for consistent error responses
- Global error handlers in entry point
- Detailed error messages with context

### Build Process
The build process includes:
1. TypeScript compilation to `build/` directory
2. Setting executable permissions on `build/src/index.js`
3. Copying build artifacts to `dist/` directory
4. Running tests and validation

### Docker Support
Dockerfile available for containerized deployment with multi-stage builds for optimization.

## Debugging

Use the MCP Inspector for debugging MCP communications:
```bash
npm run inspector
```

This provides a browser-based interface for monitoring requests, responses, and performance metrics.