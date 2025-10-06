#!/usr/bin/env bash
# Automated Swift SDK Generation and Evolution Script
# Purpose: Automatically generate and update Swift SDKs for cross-compilation
# Supports: All platforms supported by swift-sdk-generator
# Version: 1.0.0

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_PATH="${WORKSPACE_PATH:-$HOME/.luci-swift-workspace}"
SDK_GENERATOR_PATH="$WORKSPACE_PATH/tools/swift-sdk-generator"
SDK_OUTPUT_PATH="$WORKSPACE_PATH/sdks"
LOGS_PATH="$WORKSPACE_PATH/logs"

# SDK Generator configuration
CONTAINER_RUNTIME="${CONTAINER_RUNTIME:-docker}"
USE_DOCKER=true
PARALLEL_BUILDS="${PARALLEL_BUILDS:-false}"
MAX_PARALLEL="${MAX_PARALLEL:-2}"

# Default distributions to generate
DEFAULT_DISTRIBUTIONS=(
    "ubuntu:22.04:x86_64"
    "ubuntu:22.04:aarch64"
    "debian:12:x86_64"
    "amazonlinux:2023:x86_64"
)

# Extra libraries to include
EXTRA_LIBRARIES=(
    "libssl-dev"
    "libcurl4-openssl-dev"
    "zlib1g-dev"
    "libsqlite3-dev"
)

# ============================================================================
# Functions
# ============================================================================

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Swift SDK Generator - Automated Execution            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${CYAN}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_dependencies() {
    print_step "Checking dependencies..."

    local missing=0

    # Check Swift
    if ! command -v swift &> /dev/null; then
        print_error "Swift is not installed"
        echo -e "  Install via: ${CYAN}./scripts/setup-toolchain.sh${NC}"
        ((missing++))
    else
        print_success "Swift: $(swift --version | head -n1)"
    fi

    # Check container runtime
    if ! command -v "$CONTAINER_RUNTIME" &> /dev/null; then
        print_error "$CONTAINER_RUNTIME is not installed"
        echo -e "  Required for SDK generation"
        ((missing++))
    else
        print_success "$CONTAINER_RUNTIME: $(${CONTAINER_RUNTIME} --version | head -n1)"
    fi

    # Check git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed"
        ((missing++))
    fi

    if [ $missing -gt 0 ]; then
        print_error "Missing required dependencies. Please install them first."
        exit 1
    fi

    echo ""
}

setup_workspace() {
    print_step "Setting up workspace at: $WORKSPACE_PATH"

    mkdir -p "$WORKSPACE_PATH"/{tools,sdks/{x86_64,aarch64,armv7},logs,cache}

    print_success "Workspace created"
    echo ""
}

install_sdk_generator() {
    print_step "Installing swift-sdk-generator..."

    if [ -d "$SDK_GENERATOR_PATH" ]; then
        print_warning "swift-sdk-generator already exists, updating..."
        cd "$SDK_GENERATOR_PATH"
        git pull origin main || print_warning "Failed to update, using existing version"
    else
        git clone https://github.com/swiftlang/swift-sdk-generator.git "$SDK_GENERATOR_PATH"
    fi

    cd "$SDK_GENERATOR_PATH"

    print_step "Building swift-sdk-generator..."
    swift build -c release

    if [ -f ".build/release/swift-sdk-generator" ]; then
        print_success "swift-sdk-generator built successfully"
    else
        print_error "Failed to build swift-sdk-generator"
        exit 1
    fi

    echo ""
}

generate_sdk() {
    local dist_name=$1
    local dist_version=$2
    local target_arch=$3
    local output_subdir=$4

    local sdk_id="${dist_name}-${dist_version}-${target_arch}"
    local log_file="$LOGS_PATH/sdk-${sdk_id}.log"

    print_step "Generating SDK: $sdk_id"

    local cmd=("$SDK_GENERATOR_PATH/.build/release/swift-sdk-generator" "make-linux-sdk")

    if [ "$USE_DOCKER" = true ]; then
        cmd+=("--with-docker")
    fi

    cmd+=(
        "--distribution-name" "$dist_name"
        "--distribution-version" "$dist_version"
        "--target-arch" "$target_arch"
        "--output-path" "$SDK_OUTPUT_PATH/$output_subdir"
    )

    # Add extra libraries
    for lib in "${EXTRA_LIBRARIES[@]}"; do
        cmd+=("--extra-library" "$lib")
    done

    echo -e "${MAGENTA}Command: ${cmd[*]}${NC}" | tee "$log_file"
    echo "" | tee -a "$log_file"

    if "${cmd[@]}" 2>&1 | tee -a "$log_file"; then
        print_success "SDK generated: $sdk_id"
        return 0
    else
        print_error "Failed to generate SDK: $sdk_id"
        echo -e "  Log: ${CYAN}$log_file${NC}"
        return 1
    fi
}

generate_all_sdks() {
    print_header
    print_step "Generating SDKs for configured distributions..."
    echo ""

    local distributions=("${@:-${DEFAULT_DISTRIBUTIONS[@]}}")
    local failed=0
    local succeeded=0

    if [ "$PARALLEL_BUILDS" = true ]; then
        print_warning "Parallel builds enabled (max: $MAX_PARALLEL)"
        generate_parallel "${distributions[@]}"
    else
        for dist_spec in "${distributions[@]}"; do
            IFS=':' read -r name version arch <<< "$dist_spec"

            # Determine output subdirectory
            local output_subdir="$arch"

            generate_sdk "$name" "$version" "$arch" "$output_subdir" && ((succeeded++)) || ((failed++))
            echo ""
        done
    fi

    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Generation Summary                                    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo -e "  ${GREEN}Succeeded:${NC} $succeeded"
    echo -e "  ${RED}Failed:${NC}    $failed"
    echo ""

    if [ $failed -eq 0 ]; then
        print_success "All SDKs generated successfully!"
        return 0
    else
        print_error "Some SDKs failed to generate"
        return 1
    fi
}

generate_parallel() {
    local distributions=("$@")
    local pids=()
    local failed=0
    local succeeded=0

    for dist_spec in "${distributions[@]}"; do
        # Wait if we've hit max parallel
        while [ ${#pids[@]} -ge $MAX_PARALLEL ]; do
            for i in "${!pids[@]}"; do
                if ! kill -0 "${pids[$i]}" 2>/dev/null; then
                    wait "${pids[$i]}"
                    local exit_code=$?
                    if [ $exit_code -eq 0 ]; then
                        ((succeeded++))
                    else
                        ((failed++))
                    fi
                    unset 'pids[i]'
                fi
            done
            pids=("${pids[@]}")  # Reindex array
            sleep 1
        done

        # Start new build
        IFS=':' read -r name version arch <<< "$dist_spec"
        generate_sdk "$name" "$version" "$arch" "$arch" &
        pids+=($!)
    done

    # Wait for remaining builds
    for pid in "${pids[@]}"; do
        wait "$pid"
        local exit_code=$?
        if [ $exit_code -eq 0 ]; then
            ((succeeded++))
        else
            ((failed++))
        fi
    done
}

list_generated_sdks() {
    print_step "Listing generated SDKs..."
    echo ""

    if command -v swift &> /dev/null; then
        swift sdk list 2>/dev/null || echo "No SDKs registered with Swift Package Manager"
    else
        print_warning "Swift not available, cannot list installed SDKs"
    fi

    echo ""
    print_step "SDK files in workspace:"
    find "$SDK_OUTPUT_PATH" -name "*.artifactbundle" -o -name "*.tar.gz" 2>/dev/null | while read -r sdk; do
        echo "  $(du -h "$sdk" | cut -f1) - $(basename "$sdk")"
    done

    echo ""
}

install_generated_sdks() {
    print_step "Installing generated SDKs to Swift Package Manager..."

    find "$SDK_OUTPUT_PATH" -name "*.artifactbundle" 2>/dev/null | while read -r sdk_bundle; do
        print_step "Installing: $(basename "$sdk_bundle")"
        swift sdk install "$sdk_bundle" || print_warning "Failed to install $(basename "$sdk_bundle")"
    done

    echo ""
    print_success "SDK installation complete"
    list_generated_sdks
}

create_usage_guide() {
    local guide_file="$WORKSPACE_PATH/USAGE.md"

    cat > "$guide_file" <<EOF
# Swift SDK Usage Guide

Generated by: auto-generate-sdks.sh
Date: $(date)

## Available SDKs

Run \`swift sdk list\` to see all installed SDKs.

## Building with SDKs

### Basic Usage

\`\`\`bash
# List available SDKs
swift sdk list

# Build with specific SDK
swift build --swift-sdk x86_64-unknown-linux-gnu_ubuntu22.04

# Build release with static linking
swift build -c release \\
    --swift-sdk x86_64-unknown-linux-gnu_ubuntu22.04 \\
    --static-swift-stdlib
\`\`\`

### Cross-Compilation Example

\`\`\`bash
# On macOS, build for Linux
swift build --swift-sdk x86_64-unknown-linux-gnu_ubuntu22.04

# On macOS, build for Linux ARM64
swift build --swift-sdk aarch64-unknown-linux-gnu_ubuntu22.04
\`\`\`

## Regenerating SDKs

\`\`\`bash
# Regenerate all default SDKs
$SCRIPT_DIR/auto-generate-sdks.sh

# Regenerate specific distribution
swift-sdk-generator make-linux-sdk \\
    --with-docker \\
    --distribution-name ubuntu \\
    --distribution-version 22.04 \\
    --target-arch x86_64
\`\`\`

## SDK Locations

- Workspace: $WORKSPACE_PATH
- Generated SDKs: $SDK_OUTPUT_PATH
- Logs: $LOGS_PATH

## Troubleshooting

Check logs in: $LOGS_PATH

For more information, see:
- Swift SDK Generator: https://github.com/swiftlang/swift-sdk-generator
- Static Linux SDK: https://www.swift.org/documentation/articles/static-linux-getting-started.html
EOF

    print_success "Usage guide created: $guide_file"
}

show_usage() {
    cat <<EOF
Usage: $0 [OPTIONS] [DISTRIBUTIONS...]

Automated Swift SDK generation for cross-compilation.

OPTIONS:
    -h, --help              Show this help message
    -w, --workspace PATH    Set workspace path (default: $WORKSPACE_PATH)
    -p, --parallel          Enable parallel SDK generation
    -m, --max-parallel N    Maximum parallel builds (default: $MAX_PARALLEL)
    --no-docker             Don't use Docker for generation
    --install               Install generated SDKs to Swift PM
    --list                  List generated SDKs
    -v, --verbose           Enable verbose output

DISTRIBUTIONS:
    Format: name:version:arch
    Examples:
        ubuntu:22.04:x86_64
        debian:12:aarch64
        amazonlinux:2023:x86_64

EXAMPLES:
    # Generate default SDKs
    $0

    # Generate specific SDKs
    $0 ubuntu:22.04:x86_64 debian:12:aarch64

    # Parallel generation
    $0 --parallel --max-parallel 4

    # Generate and install
    $0 --install

EOF
}

# ============================================================================
# Main
# ============================================================================

main() {
    local install_sdks=false
    local list_sdks=false
    local custom_distributions=()

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -w|--workspace)
                WORKSPACE_PATH="$2"
                shift 2
                ;;
            -p|--parallel)
                PARALLEL_BUILDS=true
                shift
                ;;
            -m|--max-parallel)
                MAX_PARALLEL="$2"
                shift 2
                ;;
            --no-docker)
                USE_DOCKER=false
                shift
                ;;
            --install)
                install_sdks=true
                shift
                ;;
            --list)
                list_sdks=true
                shift
                ;;
            -v|--verbose)
                set -x
                shift
                ;;
            *)
                # Assume it's a distribution spec
                custom_distributions+=("$1")
                shift
                ;;
        esac
    done

    print_header

    # Just list if requested
    if [ "$list_sdks" = true ]; then
        list_generated_sdks
        exit 0
    fi

    # Setup
    check_dependencies
    setup_workspace
    install_sdk_generator

    # Generate SDKs
    if [ ${#custom_distributions[@]} -gt 0 ]; then
        generate_all_sdks "${custom_distributions[@]}"
    else
        generate_all_sdks "${DEFAULT_DISTRIBUTIONS[@]}"
    fi

    # Install if requested
    if [ "$install_sdks" = true ]; then
        install_generated_sdks
    fi

    # Create usage guide
    create_usage_guide

    # Final output
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  SDK Generation Complete                               ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Workspace: ${CYAN}$WORKSPACE_PATH${NC}"
    echo -e "SDKs:      ${CYAN}$SDK_OUTPUT_PATH${NC}"
    echo -e "Logs:      ${CYAN}$LOGS_PATH${NC}"
    echo ""
    echo -e "Next steps:"
    echo -e "  1. Install SDKs: ${CYAN}$0 --install${NC}"
    echo -e "  2. List SDKs:    ${CYAN}swift sdk list${NC}"
    echo -e "  3. Build:        ${CYAN}swift build --swift-sdk <sdk-id>${NC}"
    echo ""
    echo -e "Usage guide: ${CYAN}$WORKSPACE_PATH/USAGE.md${NC}"
    echo ""
}

main "$@"
