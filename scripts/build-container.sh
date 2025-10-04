#!/usr/bin/env bash
# Build script for Luci-Metabase-MCP containerized runtime
# Supports both Podman and Docker

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect container runtime
if command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
    echo -e "${GREEN}Using Podman${NC}"
elif command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
    echo -e "${YELLOW}Using Docker (Podman recommended)${NC}"
else
    echo -e "${RED}Error: Neither podman nor docker found${NC}"
    exit 1
fi

# Configuration
IMAGE_NAME="${IMAGE_NAME:-luci-metabase-mcp-bridge}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
CONTAINERFILE="${CONTAINERFILE:-Containerfile}"

# Parse arguments
BUILD_TYPE="${1:-all}"

echo -e "${GREEN}Building Luci-Metabase-MCP Bridge Container${NC}"
echo "Container runtime: $CONTAINER_CMD"
echo "Image: $IMAGE_NAME:$IMAGE_TAG"
echo "Build type: $BUILD_TYPE"

# Build function
build_container() {
    local target="${1:-}"
    local tag_suffix="${2:-}"

    local tag="$IMAGE_NAME:${IMAGE_TAG}${tag_suffix}"

    echo -e "\n${GREEN}Building: $tag${NC}"

    if [ -n "$target" ]; then
        $CONTAINER_CMD build \
            --target "$target" \
            -t "$tag" \
            -f "$CONTAINERFILE" \
            .
    else
        $CONTAINER_CMD build \
            -t "$tag" \
            -f "$CONTAINERFILE" \
            .
    fi

    echo -e "${GREEN}Build completed: $tag${NC}"
}

# Build based on type
case "$BUILD_TYPE" in
    swift)
        echo "Building Swift bridge only..."
        build_container "swift-builder" "-swift"
        ;;

    bazel)
        echo "Building Bazel tools only..."
        build_container "bazel-builder" "-bazel"
        ;;

    node)
        echo "Building Node.js MCP server only..."
        build_container "node-builder" "-node"
        ;;

    all|full)
        echo "Building complete runtime..."
        build_container "" ""
        ;;

    *)
        echo -e "${RED}Unknown build type: $BUILD_TYPE${NC}"
        echo "Usage: $0 [swift|bazel|node|all]"
        exit 1
        ;;
esac

echo -e "\n${GREEN}Build process completed successfully${NC}"

# Show images
echo -e "\n${GREEN}Available images:${NC}"
$CONTAINER_CMD images | grep "$IMAGE_NAME" || true
