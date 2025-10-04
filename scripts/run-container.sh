#!/usr/bin/env bash
# Run script for Luci-Metabase-MCP containerized runtime

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect container runtime
if command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
    COMPOSE_CMD="podman-compose"
    echo -e "${GREEN}Using Podman${NC}"
elif command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
    COMPOSE_CMD="docker-compose"
    echo -e "${YELLOW}Using Docker (Podman recommended)${NC}"
else
    echo -e "${RED}Error: Neither podman nor docker found${NC}"
    exit 1
fi

# Configuration
IMAGE_NAME="${IMAGE_NAME:-luci-metabase-mcp-bridge}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
CONTAINER_NAME="${CONTAINER_NAME:-luci-mcp-bridge}"

# Parse arguments
RUN_MODE="${1:-standalone}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Creating from template..."
    cp .env.container .env
    echo -e "${YELLOW}Please edit .env with your configuration${NC}"
    exit 1
fi

# Load environment
set -a
source .env
set +a

echo -e "${GREEN}Starting Luci-Metabase-MCP Bridge${NC}"
echo "Mode: $RUN_MODE"

case "$RUN_MODE" in
    standalone)
        echo "Running standalone MCP server..."
        $CONTAINER_CMD run \
            --name "$CONTAINER_NAME" \
            --rm \
            -it \
            --env-file .env \
            -p 3000:3000 \
            -p 8080:8080 \
            -v "$(pwd)/data:/app/data:rw" \
            -v "$(pwd)/logs:/app/logs:rw" \
            "$IMAGE_NAME:$IMAGE_TAG"
        ;;

    compose|full)
        echo "Running with Podman/Docker Compose..."
        if command -v "$COMPOSE_CMD" &> /dev/null; then
            $COMPOSE_CMD up -d
            echo -e "${GREEN}Services started${NC}"
            $COMPOSE_CMD ps
        else
            echo -e "${RED}Error: $COMPOSE_CMD not found${NC}"
            exit 1
        fi
        ;;

    swift)
        echo "Running with Swift bridge profile..."
        if command -v "$COMPOSE_CMD" &> /dev/null; then
            $COMPOSE_CMD --profile swift up -d
            echo -e "${GREEN}Services started with Swift bridge${NC}"
            $COMPOSE_CMD ps
        else
            echo -e "${RED}Error: $COMPOSE_CMD not found${NC}"
            exit 1
        fi
        ;;

    dev)
        echo "Running in development mode..."
        $CONTAINER_CMD run \
            --name "$CONTAINER_NAME-dev" \
            --rm \
            -it \
            --env-file .env \
            -e NODE_ENV=development \
            -e LOG_LEVEL=debug \
            -p 3000:3000 \
            -p 8080:8080 \
            -p 9091:9091 \
            -v "$(pwd)/src:/app/mcp-server/src:ro" \
            -v "$(pwd)/data:/app/data:rw" \
            -v "$(pwd)/logs:/app/logs:rw" \
            "$IMAGE_NAME:$IMAGE_TAG"
        ;;

    shell)
        echo "Opening shell in container..."
        $CONTAINER_CMD run \
            --name "$CONTAINER_NAME-shell" \
            --rm \
            -it \
            --env-file .env \
            --entrypoint /bin/bash \
            "$IMAGE_NAME:$IMAGE_TAG"
        ;;

    *)
        echo -e "${RED}Unknown run mode: $RUN_MODE${NC}"
        echo "Usage: $0 [standalone|compose|swift|dev|shell]"
        exit 1
        ;;
esac

echo -e "\n${GREEN}Container started successfully${NC}"
