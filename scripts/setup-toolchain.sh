#!/usr/bin/env bash
# Toolchain setup script for Luci-Metabase-MCP development
# Installs and configures Swift, Swiftly, and Static Linux SDK
# Ensures all dependencies are self-contained and on PATH

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Luci-Metabase-MCP Toolchain Setup                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect platform
PLATFORM=$(uname -s)
ARCH=$(uname -m)

echo -e "${GREEN}Platform:${NC} $PLATFORM"
echo -e "${GREEN}Architecture:${NC} $ARCH"
echo ""

# Check if running on macOS or Linux
case "$PLATFORM" in
    Darwin)
        PLATFORM_NAME="macOS"
        ;;
    Linux)
        PLATFORM_NAME="Linux"
        ;;
    *)
        echo -e "${RED}Error: Unsupported platform: $PLATFORM${NC}"
        echo -e "This script supports macOS and Linux only."
        exit 1
        ;;
esac

echo -e "${CYAN}Setting up development environment for $PLATFORM_NAME...${NC}"
echo ""

# ============================================================================
# 1. Check/Install Swiftly (Swift toolchain manager)
# ============================================================================

echo -e "${BLUE}[1/5] Checking Swiftly installation...${NC}"

if command -v swiftly &> /dev/null; then
    SWIFTLY_VERSION=$(swiftly --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✓ Swiftly is already installed${NC} (version: $SWIFTLY_VERSION)"
else
    echo -e "${YELLOW}Swiftly not found. Installing...${NC}"
    echo -e "${CYAN}Reference: https://www.swift.org/install/${NC}"
    echo ""

    if [ "$PLATFORM" = "Darwin" ]; then
        # macOS installation
        echo -e "${YELLOW}Please install Swiftly manually on macOS:${NC}"
        echo -e "  Visit: ${CYAN}https://www.swift.org/install/macos/${NC}"
        echo ""
        echo -e "Or use Homebrew:"
        echo -e "  ${CYAN}brew install swiftlang/tap/swiftly${NC}"
        exit 1
    else
        # Linux installation
        curl -L https://swift.org/swiftly/install.sh | bash

        # Source Swiftly environment
        export SWIFTLY_HOME_DIR="${SWIFTLY_HOME_DIR:-$HOME/.local/share/swiftly}"
        if [ -f "$SWIFTLY_HOME_DIR/env.sh" ]; then
            source "$SWIFTLY_HOME_DIR/env.sh"
        fi

        echo -e "${GREEN}✓ Swiftly installed successfully${NC}"
    fi
fi
echo ""

# ============================================================================
# 2. Check/Install Swift 6.0+
# ============================================================================

echo -e "${BLUE}[2/5] Checking Swift installation...${NC}"

if command -v swift &> /dev/null; then
    SWIFT_VERSION=$(swift --version | head -n1)
    echo -e "${GREEN}✓ Swift is installed${NC}"
    echo -e "  Version: $SWIFT_VERSION"

    # Check if Swift 6.0+
    SWIFT_MAJOR=$(swift --version | grep -oE 'Swift version [0-9]+' | awk '{print $3}')
    if [ "${SWIFT_MAJOR:-0}" -lt 6 ]; then
        echo -e "${YELLOW}⚠ Swift 6.0+ is recommended for static linking support${NC}"
        echo -e "${YELLOW}Installing Swift 6.0...${NC}"

        if command -v swiftly &> /dev/null; then
            swiftly install latest
            swiftly use latest
        else
            echo -e "${RED}Error: Please install Swift 6.0+ manually${NC}"
            echo -e "Visit: ${CYAN}https://www.swift.org/install/${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}Swift not found. Installing latest version...${NC}"

    if command -v swiftly &> /dev/null; then
        swiftly install latest
        swiftly use latest
        echo -e "${GREEN}✓ Swift installed successfully${NC}"
    else
        echo -e "${RED}Error: Cannot install Swift without Swiftly${NC}"
        echo -e "Visit: ${CYAN}https://www.swift.org/install/${NC}"
        exit 1
    fi
fi
echo ""

# ============================================================================
# 3. Check/Install Swift Static Linux SDK
# ============================================================================

echo -e "${BLUE}[3/5] Checking Swift Static Linux SDK...${NC}"

if swift sdk list 2>/dev/null | grep -q "swift-linux-musl"; then
    echo -e "${GREEN}✓ Swift Static Linux SDK is already installed${NC}"
    swift sdk list | grep "swift-linux-musl" || true
else
    echo -e "${YELLOW}Installing Swift Static Linux SDK for static linking...${NC}"
    echo -e "${CYAN}Reference: https://www.swift.org/documentation/articles/static-linux-getting-started.html${NC}"
    echo ""

    # Download and install Static Linux SDK
    SDK_VERSION="6.0-RELEASE"
    SDK_URL="https://download.swift.org/swift-6.0-release/static-sdk/swift-6.0-RELEASE/swift-6.0-RELEASE_static-linux-0.0.1.artifactbundle.tar.gz"

    echo -e "${BLUE}Downloading Swift Static Linux SDK...${NC}"
    curl -L "$SDK_URL" -o /tmp/swift-static-sdk.tar.gz

    echo -e "${BLUE}Installing SDK...${NC}"
    swift sdk install /tmp/swift-static-sdk.tar.gz

    rm /tmp/swift-static-sdk.tar.gz
    echo -e "${GREEN}✓ Swift Static Linux SDK installed${NC}"
fi
echo ""

# ============================================================================
# 4. Check Node.js (for MCP server)
# ============================================================================

echo -e "${BLUE}[4/5] Checking Node.js installation...${NC}"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js is installed${NC} (version: $NODE_VERSION)"

    # Check if version is 18+
    NODE_MAJOR=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "${NODE_MAJOR:-0}" -lt 18 ]; then
        echo -e "${YELLOW}⚠ Node.js 18+ is recommended${NC}"
    fi
else
    echo -e "${YELLOW}Node.js not found.${NC}"
    echo -e "Please install Node.js 18+ from: ${CYAN}https://nodejs.org/${NC}"
fi
echo ""

# ============================================================================
# 5. Check Container Runtime (Podman or Docker)
# ============================================================================

echo -e "${BLUE}[5/5] Checking container runtime...${NC}"

if command -v podman &> /dev/null; then
    PODMAN_VERSION=$(podman --version)
    echo -e "${GREEN}✓ Podman is installed${NC} (version: $PODMAN_VERSION)"
elif command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✓ Docker is installed${NC} (version: $DOCKER_VERSION)"
    echo -e "${YELLOW}⚠ Podman is recommended for rootless containers${NC}"
else
    echo -e "${YELLOW}No container runtime found.${NC}"
    echo -e "Please install Podman (recommended) or Docker:"
    echo -e "  Podman: ${CYAN}https://podman.io/getting-started/installation${NC}"
    echo -e "  Docker: ${CYAN}https://docs.docker.com/get-docker/${NC}"
fi
echo ""

# ============================================================================
# Summary
# ============================================================================

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Toolchain Setup Complete                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Installed Tools:${NC}"
command -v swiftly &> /dev/null && echo -e "  ✓ Swiftly: $(swiftly --version 2>/dev/null || echo 'installed')"
command -v swift &> /dev/null && echo -e "  ✓ Swift: $(swift --version | head -n1 | cut -d'(' -f1)"
command -v node &> /dev/null && echo -e "  ✓ Node.js: $(node --version)"
command -v npm &> /dev/null && echo -e "  ✓ npm: $(npm --version)"
command -v podman &> /dev/null && echo -e "  ✓ Podman: $(podman --version | cut -d' ' -f3)" || \
    (command -v docker &> /dev/null && echo -e "  ✓ Docker: $(docker --version | cut -d' ' -f3)")

echo ""
echo -e "${GREEN}Swift SDKs installed:${NC}"
swift sdk list 2>/dev/null || echo -e "  ${YELLOW}Run 'swift sdk list' to see installed SDKs${NC}"

echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "  1. Install Node.js dependencies:"
echo -e "     ${CYAN}npm install${NC}"
echo ""
echo -e "  2. Build the project:"
echo -e "     ${CYAN}make swift-build-static${NC}    # Build static Swift binary"
echo -e "     ${CYAN}make build${NC}                 # Build container image"
echo ""
echo -e "  3. Run tests:"
echo -e "     ${CYAN}make test${NC}                  # Run Node.js tests"
echo -e "     ${CYAN}make swift-test${NC}            # Run Swift tests"
echo ""
echo -e "${BLUE}For more information, see:${NC}"
echo -e "  README.md"
echo -e "  CONTAINER-RUNTIME.md"
echo ""
