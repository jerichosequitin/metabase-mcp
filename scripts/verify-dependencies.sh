#!/usr/bin/env bash
# Dependency verification script for Luci-Metabase-MCP
# Ensures all required tools are on PATH and properly configured

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
PASS=0
WARN=0
FAIL=0

# Check function
check_command() {
    local cmd=$1
    local name=$2
    local required=$3
    local version_cmd=${4:-"--version"}

    echo -n "  Checking $name... "

    if command -v "$cmd" &> /dev/null; then
        echo -e "${GREEN}✓${NC}"
        if [ "$version_cmd" != "none" ]; then
            local version=$($cmd $version_cmd 2>&1 | head -n1)
            echo -e "    ${CYAN}$version${NC}"
        fi
        ((PASS++))
    else
        if [ "$required" = "required" ]; then
            echo -e "${RED}✗ NOT FOUND (REQUIRED)${NC}"
            ((FAIL++))
        else
            echo -e "${YELLOW}⚠ NOT FOUND (OPTIONAL)${NC}"
            ((WARN++))
        fi
    fi
}

# Check version requirement
check_version() {
    local cmd=$1
    local name=$2
    local min_version=$3
    local version_cmd=$4

    echo -n "  Checking $name version... "

    if command -v "$cmd" &> /dev/null; then
        local current=$($version_cmd 2>&1)
        echo -e "${GREEN}✓${NC}"
        echo -e "    ${CYAN}Current: $current${NC}"
        echo -e "    ${CYAN}Required: $min_version+${NC}"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠ SKIPPED (tool not found)${NC}"
        ((WARN++))
    fi
}

# Check PATH
check_path() {
    local dir=$1
    local name=$2

    echo -n "  Checking $name in PATH... "

    if echo "$PATH" | grep -q "$dir"; then
        echo -e "${GREEN}✓${NC}"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠ NOT IN PATH${NC}"
        echo -e "    ${CYAN}Add to PATH: export PATH=\"$dir:\$PATH\"${NC}"
        ((WARN++))
    fi
}

# Check file/directory existence
check_exists() {
    local path=$1
    local name=$2
    local required=$3

    echo -n "  Checking $name... "

    if [ -e "$path" ]; then
        echo -e "${GREEN}✓ EXISTS${NC}"
        echo -e "    ${CYAN}$path${NC}"
        ((PASS++))
    else
        if [ "$required" = "required" ]; then
            echo -e "${RED}✗ NOT FOUND (REQUIRED)${NC}"
            ((FAIL++))
        else
            echo -e "${YELLOW}⚠ NOT FOUND (OPTIONAL)${NC}"
            ((WARN++))
        fi
    fi
}

# Main verification
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Luci-Metabase-MCP Dependency Verification            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Core Development Tools
# ============================================================================
echo -e "${BLUE}[1] Core Development Tools${NC}"
check_command "git" "Git" "required"
check_command "curl" "curl" "required"
check_command "make" "Make" "required"
check_command "bash" "Bash" "required" "none"
echo ""

# ============================================================================
# Swift Toolchain
# ============================================================================
echo -e "${BLUE}[2] Swift Toolchain${NC}"
check_command "swift" "Swift" "required"
check_command "swiftly" "Swiftly" "optional"

if command -v swift &> /dev/null; then
    check_version "swift" "Swift" "6.0" "swift --version | head -n1"

    # Check Swift SDKs
    echo -n "  Checking Swift Static Linux SDK... "
    if swift sdk list 2>/dev/null | grep -q "swift-linux-musl"; then
        echo -e "${GREEN}✓ INSTALLED${NC}"
        swift sdk list 2>/dev/null | grep "swift-linux-musl" | sed 's/^/    /' || true
        ((PASS++))
    else
        echo -e "${RED}✗ NOT INSTALLED${NC}"
        echo -e "    ${YELLOW}Run: ./scripts/setup-toolchain.sh${NC}"
        ((FAIL++))
    fi
fi
echo ""

# ============================================================================
# Node.js Ecosystem
# ============================================================================
echo -e "${BLUE}[3] Node.js Ecosystem${NC}"
check_command "node" "Node.js" "required"
check_command "npm" "npm" "required"

if command -v node &> /dev/null; then
    check_version "node" "Node.js" "18.0" "node --version"
fi
echo ""

# ============================================================================
# Container Runtime
# ============================================================================
echo -e "${BLUE}[4] Container Runtime${NC}"
check_command "podman" "Podman" "optional"
check_command "docker" "Docker" "optional"
check_command "podman-compose" "Podman Compose" "optional" "none"
check_command "docker-compose" "Docker Compose" "optional"

if ! command -v podman &> /dev/null && ! command -v docker &> /dev/null; then
    echo -e "    ${RED}⚠ No container runtime found${NC}"
    echo -e "    ${YELLOW}Install Podman or Docker for container builds${NC}"
    ((WARN++))
fi
echo ""

# ============================================================================
# Build Tools
# ============================================================================
echo -e "${BLUE}[5] Build Tools${NC}"
check_command "pkg-config" "pkg-config" "optional"
check_command "cmake" "CMake" "optional"
check_command "ninja" "Ninja" "optional"
echo ""

# ============================================================================
# PATH Configuration
# ============================================================================
echo -e "${BLUE}[6] PATH Configuration${NC}"

# Swift paths
if command -v swiftly &> /dev/null; then
    SWIFTLY_HOME="${SWIFTLY_HOME_DIR:-$HOME/.local/share/swiftly}"
    check_path "$SWIFTLY_HOME/toolchains" "Swiftly toolchains"
fi

# Local bin paths
check_path "$HOME/.local/bin" "Local bin"
check_path "/usr/local/bin" "System local bin"
echo ""

# ============================================================================
# Project Structure
# ============================================================================
echo -e "${BLUE}[7] Project Structure${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

check_exists "$PROJECT_ROOT/swift-bridge/Package.swift" "Swift Package.swift" "required"
check_exists "$PROJECT_ROOT/package.json" "Node package.json" "required"
check_exists "$PROJECT_ROOT/Makefile" "Makefile" "required"
check_exists "$PROJECT_ROOT/Containerfile" "Containerfile" "required"
check_exists "$PROJECT_ROOT/scripts/build-static-swift.sh" "Static build script" "required"
check_exists "$PROJECT_ROOT/scripts/setup-toolchain.sh" "Toolchain setup script" "required"
echo ""

# ============================================================================
# Swift Package Dependencies
# ============================================================================
echo -e "${BLUE}[8] Swift Package Status${NC}"

cd "$PROJECT_ROOT/swift-bridge"

echo -n "  Checking Swift package resolution... "
if [ -d ".build/checkouts" ] && [ "$(ls -A .build/checkouts 2>/dev/null)" ]; then
    echo -e "${GREEN}✓ RESOLVED${NC}"
    ((PASS++))
else
    echo -e "${YELLOW}⚠ NOT RESOLVED${NC}"
    echo -e "    ${CYAN}Run: cd swift-bridge && swift package resolve${NC}"
    ((WARN++))
fi

cd "$PROJECT_ROOT"
echo ""

# ============================================================================
# Node.js Dependencies
# ============================================================================
echo -e "${BLUE}[9] Node.js Dependencies${NC}"

echo -n "  Checking node_modules... "
if [ -d "node_modules" ] && [ "$(ls -A node_modules 2>/dev/null)" ]; then
    echo -e "${GREEN}✓ INSTALLED${NC}"
    ((PASS++))
else
    echo -e "${YELLOW}⚠ NOT INSTALLED${NC}"
    echo -e "    ${CYAN}Run: npm install${NC}"
    ((WARN++))
fi
echo ""

# ============================================================================
# Environment Variables
# ============================================================================
echo -e "${BLUE}[10] Environment Variables${NC}"

check_env() {
    local var=$1
    local name=$2
    local required=$3

    echo -n "  Checking $name... "
    if [ -n "${!var:-}" ]; then
        echo -e "${GREEN}✓ SET${NC}"
        echo -e "    ${CYAN}${var}=${!var}${NC}"
        ((PASS++))
    else
        if [ "$required" = "required" ]; then
            echo -e "${RED}✗ NOT SET (REQUIRED)${NC}"
            ((FAIL++))
        else
            echo -e "${YELLOW}⚠ NOT SET (OPTIONAL)${NC}"
            ((WARN++))
        fi
    fi
}

check_env "PATH" "PATH" "required"
check_env "SWIFTLY_HOME_DIR" "Swiftly home" "optional"
check_env "SWIFT_SDK" "Swift SDK" "optional"
echo ""

# ============================================================================
# System Information
# ============================================================================
echo -e "${BLUE}[11] System Information${NC}"

echo -e "  Platform:     ${CYAN}$(uname -s)${NC}"
echo -e "  Architecture: ${CYAN}$(uname -m)${NC}"
echo -e "  Kernel:       ${CYAN}$(uname -r)${NC}"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo -e "  OS:           ${CYAN}$NAME $VERSION${NC}"
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Verification Summary                                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL=$((PASS + WARN + FAIL))
echo -e "  ${GREEN}Passed:${NC}  $PASS/$TOTAL"
echo -e "  ${YELLOW}Warnings:${NC} $WARN/$TOTAL"
echo -e "  ${RED}Failed:${NC}  $FAIL/$TOTAL"
echo ""

if [ $FAIL -eq 0 ] && [ $WARN -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Environment is fully configured.${NC}"
    echo ""
    echo -e "${GREEN}Ready to build:${NC}"
    echo -e "  ${CYAN}make swift-build-static${NC}  # Build static Swift binary"
    echo -e "  ${CYAN}make build${NC}                # Build container image"
    exit 0
elif [ $FAIL -eq 0 ]; then
    echo -e "${YELLOW}⚠ Environment is functional but some optional tools are missing.${NC}"
    echo ""
    echo -e "${YELLOW}Recommended actions:${NC}"
    echo -e "  ${CYAN}./scripts/setup-toolchain.sh${NC}  # Setup missing tools"
    exit 0
else
    echo -e "${RED}✗ Environment has missing required dependencies.${NC}"
    echo ""
    echo -e "${RED}Required actions:${NC}"
    echo -e "  ${CYAN}./scripts/setup-toolchain.sh${NC}  # Setup required tools"
    echo ""
    echo -e "See ${CYAN}STATIC-COMPILATION.md${NC} for detailed setup instructions."
    exit 1
fi
