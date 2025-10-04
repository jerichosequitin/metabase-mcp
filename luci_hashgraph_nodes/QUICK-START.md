# Luci Hashgraph Nodes - Quick Start

## Current Status

✅ **Clone Process**: Running in background (~87 repositories)
✅ **Auto-Update**: Configured to run every hour via launchd
✅ **Location**: `/Users/lucia/Documents/GitHub/luci-metabase-mcp/luci_hashgraph_nodes`

## Quick Commands

```bash
# Navigate to directory
cd /Users/lucia/Documents/GitHub/luci-metabase-mcp/luci_hashgraph_nodes

# Check clone progress
tail -f logs/clone.log

# List cloned repositories
make list

# Count repositories
make count

# Check auto-update status
make check-auto

# View auto-update logs
make logs

# Manual update all repos
make update
```

## What's Happening Now

1. **Background Clone**: All ~87 Hashgraph repositories are being cloned
   - Progress: Check `logs/clone.log`
   - Location: `repos/` directory

2. **Auto-Update Service**: Running via macOS launchd
   - Interval: Every hour
   - Service: `com.luci.hashgraph.auto-update`
   - Logs: `logs/auto-update.log`

## Integration with Luci-Metabase-MCP

This is part of the larger bridging architecture:

```
luci-metabase-mcp/
├── src/                    # Node.js MCP server
├── swift-bridge/           # Swift-NIO bridge
├── buildtools/             # Bazel tools
├── luci-runme/            # Runme integration
└── luci_hashgraph_nodes/  # ← You are here
    └── repos/             # All Hashgraph repos (cloning...)
```

## Key Integration Points

### With Swift Bridge
```bash
# Use Hedera Swift SDK in bridge
cd repos/hedera-sdk-swift
swift build

# Link to main Swift bridge
cd ../../swift-bridge
# Import hedera-sdk-swift components
```

### With Container Runtime
```bash
# Access repos in containerized environment
cd repos/guardian
# Build and integrate with Podman runtime
```

### With Build Tools
```bash
# Use buildifier on Hashgraph repos
cd repos/hedera-services
buildifier -r .
```

## Auto-Update Service

The launchd service automatically:
- ✅ Runs every hour
- ✅ Fetches latest changes from all repos
- ✅ Pulls updates (fast-forward only)
- ✅ Logs all operations

### Service Management

```bash
# Check if running
launchctl list | grep luci.hashgraph

# Stop service
make stop-auto

# Start service
make start-auto

# View logs
tail -f logs/auto-update.log
```

## Monitoring Progress

### Check Clone Progress
```bash
# Watch clone log
tail -f logs/clone.log

# Count cloned repos so far
ls -1 repos/ 2>/dev/null | wc -l
```

### Check Repository Status
```bash
# Show status of all repos
make status

# List all repos
make list
```

## Common Repositories

Key repos you'll find here:

- **hedera-services** - Core network services
- **guardian** - Environmental assets platform
- **hedera-docs** - Official documentation
- **hedera-protobufs** - Protocol definitions
- **hedera-sdk-{java,js,go,swift}** - Language SDKs
- **did-method** - Decentralized identifiers
- **besu** - Ethereum client

## All Commands

```bash
make help          # Show all commands
make clone         # Clone all repos
make update        # Update all repos
make setup-auto    # Setup auto-updates
make watch         # Watch in real-time
make status        # Git status all repos
make logs          # View update logs
make list          # List repos
make count         # Count repos
make check-auto    # Check service status
make stop-auto     # Stop auto-updates
make start-auto    # Start auto-updates
```

## Service Details

**Service Name**: `com.luci.hashgraph.auto-update`
**Update Interval**: 3600 seconds (1 hour)
**Plist Location**: `~/Library/LaunchAgents/com.luci.hashgraph.auto-update.plist`
**Logs**: `luci_hashgraph_nodes/logs/`

## Compared to hedera_council Setup

Both directories use the same management system:

| Feature | hedera_council | luci_hashgraph_nodes |
|---------|---------------|---------------------|
| Location | `/Users/lucia/Desktop/` | `/Users/lucia/Documents/GitHub/luci-metabase-mcp/` |
| Service | `com.hedera.council.auto-update` | `com.luci.hashgraph.auto-update` |
| Integration | Standalone | Part of Luci-Metabase-MCP |
| Purpose | Educational resources | Development integration |

Both are fully independent and can run simultaneously!
