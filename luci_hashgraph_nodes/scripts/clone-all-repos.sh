#!/usr/bin/env bash
# Clone all repositories from hashgraph organization
# Auto-discovers repos using GitHub API

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ORG_NAME="hashgraph"
BASE_DIR="/Users/lucia/Documents/GitHub/luci-metabase-mcp/luci_hashgraph_nodes/repos"
REPO_LIST_FILE="/Users/lucia/Documents/GitHub/luci-metabase-mcp/luci_hashgraph_nodes/.repo_list.txt"

# GitHub API endpoint
API_URL="https://api.github.com/orgs/${ORG_NAME}/repos"

echo -e "${GREEN}Hashgraph Repository Cloner${NC}"
echo "Organization: $ORG_NAME"
echo "Target directory: $BASE_DIR"

# Create base directory
mkdir -p "$BASE_DIR"

# Function to get all repos (handles pagination)
get_all_repos() {
    local page=1
    local per_page=100
    local all_repos=""

    echo -e "\n${BLUE}Fetching repository list from GitHub...${NC}"

    while true; do
        echo -e "${YELLOW}Fetching page $page...${NC}"

        # Fetch repos with pagination
        local response=$(curl -s "${API_URL}?per_page=${per_page}&page=${page}")

        # Check if response is empty or error
        if [ -z "$response" ] || [ "$response" == "[]" ]; then
            break
        fi

        # Extract repo clone URLs
        local repos=$(echo "$response" | grep -o '"clone_url": "[^"]*"' | sed 's/"clone_url": "\([^"]*\)"/\1/' || true)

        if [ -z "$repos" ]; then
            break
        fi

        all_repos="${all_repos}${repos}"$'\n'
        page=$((page + 1))

        # Check if we got less than per_page results (last page)
        local count=$(echo "$response" | grep -c '"clone_url"' || true)
        if [ "$count" -lt "$per_page" ]; then
            break
        fi

        # Be nice to GitHub API
        sleep 1
    done

    echo "$all_repos"
}

# Get all repository URLs
REPOS=$(get_all_repos)

# Count repos
REPO_COUNT=$(echo "$REPOS" | grep -c "https://" || true)
echo -e "\n${GREEN}Found $REPO_COUNT repositories${NC}"

# Save repo list to file
echo "$REPOS" > "$REPO_LIST_FILE"
echo -e "${GREEN}Saved repository list to $REPO_LIST_FILE${NC}"

# Clone or update each repository
echo -e "\n${BLUE}Cloning/updating repositories...${NC}\n"

CLONED=0
UPDATED=0
FAILED=0

while IFS= read -r repo_url; do
    # Skip empty lines
    [ -z "$repo_url" ] && continue

    # Extract repo name from URL
    repo_name=$(basename "$repo_url" .git)
    repo_path="$BASE_DIR/$repo_name"

    echo -e "${BLUE}Processing: $repo_name${NC}"

    if [ -d "$repo_path" ]; then
        # Repository exists, update it
        echo -e "${YELLOW}  Updating existing repository...${NC}"

        cd "$repo_path"

        if git pull --ff-only 2>/dev/null; then
            echo -e "${GREEN}  ✓ Updated successfully${NC}"
            UPDATED=$((UPDATED + 1))
        else
            echo -e "${RED}  ✗ Update failed${NC}"
            FAILED=$((FAILED + 1))
        fi

        cd - > /dev/null
    else
        # Clone new repository
        echo -e "${YELLOW}  Cloning new repository...${NC}"

        if git clone "$repo_url" "$repo_path" 2>/dev/null; then
            echo -e "${GREEN}  ✓ Cloned successfully${NC}"
            CLONED=$((CLONED + 1))
        else
            echo -e "${RED}  ✗ Clone failed${NC}"
            FAILED=$((FAILED + 1))
        fi
    fi

    echo ""
done <<< "$REPOS"

# Summary
echo -e "\n${GREEN}=== Summary ===${NC}"
echo -e "Total repositories: $REPO_COUNT"
echo -e "${GREEN}Cloned: $CLONED${NC}"
echo -e "${BLUE}Updated: $UPDATED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

# Create update script
echo -e "\n${BLUE}Creating auto-update script...${NC}"
cat > "$BASE_DIR/../scripts/update-repos.sh" << 'UPDATESCRIPT'
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
UPDATESCRIPT

chmod +x "$BASE_DIR/../scripts/update-repos.sh"

echo -e "${GREEN}✓ Auto-update script created at: $BASE_DIR/../scripts/update-repos.sh${NC}"
echo -e "\nTo manually update all repos, run:"
echo -e "  bash /Users/lucia/Documents/GitHub/luci-metabase-mcp/luci_hashgraph_nodes/scripts/update-repos.sh"
