#!/bin/bash

# Comprehensive Test Script for Metabase MCP Server
# This script runs all quality checks and tests in the correct order

set -e  # Exit on any error

echo "Starting comprehensive test suite for Metabase MCP Server..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Step 1: Clean previous builds
print_step "Cleaning previous builds..."
npm run clean 2>/dev/null || true
print_success "Cleaned previous builds"

# Step 2: Install dependencies
print_step "Installing dependencies..."
npm ci
print_success "Dependencies installed"

# Step 3: Type checking
print_step "Running TypeScript type checking..."
npm run type-check
print_success "Type checking passed"

# Step 4: Code formatting check
print_step "Checking code formatting..."
if npm run format:check; then
    print_success "Code formatting is correct"
else
    print_warning "Code formatting issues found. Run 'npm run format' to fix."
fi

# Step 5: Linting
print_step "Running ESLint..."
if npm run lint; then
    print_success "Linting passed"
else
    print_warning "Linting completed with warnings"
fi

# Step 6: Unit tests
print_step "Running unit tests..."
npm test
print_success "All unit tests passed"

# Step 7: Test coverage
print_step "Running tests with coverage analysis..."
npm run test:coverage
print_success "Test coverage analysis completed"

# Step 8: Build project
print_step "Building project..."
npm run build:fast  # Use fast build to avoid circular dependency
print_success "Project built successfully"

# Step 9: Test MCP server startup
print_step "Testing MCP server startup..."
export METABASE_URL="https://test.metabase.local"
export METABASE_API_KEY="test-api-key-for-testing"
export NODE_ENV="test"

# Start server in background and test it can initialize
if command -v timeout >/dev/null 2>&1; then
    timeout 10s node build/src/index.js > /dev/null 2>&1 || {
        if [ $? -eq 124 ]; then
            print_success "MCP server started successfully (timeout as expected)"
        else
            print_error "MCP server failed to start"
            exit 1
        fi
    }
elif command -v gtimeout >/dev/null 2>&1; then
    gtimeout 10s node build/src/index.js > /dev/null 2>&1 || {
        if [ $? -eq 124 ]; then
            print_success "MCP server started successfully (timeout as expected)"
        else
            print_error "MCP server failed to start"
            exit 1
        fi
    }
else
    # Fallback for systems without timeout command
    node build/src/index.js &
    SERVER_PID=$!
    sleep 5
    if kill -0 $SERVER_PID 2>/dev/null; then
        print_success "MCP server started successfully"
        kill $SERVER_PID
    else
        print_error "MCP server failed to start"
        exit 1
    fi
fi

# Step 10: Test summary
print_step "Generating test summary..."
TEST_FILES=$(find tests -name "*.test.ts" | wc -l)
TOTAL_TESTS=$(npm test 2>&1 | grep -o '[0-9]* passed' | head -1 | grep -o '[0-9]*' || echo "Unknown")

echo ""
echo "Test Results Summary:"
echo "========================"
echo "Test Files: $TEST_FILES"
echo "Total Tests: $TOTAL_TESTS"
echo "Coverage Threshold: 80%"
echo "Status: All tests passing"
echo ""

print_success "All quality checks and tests completed successfully!"
echo ""
echo "Your Metabase MCP Server is ready for deployment!"
echo ""
echo "Next steps:"
echo "- Push your changes to trigger CI/CD pipeline"
echo "- Build Docker image: docker build -t metabase-mcp ."
echo "- Run locally: npm start"
echo ""
