#!/usr/bin/env bash
# Setup automatic updates for Hashgraph repositories using launchd (macOS)

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Setting up automatic repository updates${NC}"

# Configuration
UPDATE_SCRIPT="/Users/lucia/Documents/GitHub/luci-metabase-mcp/luci_hashgraph_nodes/scripts/update-repos.sh"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_NAME="com.luci.hashgraph.auto-update"
PLIST_FILE="$PLIST_DIR/${PLIST_NAME}.plist"

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$PLIST_DIR"

# Create launchd plist for automatic updates
echo -e "${BLUE}Creating launchd configuration...${NC}"

cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${UPDATE_SCRIPT}</string>
    </array>

    <key>StartInterval</key>
    <integer>3600</integer>

    <key>RunAtLoad</key>
    <true/>

    <key>StandardOutPath</key>
    <string>/Users/lucia/Documents/GitHub/luci-metabase-mcp/luci_hashgraph_nodes/logs/auto-update.log</string>

    <key>StandardErrorPath</key>
    <string>/Users/lucia/Documents/GitHub/luci-metabase-mcp/luci_hashgraph_nodes/logs/auto-update.error.log</string>

    <key>WorkingDirectory</key>
    <string>/Users/lucia/Documents/GitHub/luci-metabase-mcp/luci_hashgraph_nodes</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
EOF

# Create logs directory
mkdir -p "/Users/lucia/Documents/GitHub/luci-metabase-mcp/luci_hashgraph_nodes/logs"

echo -e "${GREEN}✓ Created launchd configuration at: $PLIST_FILE${NC}"
echo -e "${YELLOW}Update interval: Every hour (3600 seconds)${NC}"

# Load the plist
echo -e "\n${BLUE}Loading launchd job...${NC}"

# Unload if already loaded
launchctl unload "$PLIST_FILE" 2>/dev/null || true

# Load the new configuration
if launchctl load "$PLIST_FILE"; then
    echo -e "${GREEN}✓ Auto-update service loaded successfully${NC}"
else
    echo -e "${YELLOW}Warning: Could not load service (might already be loaded)${NC}"
fi

# Show status
echo -e "\n${BLUE}Service Status:${NC}"
launchctl list | grep "$PLIST_NAME" || echo "Service not running yet (will start on next interval or reboot)"

echo -e "\n${GREEN}=== Setup Complete ===${NC}"
echo "Automatic updates configured to run every hour"
echo ""
echo "Logs location:"
echo "  - Output: /Users/lucia/Documents/GitHub/luci-metabase-mcp/luci_hashgraph_nodes/logs/auto-update.log"
echo "  - Errors: /Users/lucia/Documents/GitHub/luci-metabase-mcp/luci_hashgraph_nodes/logs/auto-update.error.log"
echo ""
echo "Useful commands:"
echo "  - View logs: tail -f /Users/lucia/Documents/GitHub/luci-metabase-mcp/luci_hashgraph_nodes/logs/auto-update.log"
echo "  - Check status: launchctl list | grep luci.hashgraph"
echo "  - Stop service: launchctl unload $PLIST_FILE"
echo "  - Start service: launchctl load $PLIST_FILE"
echo "  - Manual update: bash $UPDATE_SCRIPT"
