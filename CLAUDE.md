# CLAUDE.md

Guidance for Claude Code when working on this repository.

## Project Overview

TypeScript MCP server providing AI assistants with optimized access to Metabase analytics data.

## Key Files

- `src/index.ts` - Entry point
- `src/server.ts` - MCP server with tool/resource handlers
- `src/api.ts` - Metabase API client with caching
- `src/handlers/` - Tool handlers (search, list, retrieve, execute, export, clearCache)
- `src/types/` - TypeScript definitions
- `src/config.ts` - Environment validation

## Commands

```bash
# Build
npm run build          # Full build with validation + tests
npm run build:fast     # TypeScript only (dev)

# Quality
npm run validate       # type-check + lint + format check
npm run lint:fix       # Auto-fix lint issues

# Test
npm test               # Run tests
npm run test:coverage  # With 80% threshold

# Run
npm start              # Start server
npm run inspector      # Debug with MCP Inspector
```

## Configuration

```bash
# Required (choose one auth method)
METABASE_URL=https://your-instance.com
METABASE_API_KEY=your_key              # Recommended
# OR
METABASE_USER_EMAIL=email@example.com
METABASE_PASSWORD=password

# Optional
LOG_LEVEL=info                         # debug, info, warn, error, fatal
CACHE_TTL_MS=600000                    # 10 min default
REQUEST_TIMEOUT_MS=600000              # 10 min default
EXPORT_DIRECTORY=~/Downloads/Metabase
METABASE_READ_ONLY_MODE=true           # Restrict to SELECT queries
JSON_BEAUTIFY=false                    # Beautify JSON responses (compact by default)
```

## Rules

### Code Style
- Strict TypeScript (`noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`)
- ESLint + Prettier enforced
- **No emojis** in code, docs, or tool descriptions

### Testing
- Tests in `tests/` mirror `src/handlers/` structure
- Mock API at handler level, not API client level
- Do NOT create `tests/api.test.ts` - API methods tested through handlers
- 80% coverage threshold enforced

### MCP Design Pattern
**Never implement the same functionality as both Resource and Tool.**

- **Resources**: Static data by ID (e.g., `metabase://dashboard/123`)
- **Tools**: Dynamic operations (search, execute, export)

Wrong: `search` tool AND `metabase://search/{query}` resource
Right: Search as tool only

### Response Optimization
When modifying response transformations, update `docs/responses/` with token savings analysis.

## Version Bumping

```bash
npm version patch|minor|major
```
This auto-syncs version to README.md, manifest.json, and Dockerfile.
