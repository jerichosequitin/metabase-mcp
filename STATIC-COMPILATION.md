# Static Compilation Guide

This guide explains how to build fully static Linux binaries for the Luci-Metabase-MCP Swift bridge using the Swift Static Linux SDK and container plugin.

## Overview

The Luci-Metabase-MCP project supports building **fully statically linked** executables with no external runtime dependencies. This is achieved using:

- **Swift 6.0+** with static linking support
- **Swift Static Linux SDK** (musl libc-based)
- **Swift Container Plugin** for streamlined container builds
- **Multi-stage Containerfile** optimized for static binaries

## Benefits of Static Linking

### ✅ Advantages

- **Zero runtime dependencies** - No need for Swift runtime libraries on target system
- **Portable across Linux distributions** - Works on any Linux with minimal kernel requirements
- **Smaller runtime footprint** - Only includes code that's actually used
- **No library version conflicts** - All dependencies embedded at compile time
- **Simplified deployment** - Single binary is all you need

### ⚠️ Trade-offs

- **Larger binary size** - Includes all dependencies inline (~20-50MB typical)
- **Longer build times** - Cross-compilation and static linking take more time
- **Cannot share code** - Each binary includes its own copy of libraries

## Prerequisites

### Required Tools

1. **Swift 6.0 or later**
   - Earlier versions do not support the Static Linux SDK
   - Install via [Swiftly](https://www.swift.org/install/) (recommended)

2. **Swiftly** (Swift toolchain manager)
   - Simplifies Swift installation and SDK management
   - [Installation guide](https://www.swift.org/blog/introducing-swiftly_10/)

3. **Swift Static Linux SDK**
   - Required for musl-based static linking
   - Automatically installed by setup script

4. **Container runtime** (for containerized builds)
   - Podman (recommended) or Docker

### Quick Setup

Run the automated setup script:

```bash
./scripts/setup-toolchain.sh
```

This will:
- Install or verify Swiftly installation
- Install Swift 6.0+ if needed
- Install Swift Static Linux SDK
- Check Node.js and container runtime
- Configure PATH and environment

## Building Static Binaries

### Method 1: Using Make (Recommended)

```bash
# Build static binary for x86_64 Linux
make swift-build-static

# Build static binary for ARM64 Linux
make swift-build-static-arm64

# Build for all architectures
make swift-build-static-all
```

Built binaries will be in `build/swift/`:
- `luci-metabase-bridge-x86_64`
- `luci-metabase-bridge-aarch64`

### Method 2: Using Build Script Directly

```bash
# Build for x86_64
./scripts/build-static-swift.sh x86_64 release

# Build for ARM64
./scripts/build-static-swift.sh aarch64 release

# Debug build
./scripts/build-static-swift.sh x86_64 debug
```

### Method 3: Using Swift Container Plugin

The project includes Swift Container Plugin for integrated containerization:

```bash
cd swift-bridge

# Build container image with static binary
swift package build-container-image \
    --swift-sdk x86_64-swift-linux-musl \
    --repository registry.example.com/luci-metabase-bridge
```

This automatically:
1. Cross-compiles for Linux with static linking
2. Creates an optimized container image
3. Pushes to your container registry

### Method 4: Manual Compilation

```bash
cd swift-bridge

# Resolve dependencies for static SDK
swift package resolve --swift-sdk x86_64-swift-linux-musl

# Build with static linking
swift build -c release \
    --swift-sdk x86_64-swift-linux-musl \
    --static-swift-stdlib \
    -Xswiftc -static-executable \
    -Xswiftc -O \
    -Xlinker -s

# Binary location
ls -lh .build/release/LuciMetabaseBridge
```

## Container Builds

### Building the Container

The multi-stage `Containerfile` is optimized for static linking:

```bash
# Build entire container image
make build

# Build only Swift stage
make build-swift

# Using Podman directly
podman build -t luci-metabase-mcp-bridge:latest .

# Using Docker
docker build -t luci-metabase-mcp-bridge:latest .
```

### Container Architecture

The Containerfile uses a three-stage build:

1. **Swift Builder Stage** (`swift:6.0-jammy`)
   - Installs Swift Static Linux SDK
   - Builds fully static executable with musl libc
   - No runtime dependencies needed

2. **Node.js Builder Stage** (`node:lts-alpine`)
   - Builds TypeScript MCP server
   - Runs tests
   - Optimizes production bundle

3. **Runtime Stage** (`ubuntu:22.04`)
   - **No Swift runtime libraries needed** (static linking!)
   - Only includes Node.js for MCP server
   - Minimal utilities (jq, netcat, socat, supervisor)
   - Rootless-ready with non-privileged user

### Key Optimizations

```dockerfile
# Static linking with musl libc
RUN swift build -c release \
    --static-swift-stdlib \
    -Xswiftc -static-executable \
    -Xswiftc -O \
    -Xlinker -s

# Runtime stage doesn't need Swift libraries!
# Binary is fully self-contained
```

## Verification

### Check Static Linking

After building, verify the binary is truly static:

```bash
# On Linux, should show "not a dynamic executable"
ldd build/swift/luci-metabase-bridge-x86_64

# Check file type
file build/swift/luci-metabase-bridge-x86_64
# Should show: statically linked, stripped

# Check size
du -h build/swift/luci-metabase-bridge-x86_64
```

### Test the Binary

```bash
# Show help
./build/swift/luci-metabase-bridge-x86_64 --help

# Run the server
./build/swift/luci-metabase-bridge-x86_64 \
    --host 0.0.0.0 \
    --port 8001 \
    --mcp-server-url http://localhost:3000 \
    --log-level info
```

### Test in Container

```bash
# Run container
make run

# Check logs
make logs

# Shell into container
make shell

# Inside container, verify static binary
ldd /usr/local/bin/swift-bridge
```

## Troubleshooting

### SDK Installation Issues

If SDK installation fails:

```bash
# List available SDKs
swift sdk list

# Install manually
curl -L https://download.swift.org/swift-6.0-release/static-sdk/swift-6.0-RELEASE/swift-6.0-RELEASE_static-linux-0.0.1.artifactbundle.tar.gz -o /tmp/sdk.tar.gz
swift sdk install /tmp/sdk.tar.gz
rm /tmp/sdk.tar.gz
```

### Build Failures

If build fails with "cannot find module":

```bash
# Clean and rebuild
cd swift-bridge
swift package clean
swift package resolve --swift-sdk x86_64-swift-linux-musl
swift build -c release --swift-sdk x86_64-swift-linux-musl
```

### Cross-Platform Issues

Building on macOS for Linux:

```bash
# Ensure you're using Swift.org toolchain, not Xcode
which swift
# Should be: /usr/local/bin/swift or ~/.swiftly/toolchains/*/bin/swift

# NOT Xcode's Swift: /usr/bin/swift (won't work with Static SDK)
```

### Container Build Issues

If container build fails:

```bash
# Check container runtime
podman --version  # or docker --version

# Build with verbose output
podman build --log-level=debug -t luci-metabase-mcp-bridge:latest .

# Build specific stage
podman build --target swift-builder -t test:swift .
```

## Architecture Support

### Supported Architectures

- ✅ **x86_64** (amd64) - Primary target
- ✅ **aarch64** (arm64) - Full support
- ⚠️ **armv7** - Not officially supported by Swift Static SDK

### Multi-Arch Builds

Build for multiple architectures:

```bash
# Build all architectures
make swift-build-static-all

# Or use container multi-platform build
podman buildx build \
    --platform linux/amd64,linux/arm64 \
    -t registry.example.com/luci-metabase-bridge:latest \
    --push .
```

## Performance Considerations

### Binary Size

Typical binary sizes with static linking:

- **Debug build**: 50-100 MB (includes debug symbols)
- **Release build**: 20-40 MB (optimized, stripped)
- **Release + LTO**: 15-30 MB (Link-Time Optimization)

### Optimization Flags

The build uses aggressive optimization:

```swift
-Xswiftc -O              # Optimize for speed
-Xlinker -s              # Strip debug symbols
```

For maximum optimization:

```bash
swift build -c release \
    --swift-sdk x86_64-swift-linux-musl \
    --static-swift-stdlib \
    -Xswiftc -static-executable \
    -Xswiftc -O \
    -Xswiftc -whole-module-optimization \
    -Xlinker -s
```

### Runtime Performance

Static linking has **no runtime performance penalty**. In fact, it may be slightly faster due to:
- Better locality of reference (all code in one binary)
- No dynamic linking overhead
- Potential for link-time optimizations

## Deployment

### Standalone Binary

Simply copy the binary to your target system:

```bash
# Copy to server
scp build/swift/luci-metabase-bridge-x86_64 user@server:/usr/local/bin/

# Run directly
ssh user@server '/usr/local/bin/luci-metabase-bridge-x86_64 --help'
```

### Container Deployment

```bash
# Run with Podman
make run

# Run with Docker
docker run -d \
    -p 3000:3000 \
    -p 8001:8001 \
    --name luci-mcp-bridge \
    luci-metabase-mcp-bridge:latest

# Deploy with Kubernetes
kubectl apply -f k8s/deployment.yaml
```

### Systemd Service

Create `/etc/systemd/system/luci-metabase-bridge.service`:

```ini
[Unit]
Description=Luci Metabase MCP Bridge
After=network.target

[Service]
Type=simple
User=luciverse
ExecStart=/usr/local/bin/luci-metabase-bridge-x86_64 \
    --host :: \
    --port 8001 \
    --mcp-server-url http://localhost:3000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable luci-metabase-bridge
sudo systemctl start luci-metabase-bridge
```

## References

### Official Documentation

- [Swift Static Linux SDK](https://www.swift.org/documentation/articles/static-linux-getting-started.html)
- [Swift Container Plugin](https://github.com/apple/swift-container-plugin)
- [Swiftly Toolchain Manager](https://www.swift.org/blog/introducing-swiftly_10/)
- [Swift on Linux](https://www.swift.org/install/linux/)

### Related Files

- [Package.swift](swift-bridge/Package.swift) - Swift package configuration
- [Containerfile](Containerfile) - Multi-stage container build
- [Makefile](Makefile) - Build automation
- [build-static-swift.sh](scripts/build-static-swift.sh) - Build script
- [setup-toolchain.sh](scripts/setup-toolchain.sh) - Toolchain setup

## Contributing

When modifying the build configuration:

1. **Test all architectures**: Ensure builds work on x86_64 and aarch64
2. **Verify static linking**: Check with `ldd` that binaries are truly static
3. **Update documentation**: Keep this guide in sync with changes
4. **Test in containers**: Verify container builds still work

## License

This project uses the MIT License. See [LICENSE](LICENSE) for details.
