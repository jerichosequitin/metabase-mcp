#!/usr/bin/env bash
# Build script for creating static Linux binaries from Swift code
# Uses Swift Static Linux SDK with musl libc for full static linking
# Reference: https://www.swift.org/documentation/articles/static-linux-getting-started.html

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SWIFT_BRIDGE_DIR="$PROJECT_ROOT/swift-bridge"
BUILD_DIR="$SWIFT_BRIDGE_DIR/.build"
OUTPUT_DIR="$PROJECT_ROOT/build/swift"

# Swift SDK configuration
SWIFT_SDK_X86_64="x86_64-swift-linux-musl"
SWIFT_SDK_AARCH64="aarch64-swift-linux-musl"

# Parse arguments
ARCH="${1:-x86_64}"
BUILD_TYPE="${2:-release}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Luci-Metabase-MCP Static Swift Builder               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Configuration:${NC}"
echo -e "  Architecture: ${YELLOW}$ARCH${NC}"
echo -e "  Build Type:   ${YELLOW}$BUILD_TYPE${NC}"
echo -e "  Project Root: ${YELLOW}$PROJECT_ROOT${NC}"
echo -e "  Swift Bridge:  ${YELLOW}$SWIFT_BRIDGE_DIR${NC}"
echo ""

# Check if Swift is installed
if ! command -v swift &> /dev/null; then
    echo -e "${RED}Error: Swift is not installed${NC}"
    echo -e "${YELLOW}Install Swift using Swiftly:${NC}"
    echo -e "  curl -L https://swift.org/swiftly/install.sh | bash"
    exit 1
fi

SWIFT_VERSION=$(swift --version | head -n1)
echo -e "${GREEN}Swift Version:${NC} $SWIFT_VERSION"
echo ""

# Change to Swift bridge directory
cd "$SWIFT_BRIDGE_DIR"

# Select Swift SDK based on architecture
case "$ARCH" in
    x86_64|amd64)
        SWIFT_SDK="$SWIFT_SDK_X86_64"
        ;;
    aarch64|arm64)
        SWIFT_SDK="$SWIFT_SDK_AARCH64"
        ;;
    *)
        echo -e "${RED}Error: Unsupported architecture: $ARCH${NC}"
        echo -e "Supported architectures: x86_64, amd64, aarch64, arm64"
        exit 1
        ;;
esac

echo -e "${GREEN}Target Swift SDK:${NC} $SWIFT_SDK"
echo ""

# Check if Swift SDK is installed
echo -e "${BLUE}Checking Swift SDK installation...${NC}"
if ! swift sdk list 2>/dev/null | grep -q "$SWIFT_SDK"; then
    echo -e "${YELLOW}Swift SDK '$SWIFT_SDK' not found. Installing...${NC}"

    # Install the appropriate SDK
    case "$SWIFT_SDK" in
        "$SWIFT_SDK_X86_64")
            SDK_URL="https://download.swift.org/swift-6.0-release/static-sdk/swift-6.0-RELEASE/swift-6.0-RELEASE_static-linux-0.0.1.artifactbundle.tar.gz"
            ;;
        "$SWIFT_SDK_AARCH64")
            SDK_URL="https://download.swift.org/swift-6.0-release/static-sdk/swift-6.0-RELEASE/swift-6.0-RELEASE_static-linux-0.0.1.artifactbundle.tar.gz"
            ;;
    esac

    echo -e "${BLUE}Downloading Swift Static Linux SDK...${NC}"
    curl -L "$SDK_URL" -o /tmp/swift-static-sdk.tar.gz

    echo -e "${BLUE}Installing Swift SDK...${NC}"
    swift sdk install /tmp/swift-static-sdk.tar.gz

    rm /tmp/swift-static-sdk.tar.gz
    echo -e "${GREEN}Swift SDK installed successfully${NC}"
else
    echo -e "${GREEN}Swift SDK '$SWIFT_SDK' is already installed${NC}"
fi
echo ""

# Clean previous builds if requested
if [ "${CLEAN_BUILD:-false}" = "true" ]; then
    echo -e "${YELLOW}Cleaning previous build artifacts...${NC}"
    swift package clean
    rm -rf "$BUILD_DIR"
fi

# Resolve dependencies
echo -e "${BLUE}Resolving Swift package dependencies...${NC}"
swift package resolve --swift-sdk "$SWIFT_SDK"
echo -e "${GREEN}Dependencies resolved${NC}"
echo ""

# Build the project with static linking
echo -e "${BLUE}Building statically linked executable...${NC}"
echo -e "${YELLOW}This may take several minutes on first build...${NC}"
echo ""

if [ "$BUILD_TYPE" = "release" ]; then
    swift build -c release \
        --swift-sdk "$SWIFT_SDK" \
        --static-swift-stdlib \
        -Xswiftc -static-executable \
        -Xswiftc -O \
        -Xlinker -s

    BINARY_PATH="$BUILD_DIR/release/LuciMetabaseBridge"
else
    swift build -c debug \
        --swift-sdk "$SWIFT_SDK" \
        --static-swift-stdlib \
        -Xswiftc -static-executable

    BINARY_PATH="$BUILD_DIR/debug/LuciMetabaseBridge"
fi

echo ""
echo -e "${GREEN}✓ Build successful!${NC}"
echo ""

# Verify static linking
echo -e "${BLUE}Verifying static linking...${NC}"
if [ -f "$BINARY_PATH" ]; then
    FILE_INFO=$(file "$BINARY_PATH")
    echo -e "${GREEN}Binary info:${NC} $FILE_INFO"

    # Check for dynamic dependencies (should be none or minimal)
    if command -v ldd &> /dev/null; then
        echo ""
        echo -e "${BLUE}Dynamic dependencies check:${NC}"
        if ldd "$BINARY_PATH" 2>&1 | grep -q "not a dynamic executable"; then
            echo -e "${GREEN}✓ Fully static binary (no dynamic dependencies)${NC}"
        else
            echo -e "${YELLOW}Dynamic dependencies found:${NC}"
            ldd "$BINARY_PATH" || true
        fi
    fi

    # Get binary size
    BINARY_SIZE=$(du -h "$BINARY_PATH" | cut -f1)
    echo ""
    echo -e "${GREEN}Binary size:${NC} $BINARY_SIZE"

    # Copy to output directory
    mkdir -p "$OUTPUT_DIR"
    cp "$BINARY_PATH" "$OUTPUT_DIR/luci-metabase-bridge-$ARCH"

    echo ""
    echo -e "${GREEN}✓ Binary copied to:${NC} $OUTPUT_DIR/luci-metabase-bridge-$ARCH"
else
    echo -e "${RED}Error: Binary not found at $BINARY_PATH${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Build Complete                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "  • Test the binary: ${YELLOW}$OUTPUT_DIR/luci-metabase-bridge-$ARCH --help${NC}"
echo -e "  • Run the server:  ${YELLOW}$OUTPUT_DIR/luci-metabase-bridge-$ARCH --host 0.0.0.0 --port 8001${NC}"
echo -e "  • Build container: ${YELLOW}make build${NC}"
echo ""
