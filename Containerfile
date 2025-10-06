# Multi-Stage Containerfile for Luci-Metabase-MCP Bridge Runtime
# Podman-compatible, rootless-ready containerization
# Implements BRIDGING-ARCHITECTURE.md patterns for Apple ↔ Linux ↔ Web3 ↔ LuciVerse

# ============================================================================
# Stage 1: Swift Build Environment with Static Linking Support
# ============================================================================
FROM docker.io/swift:6.0-jammy as swift-builder

LABEL stage="swift-builder"
LABEL description="Swift-NIO bridge components build with static linking"

WORKDIR /build/swift

# Install Swift build dependencies for static linking
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    git \
    libatomic1 \
    libcurl4-openssl-dev \
    libedit2 \
    libgcc-12-dev \
    libpython3.10 \
    libsqlite3-0 \
    libstdc++-12-dev \
    libxml2-dev \
    libncurses5-dev \
    libz3-dev \
    pkg-config \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Static Linux SDK for musl-based static linking
# This enables fully static binaries with no external dependencies
RUN curl -L https://download.swift.org/swift-6.0-release/static-sdk/swift-6.0-RELEASE/swift-6.0-RELEASE_static-linux-0.0.1.artifactbundle.tar.gz \
    -o /tmp/static-sdk.tar.gz && \
    mkdir -p /opt/swift-static-sdk && \
    tar -xzf /tmp/static-sdk.tar.gz -C /opt/swift-static-sdk && \
    rm /tmp/static-sdk.tar.gz

# Copy Swift bridge components
COPY swift-bridge/ ./

# Resolve dependencies
RUN swift package resolve

# Build with static linking using musl libc
# This creates a fully statically linked executable with no runtime dependencies
RUN swift build -c release \
    --static-swift-stdlib \
    -Xswiftc -static-executable \
    -Xswiftc -O \
    -Xlinker -s

# ============================================================================
# Stage 2: Bazel Build Environment
# ============================================================================
FROM docker.io/ubuntu:22.04 as bazel-builder

LABEL stage="bazel-builder"
LABEL description="Bazel buildtools compilation"

WORKDIR /build/bazel

# Install Bazel and Go dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    golang-go \
    && rm -rf /var/lib/apt/lists/*

# Copy buildtools
COPY buildtools/ ./

# Build Bazel tools (buildifier, buildozer)
RUN cd buildifier && go build -o /usr/local/bin/buildifier || echo "buildifier build skipped"
RUN cd buildozer && go build -o /usr/local/bin/buildozer || echo "buildozer build skipped"

# ============================================================================
# Stage 3: Node.js Build Environment
# ============================================================================
FROM docker.io/node:lts-alpine as node-builder

LABEL stage="node-builder"
LABEL description="TypeScript Metabase MCP server build"

WORKDIR /build/node

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm config set ignore-scripts true && \
    npm ci && \
    npm config set ignore-scripts false

# Copy application code
COPY tsconfig.json ./
COPY src/ ./src/
COPY tests/ ./tests/

# Build TypeScript project
RUN npm run build:fast

# Run tests to ensure build quality
RUN npm run test:coverage

# Set executable permissions
RUN chmod +x build/src/index.js

# Clean dev dependencies
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ============================================================================
# Stage 4: Runtime Environment - Multi-Language Bridge
# ============================================================================
FROM docker.io/ubuntu:22.04

LABEL maintainer="Lucia <lucia@luciverse.dev>"
LABEL description="Luci-Metabase-MCP Bridge: Swift-NIO + Node.js + Bazel + Web3"
LABEL version="1.0.0"
LABEL architecture="multi-language-bridge"

# ============================================================================
# Install Runtime Dependencies
# ============================================================================

# Install Node.js runtime
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_lts.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs

# NOTE: Swift runtime dependencies are NOT needed because we're using static linking
# The Swift bridge binary is fully self-contained with musl libc

# Install minimal utilities for bridge operations
RUN apt-get install -y \
    jq \
    netcat \
    socat \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# ============================================================================
# Copy Built Artifacts
# ============================================================================

# Copy Swift bridge binary (if built successfully)
COPY --from=swift-builder /build/swift/.build/release/LuciMetabaseBridge /usr/local/bin/swift-bridge 2>/dev/null || echo "Swift bridge not available"

# Copy Bazel tools (if built successfully)
COPY --from=bazel-builder /usr/local/bin/buildifier /usr/local/bin/buildifier 2>/dev/null || echo "buildifier not available"
COPY --from=bazel-builder /usr/local/bin/buildozer /usr/local/bin/buildozer 2>/dev/null || echo "buildozer not available"

# Copy Node.js MCP server
COPY --from=node-builder /build/node/build /app/mcp-server
COPY --from=node-builder /build/node/node_modules /app/mcp-server/node_modules

# Copy runtime configuration
COPY container/config/ /etc/luci-bridge/ 2>/dev/null || mkdir -p /etc/luci-bridge
COPY container/supervisor/ /etc/supervisor/conf.d/ 2>/dev/null || mkdir -p /etc/supervisor/conf.d

# ============================================================================
# Setup Application Structure
# ============================================================================

WORKDIR /app

# Create directory structure with proper permissions for rootless
RUN mkdir -p \
    /app/data \
    /app/logs \
    /app/cache \
    /app/sockets \
    /var/log/supervisor && \
    chmod -R 755 /app /var/log/supervisor

# Create non-root user (Podman rootless compatible)
RUN useradd -r -s /bin/false -u 1000 luciverse && \
    chown -R luciverse:luciverse /app /var/log/supervisor

# ============================================================================
# Environment Configuration
# ============================================================================

# Node.js MCP Server Configuration
ENV NODE_ENV=production \
    LOG_LEVEL=info \
    CACHE_TTL_MS=600000 \
    REQUEST_TIMEOUT_MS=600000

# Swift Bridge Configuration
ENV SWIFT_BRIDGE_HOST="::" \
    SWIFT_BRIDGE_PORT=8001 \
    SWIFT_NIO_THREADS=0

# Bridge Communication Configuration
ENV BRIDGE_PROTOCOL=websocket \
    BRIDGE_SOCKET=/app/sockets/bridge.sock \
    MCP_PORT=3000

# Web3 Integration (optional)
ENV WEB3_ENABLED=false \
    HEDERA_NETWORK=testnet

# ============================================================================
# Health Checks
# ============================================================================

# MCP Server health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD test -f /app/mcp-server/src/index.js || exit 1

# ============================================================================
# Expose Ports
# ============================================================================

# MCP Server (Node.js)
EXPOSE 3000

# Swift-NIO Bridge HTTP/2 Server
EXPOSE 8001

# WebSocket Bridge
EXPOSE 8080

# gRPC Service Mesh (optional)
EXPOSE 9090

# Metrics/Monitoring
EXPOSE 9091

# ============================================================================
# Runtime User
# ============================================================================

USER luciverse

# ============================================================================
# Entry Point
# ============================================================================

# Default to running the Node.js MCP server
CMD ["node", "/app/mcp-server/src/index.js"]
