# Luci Hashgraph Nodes

Automated repository management for all Hashgraph organization repositories, integrated into the Luci-Metabase-MCP project.

## Quick Start

### Clone All Repositories

```bash
cd /Users/lucia/Documents/GitHub/luci-metabase-mcp/luci_hashgraph_nodes

# Clone all Hashgraph org repositories
make clone

# Or manually:
bash scripts/clone-all-repos.sh
```

### Setup Automatic Updates

```bash
# Setup auto-updates (runs every hour via launchd)
make setup-auto

# Or manually:
bash scripts/setup-auto-update.sh
```

### Manual Updates

```bash
# Update all repositories
make update

# Or manually:
bash scripts/update-repos.sh
```

## Available Commands

```bash
make help              # Show all available commands
make clone             # Clone all Hashgraph repositories
make update            # Update all repositories
make setup-auto        # Setup automatic updates
make watch             # Watch repositories in real-time
make status            # Show git status of all repos
make logs              # View auto-update logs
make list              # List all cloned repositories
make count             # Count total repositories
```

## Directory Structure

```
luci_hashgraph_nodes/
├── repos/                          # All cloned repositories
│   ├── hedera-services/
│   ├── hedera-docs/
│   ├── guardian/
│   └── ... (all hashgraph repos)
├── scripts/                        # Management scripts
│   ├── clone-all-repos.sh         # Clone all repos
│   ├── update-repos.sh            # Update all repos
│   ├── setup-auto-update.sh       # Setup launchd service
│   └── watch-repos.sh             # Real-time watcher
├── logs/                           # Auto-update logs
│   ├── auto-update.log
│   └── auto-update.error.log
├── Makefile                        # Build automation
└── README.md                       # This file
```

## Automatic Updates

### Using launchd (macOS)

The automatic update service runs every hour via macOS launchd:

```bash
# Setup (one-time)
make setup-auto

# Check status
make check-auto

# View logs
make logs

# Stop service
make stop-auto

# Start service
make start-auto
```

### Using Real-time Watcher

Alternative to launchd, watches for changes in real-time:

```bash
# Install fswatch (optional, for better performance)
brew install fswatch

# Start watcher (runs in foreground)
make watch
```

## Repository Management

### Listing Repositories

```bash
# List all cloned repos
make list

# Count repos
make count

# Show status of all repos
make status
```

### Fetching vs Pulling

```bash
# Fetch all (download changes without merging)
make fetch-all

# Pull all (download and merge changes)
make pull-all
```

## Integration with Luci-Metabase-MCP

This repository manager is part of the larger Luci-Metabase-MCP bridging architecture:

```
luci-metabase-mcp/
├── src/                           # MCP server source
├── swift-bridge/                  # Swift-NIO bridge
├── buildtools/                    # Bazel build tools
├── luci-runme/                    # Runme integration
└── luci_hashgraph_nodes/          # This directory
    └── repos/                     # All Hashgraph repos
```

### Cross-Integration Points

- **Swift Bridge**: Use Hashgraph Swift SDKs from repos
- **Hedera Integration**: Guardian, DID, and other Hedera tools
- **Build Tools**: Bazel integration for multi-repo builds
- **Documentation**: Runme-compatible documentation from repos

## Logs

### Viewing Logs

```bash
# View auto-update logs
make logs

# View error logs
make logs-error

# Or manually:
tail -f logs/auto-update.log
tail -f logs/auto-update.error.log
```

### Log Location

- **Output**: `logs/auto-update.log`
- **Errors**: `logs/auto-update.error.log`

## Troubleshooting

### Repositories Not Updating

```bash
# Check service status
make check-auto

# Manually trigger update
make update

# Check error logs
make logs-error
```

### Service Not Running

```bash
# Restart service
make stop-auto
make start-auto

# Or recreate completely
make setup-auto
```

### Clone Failures

```bash
# Re-run clone (updates existing, clones missing)
make clone

# Check network connectivity
curl -I https://api.github.com
```

## Key Hashgraph Repositories

Common repositories you'll find here:

- **hedera-services** - Core Hedera network services
- **hedera-docs** - Official documentation
- **guardian** - Environmental assets platform
- **hedera-protobufs** - Protocol buffer definitions
- **hedera-sdk-{java,js,go,swift}** - Language-specific SDKs
- **did-method** - Decentralized identifier implementation
- **besu** - Ethereum client integration
- **fabric-hcs** - Hyperledger Fabric integration

## Performance

- **~87 repositories** from hashgraph org
- **Clone time**: ~10-30 minutes (depending on connection)
- **Update time**: ~1-2 minutes per hour
- **Disk space**: ~2-5 GB (all repos)

## Cleanup

```bash
# Clean logs only
make clean-logs

# Remove all repositories (WARNING: destructive)
make clean
```

## Integration Examples

### Using with Swift Bridge

```bash
# Access Hedera Swift SDK
cd repos/hedera-sdk-swift
swift build

# Link to Swift bridge
cd ../../swift-bridge
# Add hedera-sdk-swift as dependency
```

### Using with Buildtools

```bash
# Use buildifier on Hashgraph repos
cd repos/hedera-services
buildifier -r .
```

### Using with Runme

```bash
# Execute documentation from Hashgraph repos
cd repos/hedera-docs
runme run install
```

## Advanced Usage

### Custom Update Intervals

Edit the launchd plist to change update frequency:

```bash
# Edit interval (in seconds)
nano ~/Library/LaunchAgents/com.luci.hashgraph.auto-update.plist

# Change <integer>3600</integer> to desired interval
# Then reload:
make stop-auto
make start-auto
```

### Selective Repository Updates

```bash
# Update only specific repos
cd repos/hedera-services && git pull
cd repos/guardian && git pull
```

## Contributing

To add custom scripts or improvements:

1. Add scripts to `scripts/` directory
2. Make executable: `chmod +x scripts/your-script.sh`
3. Add to Makefile for easy access

## License

Repository management tools are provided as-is. Individual repositories maintain their own licenses (typically Apache 2.0).
