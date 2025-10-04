#!/usr/bin/env bash
# Auto-update all Hashgraph repositories

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BASE_DIR="/Users/lucia/Documents/GitHub/luci-metabase-mcp/luci_hashgraph_nodes/repos"

echo -e "${GREEN}Updating all Hashgraph repositories${NC}"
echo "Directory: $BASE_DIR"
echo ""

UPDATED=0
FAILED=0
NO_CHANGES=0

for repo_path in "$BASE_DIR"/*; do
    if [ -d "$repo_path/.git" ]; then
        repo_name=$(basename "$repo_path")
        echo -e "${YELLOW}Updating: $repo_name${NC}"

        cd "$repo_path"

        # Fetch latest changes
        git fetch --quiet

        # Check if there are changes
        LOCAL=$(git rev-parse @)
        REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "")

        if [ -z "$REMOTE" ]; then
            echo -e "${YELLOW}  No remote tracking branch${NC}"
            NO_CHANGES=$((NO_CHANGES + 1))
        elif [ "$LOCAL" = "$REMOTE" ]; then
            echo -e "${GREEN}  Already up to date${NC}"
            NO_CHANGES=$((NO_CHANGES + 1))
        else
            if git pull --ff-only 2>/dev/null; then
                echo -e "${GREEN}  ✓ Updated${NC}"
                UPDATED=$((UPDATED + 1))
            else
                echo -e "${RED}  ✗ Update failed${NC}"
                FAILED=$((FAILED + 1))
            fi
        fi

        cd - > /dev/null
    fi
done

echo -e "\n${GREEN}=== Summary ===${NC}"
echo -e "${GREEN}Updated: $UPDATED${NC}"
echo -e "No changes: $NO_CHANGES"
echo -e "${RED}Failed: $FAILED${NC}"
