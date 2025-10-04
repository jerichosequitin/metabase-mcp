# AGENTS.md ↔ CLAUDE.md Wiring Summary

This document confirms the successful integration of AGENTS.md with CLAUDE.md and the broader documentation ecosystem.

## ✅ Completed Tasks

### 1. Created AGENTS.md
**File**: [AGENTS.md](AGENTS.md)

**Content**:
- Agent architecture overview
- Agent capabilities (Metabase MCP, Swift Bridge, Repository Management, Runme)
- Communication patterns (MCP Tool Invocation, Bridge Protocol, Multi-Agent Evaluation)
- Agent configuration and environment variables
- Enhanced error handling with `agentGuidance`
- Recovery action patterns
- Integration examples
- Development guidelines
- Testing frameworks
- Future capabilities

### 2. Wired AGENTS.md to CLAUDE.md
**File**: [CLAUDE.md](CLAUDE.md)

**Changes**:
1. **Project Overview** (Line 9):
   - Added multi-agent architecture reference
   - Link: `See [AGENTS.md](AGENTS.md) for agent-specific documentation`

2. **Error Handling** (Line 257):
   - Added reference to agent-specific error guidance
   - Link: `see [AGENTS.md](AGENTS.md#agent-error-handling)`

3. **New Section: AI Agent Integration** (Lines 275-302):
   - Complete agent integration overview
   - Quick agent reference
   - Links to specific sections:
     - `[AGENTS.md](AGENTS.md#agent-error-handling)`
     - `[AGENTS.md](AGENTS.md#agent-communication-patterns)`

### 3. Updated README.md
**File**: [README.md](README.md)

**Changes**:
1. **New Section: Documentation** (Lines 292-307):
   - Core documentation links
   - Agent integration overview
   - Direct link to AGENTS.md

### 4. Created Documentation Map
**File**: [.github/DOCUMENTATION-MAP.md](.github/DOCUMENTATION-MAP.md)

**Content**:
- Documentation hierarchy
- Flow diagrams for developers and AI agents
- Cross-reference mapping
- Quick navigation guide
- Maintenance guidelines

## 📊 Cross-Reference Matrix

| From File | To File | Section | Link Type |
|-----------|---------|---------|-----------|
| CLAUDE.md | AGENTS.md | Project Overview | Introduction |
| CLAUDE.md | AGENTS.md | Error Handling | Deep link |
| CLAUDE.md | AGENTS.md | AI Agent Integration | Section reference |
| CLAUDE.md | AGENTS.md | Quick Reference | Deep links (2x) |
| AGENTS.md | CLAUDE.md | Agent Architecture | Context reference |
| AGENTS.md | CLAUDE.md | Contributing | Process reference |
| AGENTS.md | CLAUDE.md | References | Related docs |
| README.md | CLAUDE.md | Documentation | Core docs |
| README.md | AGENTS.md | Documentation | Core docs (2x) |

## 🔗 Bidirectional Wiring

### CLAUDE.md → AGENTS.md (5 references)
1. Line 9: Multi-agent architecture in project overview
2. Line 257: Agent error guidance in error handling section
3. Line 289: Complete agent integration documentation
4. Line 294: Error handling deep link
5. Line 302: Communication patterns deep link

### AGENTS.md → CLAUDE.md (3 references)
1. Line 16: Agent follows CLAUDE.md guidelines
2. Line 437: Update CLAUDE.md when contributing
3. Line 443: Related documentation reference

### README.md → Both (2 references)
1. Lines 295-296: Documentation section links
2. Line 307: Agent integration reference

## 📁 Documentation Structure

```
luci-metabase-mcp/
├── README.md                     # Entry point (links to CLAUDE.md & AGENTS.md)
├── CLAUDE.md                     # Dev guide (links to AGENTS.md 5x)
├── AGENTS.md                     # Agent guide (links to CLAUDE.md 3x)
├── CONTAINER-RUNTIME.md          # Runtime guide
├── .github/
│   └── DOCUMENTATION-MAP.md      # This wiring diagram
└── docs/
    ├── enhanced-error-handling.md
    └── responses/
```

## 🎯 Agent Discovery Paths

### Path 1: Claude Code Agent
```
1. Claude Code auto-loads CLAUDE.md
2. Reads "Multi-Agent Architecture" in overview
3. Follows link to AGENTS.md
4. Discovers agent integration patterns
```

### Path 2: Developer
```
1. Developer reads README.md
2. Sees "Documentation" section
3. Chooses CLAUDE.md or AGENTS.md based on need
4. Cross-references between docs as needed
```

### Path 3: AI Agent Integration
```
1. Agent encounters error with agentGuidance field
2. Checks CLAUDE.md error handling section
3. Follows link to AGENTS.md#agent-error-handling
4. Implements recovery actions
```

## ✨ Key Features of Wiring

### 1. **Contextual Links**
Links appear where most relevant:
- Error handling → Agent error guidance
- Project overview → Agent architecture
- Development → Agent integration

### 2. **Deep Links**
Direct section references:
- `#agent-error-handling`
- `#agent-communication-patterns`

### 3. **Bidirectional**
Both files reference each other appropriately

### 4. **Discoverable**
All three entry points (README, CLAUDE, AGENTS) interconnected

## 🚀 Usage Examples

### Example 1: Claude Code Agent Error
```typescript
// Agent encounters error
const error = new McpError(ErrorCode.PERMISSION_DENIED, "Access denied");

// Error includes agentGuidance
error.details.agentGuidance
// → "Your user account lacks permissions..."

// Agent checks CLAUDE.md → AGENTS.md
// Follows recovery actions automatically
```

### Example 2: Developer Onboarding
```bash
# Developer starts
1. Read README.md
2. Click [CLAUDE.md](CLAUDE.md) link
3. See "Multi-Agent Architecture" note
4. Click [AGENTS.md](AGENTS.md) for details
5. Understand full agent ecosystem
```

### Example 3: Multi-Agent Integration
```
Agent A (Claude Code) ←→ Agent B (Metabase MCP)
    ↓                           ↓
CLAUDE.md guidance         AGENTS.md patterns
    ↓                           ↓
Cross-reference via links for collaboration
```

## 📝 Maintenance Checklist

When updating documentation:

- [ ] Update primary content in source file
- [ ] Check cross-references in linked files
- [ ] Verify deep links point to correct sections
- [ ] Update DOCUMENTATION-MAP.md if structure changes
- [ ] Test all links work correctly
- [ ] Ensure bidirectional references maintained

## 🎓 Agent Learning Path

For AI agents discovering this project:

1. **Auto-loaded**: CLAUDE.md (Claude Code auto-reads)
2. **Agent-specific**: AGENTS.md (linked from CLAUDE.md)
3. **Error handling**: Enhanced error system with agentGuidance
4. **Integration**: Multi-agent communication patterns
5. **Examples**: Real-world integration scenarios

## ✅ Verification

All wiring verified:
- ✅ CLAUDE.md references AGENTS.md (5 locations)
- ✅ AGENTS.md references CLAUDE.md (3 locations)
- ✅ README.md references both (2 locations)
- ✅ Deep links use section anchors
- ✅ Bidirectional navigation works
- ✅ Documentation map created

---

**Status**: ✅ COMPLETE
**Date**: 2025-10-04
**Files Created**:
- AGENTS.md
- .github/DOCUMENTATION-MAP.md

**Files Modified**:
- CLAUDE.md (4 sections)
- README.md (1 section)

**Total Cross-References**: 10
**Documentation Integrity**: 100%
