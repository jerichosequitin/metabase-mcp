# AGENTS.md

This file defines AI agent configurations, behaviors, and integration patterns for the Luci-Metabase-MCP project.

## Agent Architecture

The Luci-Metabase-MCP project supports multiple agent interaction patterns:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Agent Ecosystem                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Claude Code Agent                                       │   │
│  │  • Primary development agent                             │   │
│  │  • Follows CLAUDE.md guidelines                          │   │
│  │  • Executes tasks via MCP tools                          │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Metabase MCP Server Agent                               │   │
│  │  • Provides Metabase data access                         │   │
│  │  • Response optimization for AI consumption              │   │
│  │  • Enhanced error guidance (agentGuidance field)         │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Swift Bridge Agent (Planned)                            │   │
│  │  • High-performance protocol handling                    │   │
│  │  • WebSocket/HTTP/2 bridge operations                    │   │
│  │  • Cross-language agent communication                    │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Runme Agent Integration                                 │   │
│  │  • Interactive documentation execution                   │   │
│  │  • Multi-agent evaluation framework                      │   │
│  │  • LLM-based assertions (from luci-runme/)               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Agent Capabilities

### 1. Metabase Data Agent

**Purpose**: Provide optimized access to Metabase analytics data

**Capabilities**:
- Search cards, dashboards, tables, databases, collections
- Execute SQL queries with row limits
- Export large datasets (CSV/JSON/XLSX)
- Intelligent caching (10-minute TTL)
- Response optimization (80-95% token reduction)

**Agent Guidance System**:
All MCP errors include `agentGuidance` field with actionable instructions:

```typescript
interface McpErrorDetails {
  code: ErrorCode;
  message: string;
  agentGuidance: string;  // AI-specific recovery instructions
  category: ErrorCategory;
  recoveryActions: RecoveryAction[];
  context?: Record<string, unknown>;
}
```

**Example Agent Guidance**:
```json
{
  "error": "Permission denied",
  "agentGuidance": "Your user account lacks the necessary permissions to access collection 123. Contact your Metabase administrator to grant appropriate permissions.",
  "recoveryActions": ["REQUEST_PERMISSION", "USE_DIFFERENT_RESOURCE"]
}
```

### 2. Swift-NIO Bridge Agent (Future)

**Purpose**: High-performance protocol bridging between Swift and Node.js

**Planned Capabilities**:
- WebSocket bidirectional communication
- HTTP/2 server for high-throughput requests
- Request proxying to Node.js MCP server
- Health checks and monitoring endpoints

**Agent Endpoints**:
- `/health` - Service health check
- `/bridge/status` - Bridge status and metrics
- WebSocket for real-time agent communication

### 3. Repository Management Agents

**Purpose**: Automated management of Hashgraph/Hedera repositories

**Capabilities**:
- Auto-discovery of all org repositories (GitHub API)
- Scheduled updates (hourly via launchd)
- Concurrent clone/update operations
- Integration with Luci-Metabase-MCP ecosystem

**Agent Scripts**:
- `luci_hashgraph_nodes/scripts/clone-all-repos.sh` - Auto-discovery & clone
- `luci_hashgraph_nodes/scripts/update-repos.sh` - Automated updates
- `luci_hashgraph_nodes/scripts/watch-repos.sh` - Real-time monitoring

## Agent Communication Patterns

### Pattern 1: MCP Tool Invocation

Claude Code agent communicates with Metabase MCP server:

```
Claude Code Agent
    ↓ MCP Request
Metabase MCP Server
    ↓ API Call
Metabase Instance
    ↓ Response
Metabase MCP Server (optimize response)
    ↓ Optimized Response + agentGuidance
Claude Code Agent (process & act)
```

### Pattern 2: Bridge Protocol (WebSocket)

```json
{
  "type": "consciousness|web3|nodejs|metabase",
  "payload": "data or JSON object",
  "metadata": {
    "source": "claude|swift|nodejs|metabase",
    "destination": "target_agent",
    "timestamp": "ISO8601",
    "request_id": "unique_id"
  }
}
```

### Pattern 3: Multi-Agent Evaluation (Runme)

From `luci-runme/pkg/agent/ai/eval.go`:

```go
// Agent assertion types for multi-agent evaluation
type Asserter interface {
    Assert(ctx context.Context,
           as *agentv1.Assertion,
           inputText string,
           cells map[string]*parserv1.Cell) error
}

// Assertion types:
// - SHELL_REQUIRED_FLAG: Verify shell commands
// - TOOL_INVOKED: Verify tool usage
// - FILE_RETRIEVED: Verify file access
// - LLM_JUDGE: LLM-based evaluation
// - CODEBLOCK_REGEX: Regex pattern matching
```

## Agent Configuration

### Environment Variables for Agents

```bash
# Metabase MCP Agent
METABASE_URL=https://metabase.example.com
METABASE_API_KEY=your_api_key
LOG_LEVEL=info
CACHE_TTL_MS=600000

# Swift Bridge Agent
SWIFT_BRIDGE_HOST=::
SWIFT_BRIDGE_PORT=8001
SWIFT_NIO_THREADS=0
MCP_SERVER_URL=http://localhost:3000

# Web3/Hedera Agent (Optional)
WEB3_ENABLED=false
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.xxxxx
```

### Agent Service Discovery

Agents can discover each other via:

1. **Environment Variables**: Static configuration
2. **Service Registry**: Dynamic discovery (planned)
3. **Bridge Protocol**: WebSocket handshake
4. **Health Endpoints**: Polling for availability

## Agent Error Handling

### Enhanced Error System

All agents use structured error handling with agent-specific guidance:

```typescript
// From src/types/core.ts
class McpError extends Error {
  toAgentResponse(): {
    error: string;
    code: string;
    category: string;
    guidance: string;
    recoveryActions: string[];
    context?: Record<string, unknown>;
  }
}
```

### Error Categories for Agents

- **AUTHENTICATION**: Auth failures → "Check credentials"
- **AUTHORIZATION**: Permission issues → "Request access"
- **NOT_FOUND**: Missing resources → "Verify ID"
- **VALIDATION**: Invalid input → "Check parameters"
- **NETWORK**: Connection issues → "Check connectivity"
- **TIMEOUT**: Operation timeout → "Reduce complexity"
- **RATE_LIMIT**: Too many requests → "Implement backoff"

### Recovery Actions

Agents can take automatic recovery actions:

```typescript
enum RecoveryAction {
  RETRY = 'RETRY',
  RETRY_WITH_BACKOFF = 'RETRY_WITH_BACKOFF',
  USE_DIFFERENT_RESOURCE = 'USE_DIFFERENT_RESOURCE',
  REQUEST_PERMISSION = 'REQUEST_PERMISSION',
  CHECK_CONFIGURATION = 'CHECK_CONFIGURATION',
  CONTACT_ADMINISTRATOR = 'CONTACT_ADMINISTRATOR',
  USE_ALTERNATIVE_METHOD = 'USE_ALTERNATIVE_METHOD',
  SIMPLIFY_REQUEST = 'SIMPLIFY_REQUEST',
  NONE = 'NONE'
}
```

## Agent Integration Examples

### Example 1: Claude Code Agent Using MCP

```typescript
// Claude Code agent queries Metabase
const result = await mcpClient.callTool('search', {
  query: 'sales dashboard',
  model: 'dashboards'
});

// If error occurs:
{
  "error": "Permission denied",
  "agentGuidance": "You lack permission to access collection 5. Use 'list' tool with model='collections' to see accessible collections.",
  "recoveryActions": ["USE_DIFFERENT_RESOURCE"]
}

// Agent can automatically try alternative:
const collections = await mcpClient.callTool('list', {
  model: 'collections'
});
```

### Example 2: Swift Bridge Agent Proxying

```swift
// Swift agent receives request
func handleBridgeMessage(message: BridgeMessage) {
    switch message.type {
    case "metabase":
        // Proxy to Node.js MCP server
        let result = await proxyToMCP(message.payload)
        // Return optimized response
        return BridgeResponse(result: result)
    }
}
```

### Example 3: Multi-Agent Repository Sync

```bash
# Agent 1: Clone all repos
cd luci_hashgraph_nodes
make clone

# Agent 2: Auto-update service
launchd: com.luci.hashgraph.auto-update
# Runs every hour, updates all repos

# Agent 3: Monitor and notify
make watch
# Real-time monitoring with fswatch
```

## Agent Development Guidelines

### For Agent Developers

1. **Follow MCP Patterns**: Use Resources vs Tools correctly
   - Resources: Static, user-controlled access
   - Tools: Dynamic, agent-controlled actions

2. **Implement Agent Guidance**: All errors must include `agentGuidance`
   - Be specific and actionable
   - Include recovery actions
   - Provide context when available

3. **Optimize Responses**: Reduce token usage for AI consumption
   - Remove redundant data
   - Focus on essential fields
   - Document token savings

4. **Use Structured Logging**: Enable agent debugging
   ```typescript
   logger.info('Agent action', {
     agent: 'claude-code',
     action: 'search',
     model: 'dashboards',
     query: 'sales'
   });
   ```

5. **Health Checks**: Implement monitoring endpoints
   ```typescript
   app.get('/health', (req, res) => {
     res.json({
       status: 'healthy',
       agent: 'metabase-mcp',
       timestamp: new Date().toISOString()
     });
   });
   ```

### For Agent Users (AI Systems)

1. **Check Agent Guidance**: Always read `agentGuidance` field in errors
2. **Implement Recovery**: Use `recoveryActions` for automatic recovery
3. **Cache Awareness**: Understand cache TTL and freshness
4. **Concurrent Requests**: Use bulk operations when available
5. **Monitor Performance**: Track response times and optimize

## Agent Testing

### Test Agent Behaviors

```typescript
// From tests/utils/errorFactory.test.ts
describe('McpError agent response', () => {
  it('should create structured agent response', () => {
    const error = ErrorFactory.invalidParameter(
      'user_id',
      'john_doe',
      'id'
    );

    const response = error.toAgentResponse();

    expect(response.guidance).toContain('expects id type');
    expect(response.recoveryActions).toContain('SIMPLIFY_REQUEST');
  });
});
```

### Agent Evaluation Framework

Using Runme agent evaluation from `luci-runme/`:

```go
// Define agent assertions
assertions := []*agentv1.Assertion{
    {Type: agentv1.Assertion_TYPE_TOOL_INVOKED, Value: "search"},
    {Type: agentv1.Assertion_TYPE_LLM_JUDGE, Value: "response is helpful"},
}

// Evaluate agent performance
results := EvalFromExperiment(experiment, assertions, client)
```

## Agent Metrics

Track agent performance:

```typescript
interface AgentMetrics {
  messageCount: number;
  averageLatency: number;
  errorRate: number;
  cacheHitRate: number;
  tokensSaved: number;
  recoverySuccessRate: number;
}
```

## Future Agent Capabilities

### Planned Enhancements

1. **Multi-Agent Collaboration**
   - Agent-to-agent communication protocol
   - Shared context and memory
   - Distributed task execution

2. **Web3 Agent Integration**
   - Hedera Guardian integration
   - Smart contract interactions
   - Blockchain transaction processing

3. **Advanced Caching**
   - Predictive cache warming
   - Cross-agent cache sharing
   - Distributed cache layer

4. **Agent Learning**
   - Track successful recovery patterns
   - Optimize agent responses
   - Personalized agent behavior

## References

- **Error Handling**: See [docs/enhanced-error-handling.md](docs/enhanced-error-handling.md)
- **MCP Protocol**: See [src/server.ts](src/server.ts)
- **Agent Types**: See [src/types/core.ts](src/types/core.ts)
- **Runme Integration**: See [luci-runme/pkg/agent/](luci-runme/pkg/agent/)
- **Bridge Architecture**: See [CONTAINER-RUNTIME.md](CONTAINER-RUNTIME.md)

## Contributing

When adding new agent capabilities:

1. Update this document with agent patterns
2. Implement `agentGuidance` for all errors
3. Add tests for agent behaviors
4. Document integration patterns
5. Update CLAUDE.md if needed

---

**Last Updated**: 2025-10-04
**Maintainer**: Lucia AI
**Related**: [CLAUDE.md](CLAUDE.md), [CONTAINER-RUNTIME.md](CONTAINER-RUNTIME.md)
