# Documentation Map

Visual guide to the Luci-Metabase-MCP documentation structure.

## Documentation Hierarchy

```
luci-metabase-mcp/
│
├── README.md                          # Main entry point
│   └── Links to → CLAUDE.md, AGENTS.md, CONTAINER-RUNTIME.md
│
├── CLAUDE.md                          # Claude Code development guide
│   ├── Project architecture
│   ├── Development commands
│   ├── Testing patterns
│   ├── MCP design patterns
│   └── Links to → AGENTS.md (for agent integration)
│
├── AGENTS.md                          # AI Agent integration guide
│   ├── Agent architecture
│   ├── Communication patterns
│   ├── Error handling with agentGuidance
│   ├── Recovery actions
│   ├── Multi-agent evaluation
│   └── Links to → CLAUDE.md, CONTAINER-RUNTIME.md
│
├── CONTAINER-RUNTIME.md              # Podman/Docker runtime guide
│   ├── Multi-stage builds
│   ├── Swift-NIO bridge
│   ├── Service orchestration
│   └── Links to → BRIDGING-ARCHITECTURE.md
│
└── docs/                             # Detailed documentation
    ├── enhanced-error-handling.md    # Error system for agents
    └── responses/                    # Response optimization docs
```

## Documentation Flow

### For Developers (Human)

```
Start: README.md
  ↓
  Developer? → CLAUDE.md
    ↓
    Need agent integration? → AGENTS.md
    ↓
    Need containerization? → CONTAINER-RUNTIME.md
```

### For AI Agents

```
Start: CLAUDE.md (auto-loaded by Claude Code)
  ↓
  Error handling? → AGENTS.md#agent-error-handling
  ↓
  Multi-agent? → AGENTS.md#agent-communication-patterns
  ↓
  Bridge protocol? → AGENTS.md#pattern-2-bridge-protocol
```

## Cross-References

### CLAUDE.md ↔ AGENTS.md

**CLAUDE.md references AGENTS.md for:**
- Project overview (multi-agent architecture)
- Error handling (agentGuidance field)
- AI Agent Integration section
- Quick agent reference

**AGENTS.md references CLAUDE.md for:**
- Project context
- Development guidelines
- Build and test commands

### README.md → All Docs

**README.md links to:**
- CLAUDE.md (development guide)
- AGENTS.md (agent integration)
- CONTAINER-RUNTIME.md (deployment)
- docs/ (detailed specs)

### AGENTS.md → Specialized Docs

**AGENTS.md links to:**
- docs/enhanced-error-handling.md (error system)
- src/types/core.ts (type definitions)
- src/server.ts (MCP implementation)
- luci-runme/pkg/agent/ (Runme integration)
- CONTAINER-RUNTIME.md (bridge architecture)

## Documentation Types

### 1. Entry Points
- **README.md**: Public-facing, installation, quick start
- **CLAUDE.md**: Developer onboarding, project context

### 2. Specialized Guides
- **AGENTS.md**: AI agent developers, integration patterns
- **CONTAINER-RUNTIME.md**: DevOps, deployment, bridge setup

### 3. Reference Documentation
- **docs/enhanced-error-handling.md**: Error handling specification
- **docs/responses/**: Response optimization details
- **luci_hashgraph_nodes/**: Repository management

## Quick Navigation

### I want to...

**...develop on this project**
→ Start with [CLAUDE.md](../CLAUDE.md)

**...integrate an AI agent**
→ Read [AGENTS.md](../AGENTS.md)

**...deploy with containers**
→ See [CONTAINER-RUNTIME.md](../CONTAINER-RUNTIME.md)

**...understand error handling**
→ Check [docs/enhanced-error-handling.md](../docs/enhanced-error-handling.md)

**...work with Hashgraph repos**
→ Visit [luci_hashgraph_nodes/](../luci_hashgraph_nodes/)

**...use the MCP server**
→ Follow [README.md](../README.md)

## Auto-Discovery

These files are automatically discovered by:

- **Claude Code**: Reads `CLAUDE.md` automatically
- **AI Agents**: Reference `AGENTS.md` for integration patterns
- **Developers**: Start at `README.md`
- **CI/CD**: Uses `CONTAINER-RUNTIME.md` for builds

## Maintenance

When updating documentation:

1. **Update primary doc**: Make changes in the main file
2. **Update cross-references**: Ensure links are bidirectional
3. **Update this map**: Reflect structural changes here
4. **Test links**: Verify all internal links work

## Related Files

### Project Configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `manifest.json` - DXT package manifest
- `.env.container` - Container environment template

### Build & Deploy
- `Containerfile` - Podman/Docker multi-stage build
- `podman-compose.yml` - Service orchestration
- `Makefile` - Build automation
- `Dockerfile` - Legacy Docker support

### Repository Management
- `luci_hashgraph_nodes/scripts/` - Auto-sync scripts
- `luci_hashgraph_nodes/Makefile` - Repo management commands
- `.github/workflows/` - CI/CD pipelines

---

**Last Updated**: 2025-10-04
**Maintainer**: Lucia AI
