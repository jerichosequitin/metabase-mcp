#!/usr/bin/env bash
# Real-time repository watcher using fswatch (alternative to launchd)

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
BASE_DIR="/Users/lucia/Documents/GitHub/luci-metabase-mcp/luci_hashgraph_nodes/repos"
UPDATE_INTERVAL=3600  # 1 hour in seconds

echo -e "${GREEN}Hashgraph Repository Watcher${NC}"
echo "Monitoring: $BASE_DIR"
echo "Update interval: $UPDATE_INTERVAL seconds ($(($UPDATE_INTERVAL / 60)) minutes)"
echo ""

# Check if fswatch is installed
if ! command -v fswatch &> /dev/null; then
    echo -e "${YELLOW}fswatch not found. Install with: brew install fswatch${NC}"
    echo "Falling back to periodic updates..."
    USE_FSWATCH=false
else
    echo -e "${GREEN}Using fswatch for real-time monitoring${NC}"
    USE_FSWATCH=true
fi

# Update function
update_repos() {
    echo -e "\n${BLUE}[$(date)] Checking for updates...${NC}"

    UPDATED=0
    FAILED=0
    NO_CHANGES=0

    for repo_path in "$BASE_DIR"/*; do
        if [ -d "$repo_path/.git" ]; then
            repo_name=$(basename "$repo_path")

            cd "$repo_path"

            # Fetch latest changes quietly
            if git fetch --quiet 2>/dev/null; then
                # Check if there are changes
                LOCAL=$(git rev-parse @ 2>/dev/null)
                REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "")

                if [ -z "$REMOTE" ]; then
                    NO_CHANGES=$((NO_CHANGES + 1))
                elif [ "$LOCAL" != "$REMOTE" ]; then
                    echo -e "${YELLOW}  Updating: $repo_name${NC}"
                    if git pull --ff-only 2>/dev/null; then
                        echo -e "${GREEN}  ✓ Updated: $repo_name${NC}"
                        UPDATED=$((UPDATED + 1))
                    else
                        echo -e "${RED}  ✗ Failed: $repo_name${NC}"
                        FAILED=$((FAILED + 1))
                    fi
                else
                    NO_CHANGES=$((NO_CHANGES + 1))
                fi
            else
                FAILED=$((FAILED + 1))
            fi

            cd - > /dev/null
        fi
    done

    if [ $UPDATED -gt 0 ] || [ $FAILED -gt 0 ]; then
        echo -e "${GREEN}Updated: $UPDATED${NC} | No changes: $NO_CHANGES | ${RED}Failed: $FAILED${NC}"
    fi
}

# Trap for clean exit
trap 'echo -e "\n${YELLOW}Stopping watcher...${NC}"; exit 0' INT TERM

if [ "$USE_FSWATCH" = true ]; then
    # Use fswatch for real-time monitoring
    echo -e "${BLUE}Starting fswatch monitor...${NC}"
    echo "Press Ctrl+C to stop"

    # Update immediately
    update_repos

    # Watch for git changes and update periodically
    fswatch -0 -r -l $UPDATE_INTERVAL "$BASE_DIR" | while read -d "" event; do
        update_repos
    done
else
    # Fallback to periodic checks
    echo -e "${BLUE}Starting periodic monitoring...${NC}"
    echo "Press Ctrl+C to stop"

    while true; do
        update_repos
        sleep $UPDATE_INTERVAL
    done
fi
