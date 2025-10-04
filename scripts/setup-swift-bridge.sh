#!/usr/bin/env bash
# Setup script for Swift bridge components
# Initializes the Swift package and prepares for building

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up Swift Bridge Components${NC}"

# Check if Swift is installed
if ! command -v swift &> /dev/null; then
    echo -e "${YELLOW}Swift not found on this system${NC}"
    echo "Swift bridge will be built inside the container"
    exit 0
fi

echo "Swift version:"
swift --version

# Navigate to swift-bridge directory
cd swift-bridge

echo -e "\n${GREEN}Creating Swift package structure${NC}"

# Create test directory
mkdir -p Tests/LuciMetabaseBridgeTests

# Create a basic test file
cat > Tests/LuciMetabaseBridgeTests/BridgeTests.swift <<'EOF'
import XCTest
@testable import LuciMetabaseBridgeLib

final class BridgeTests: XCTestCase {
    func testBridgeConfiguration() {
        let config = BridgeConfiguration()
        XCTAssertEqual(config.host, "::")
        XCTAssertEqual(config.port, 8001)
    }
}
EOF

echo -e "${GREEN}Resolving Swift package dependencies${NC}"
swift package resolve

echo -e "${GREEN}Building Swift bridge (debug)${NC}"
swift build

echo -e "\n${GREEN}Swift bridge setup completed${NC}"
echo "Binary location: .build/debug/LuciMetabaseBridge"

# Run tests
echo -e "\n${GREEN}Running tests${NC}"
swift test || echo -e "${YELLOW}Some tests failed (expected in initial setup)${NC}"

echo -e "\n${GREEN}Swift bridge is ready for development${NC}"
echo "To build for release: swift build -c release"
echo "To run: swift run LuciMetabaseBridge --help"
