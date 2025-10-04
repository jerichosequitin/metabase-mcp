# Luci-Metabase-MCP Containerized Runtime

This document describes the containerized runtime architecture for the Luci-Metabase-MCP project, implementing the patterns from [BRIDGING-ARCHITECTURE.md](https://github.com/lucia/ubuntu-lucitop/BRIDGING-ARCHITECTURE.md).

## Architecture Overview

The containerized runtime bridges multiple ecosystems:

```
┌────────────────────────────────────────────────────────────────┐
│              Luci-Metabase-MCP Bridge Runtime                  │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Node.js MCP Server (TypeScript)                         │  │
│  │  • Metabase API integration                              │  │
│  │  • Model Context Protocol server                         │  │
│  │  • Optimized response caching                            │  │
│  └──────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Swift-NIO Bridge Layer (Swift)                          │  │
│  │  • High-performance HTTP/2 server                        │  │
│  │  • WebSocket bridge protocol                             │  │
│  │  • Cross-language communication                          │  │
│  └──────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Bazel Build Tools (Go)                                  │  │
│  │  • buildifier - Format BUILD files                       │  │
│  │  • buildozer - Manipulate BUILD files                    │  │
│  └──────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Optional Integrations                                   │  │
│  │  • Runme - Interactive documentation                     │  │
│  │  • Hedera Guardian - Web3/blockchain integration         │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

## Container Technology

This project uses **Podman** as the primary container runtime:

- **Rootless by default**: Enhanced security without requiring root privileges
- **Daemonless**: No background daemon required
- **Docker-compatible**: Compatible with Docker commands and Dockerfiles
- **OCI compliant**: Uses standard OCI container images

The container configuration file is named `Containerfile` (Podman convention) but is fully compatible with Docker.

## Quick Start

### Prerequisites

Install Podman (or Docker as fallback):

**macOS:**
```bash
brew install podman podman-compose
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install podman podman-compose

# Fedora/RHEL
sudo dnf install podman podman-compose
```

### Installation

1. **Clone and setup:**
   ```bash
   cd /Users/lucia/Documents/GitHub/luci-metabase-mcp
   make install
   ```

2. **Configure environment:**
   ```bash
   # Edit .env with your Metabase credentials
   nano .env
   ```

3. **Build container:**
   ```bash
   make build
   ```

4. **Run server:**
   ```bash
   make run
   ```

## Usage

### Common Commands

```bash
# Build the container
make build

# Run standalone MCP server
make run

# Run with full bridge stack (Swift + Node.js)
make run-swift

# Run with compose orchestration
make run-compose

# Development mode (with hot-reload)
make run-dev

# View logs
make logs

# Open shell in container
make shell

# Stop containers
make stop

# Clean up
make clean
```

### Using Podman Directly

```bash
# Build
podman build -t luci-metabase-mcp-bridge:latest -f Containerfile .

# Run standalone
podman run --rm -it \
  --env-file .env \
  -p 3000:3000 \
  luci-metabase-mcp-bridge:latest

# Run with compose
podman-compose up -d
```

### Using Docker (fallback)

```bash
# Build
docker build -t luci-metabase-mcp-bridge:latest -f Containerfile .

# Run
docker run --rm -it \
  --env-file .env \
  -p 3000:3000 \
  luci-metabase-mcp-bridge:latest
```

## Configuration

### Environment Variables

Configure via `.env` file (created from `.env.container` template):

**Metabase Connection:**
```bash
METABASE_URL=https://metabase.example.com
METABASE_API_KEY=your_api_key
```

**Server Settings:**
```bash
NODE_ENV=production
LOG_LEVEL=info
CACHE_TTL_MS=600000
```

**Bridge Settings:**
```bash
SWIFT_BRIDGE_PORT=8001
BRIDGE_PROTOCOL=websocket
```

**Web3/Hedera (Optional):**
```bash
WEB3_ENABLED=true
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.xxxxx
```

### Compose Profiles

Run different service combinations:

```bash
# Node.js MCP server only (default)
podman-compose up -d

# With Swift bridge
podman-compose --profile swift up -d

# With Runme
podman-compose --profile runme up -d

# With Hedera Guardian
podman-compose --profile hedera up -d

# Full stack (all services)
podman-compose --profile full up -d
```

## Swift Bridge Components

### Local Development

Setup Swift bridge for local development:

```bash
make swift-setup
make swift-build
make swift-test
```

### Swift Bridge Features

The Swift-NIO bridge provides:

- **HTTP/2 Server**: High-performance protocol support
- **WebSocket Bridge**: Bidirectional communication
- **Health Checks**: `/health` and `/bridge/status` endpoints
- **Request Proxying**: Forward requests to Node.js MCP server

### Running Swift Bridge

```bash
# Inside container
cd swift-bridge
swift run LuciMetabaseBridge --help

# With options
swift run LuciMetabaseBridge \
  --host :: \
  --port 8001 \
  --mcp-server-url http://localhost:3000 \
  --enable-websocket
```

## Build System Integration

### Bazel Tools

The container includes Bazel buildtools:

- **buildifier**: Format Bazel BUILD files
- **buildozer**: Manipulate BUILD files programmatically

Access inside container:
```bash
buildifier --version
buildozer --help
```

### Multi-Stage Build

The `Containerfile` uses multi-stage builds:

1. **swift-builder**: Compiles Swift bridge components
2. **bazel-builder**: Builds Bazel tools
3. **node-builder**: Compiles TypeScript MCP server
4. **Final stage**: Combines all artifacts in runtime image

## Networking

### Exposed Ports

- `3000`: Node.js MCP server (primary)
- `8001`: Swift-NIO HTTP/2 server
- `8080`: WebSocket bridge
- `9090`: gRPC service mesh (optional)
- `9091`: Metrics/monitoring

### Network Architecture

```
Client
  ↓
  ├─→ Port 3000 → Node.js MCP Server → Metabase API
  ├─→ Port 8001 → Swift Bridge → Node.js MCP Server
  ├─→ Port 8080 → WebSocket Bridge → Node.js MCP Server
  └─→ Port 9091 → Metrics/Monitoring
```

## Data Persistence

### Volumes

Persistent data stored in volumes:

- `mcp-data`: Application data
- `mcp-logs`: Server logs
- `mcp-cache`: Response caching
- `swift-data`: Swift bridge data

### Local Development

Mount local directories:

```bash
podman run --rm -it \
  -v $(pwd)/src:/app/mcp-server/src:ro \
  -v $(pwd)/data:/app/data:rw \
  -v $(pwd)/logs:/app/logs:rw \
  luci-metabase-mcp-bridge:latest
```

## Security

### Rootless Operation

Podman runs rootless by default:

```bash
# Check rootless mode
podman info | grep rootless

# Run explicitly rootless
podman run --userns=keep-id ...
```

### Security Features

- Non-root user (`luciverse:1000`)
- Minimal attack surface (multi-stage builds)
- No unnecessary privileges
- Security labels disabled for compatibility
- Health checks for service monitoring

## Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
podman logs luci-mcp-bridge

# Inspect container
podman inspect luci-mcp-bridge
```

**Port conflicts:**
```bash
# Check what's using the port
lsof -i :3000

# Use different ports
podman run -p 3001:3000 ...
```

**Permission issues:**
```bash
# Ensure rootless mode
podman run --userns=keep-id ...
```

**Build failures:**
```bash
# Clean build
make clean-all
make build
```

## Development Workflow

### Typical Development Cycle

1. **Make code changes** in `src/`
2. **Run tests**: `npm test`
3. **Build container**: `make build`
4. **Test in container**: `make run-dev`
5. **View logs**: `make logs`
6. **Iterate**

### Hot Reload Development

```bash
# Run with source mounted
make run-dev

# Or manually:
podman run --rm -it \
  -v $(pwd)/src:/app/mcp-server/src:ro \
  -e NODE_ENV=development \
  luci-metabase-mcp-bridge:latest
```

## Integration Points

### Runme Integration

The `luci-runme/` directory contains Runme integration for interactive documentation.

```bash
# Enable Runme service
podman-compose --profile runme up -d
```

### Web3/Hedera Integration

Optional Web3 capabilities via Hedera Guardian:

```bash
# Enable Web3 services
export WEB3_ENABLED=true
podman-compose --profile hedera up -d
```

### Buildtools Integration

Bazel tools from `buildtools/` directory are available in container:

```bash
# Access in running container
podman exec -it luci-mcp-bridge buildifier --version
```

## Performance

### Resource Limits

Configure in `podman-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
    reservations:
      cpus: '0.5'
      memory: 512M
```

### Optimization Tips

- Use `--cpus` and `--memory` flags for resource limits
- Enable caching with proper `CACHE_TTL_MS`
- Use Swift bridge for high-performance scenarios
- Monitor with metrics endpoint (port 9091)

## References

- [BRIDGING-ARCHITECTURE.md](/Users/lucia/Downloads/ubuntu-lucitop/BRIDGING-ARCHITECTURE.md)
- [Podman Documentation](https://docs.podman.io/)
- [Swift-NIO Documentation](https://github.com/apple/swift-nio)
- [Bazel Buildtools](https://github.com/bazelbuild/buildtools)
- [Runme Documentation](https://docs.runme.dev/)
