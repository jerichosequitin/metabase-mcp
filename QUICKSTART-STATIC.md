# Quick Start: Static Linux Build

Get up and running with static Linux binaries in under 5 minutes.

## Prerequisites

- macOS or Linux
- 10GB free disk space
- Internet connection

## One-Command Setup

```bash
# Clone and setup
git clone https://github.com/your-org/luci-metabase-mcp.git
cd luci-metabase-mcp
./scripts/setup-toolchain.sh
```

This installs:
- ✅ Swiftly (Swift toolchain manager)
- ✅ Swift 6.0+
- ✅ Swift Static Linux SDK
- ✅ Verifies Node.js and container runtime

## Build Static Binary

### Option 1: Quick Build (Recommended)

```bash
make swift-build-static
```

Binary location: `build/swift/luci-metabase-bridge-x86_64`

### Option 2: All Architectures

```bash
make swift-build-static-all
```

Builds for:
- `build/swift/luci-metabase-bridge-x86_64`
- `build/swift/luci-metabase-bridge-aarch64`

### Option 3: Container Build

```bash
make build
```

Creates fully self-contained container image with static binary.

## Test the Binary

```bash
# Show help
./build/swift/luci-metabase-bridge-x86_64 --help

# Start server
./build/swift/luci-metabase-bridge-x86_64 \
    --host 0.0.0.0 \
    --port 8001 \
    --mcp-server-url http://localhost:3000
```

## Verify Static Linking

```bash
# Check if truly static (Linux only)
ldd build/swift/luci-metabase-bridge-x86_64
# Should show: "not a dynamic executable"

# Check binary info
file build/swift/luci-metabase-bridge-x86_64
# Should show: "statically linked"

# Check size
du -h build/swift/luci-metabase-bridge-x86_64
# Typical: 20-40 MB
```

## Troubleshooting

### "Swift SDK not found"

```bash
# Install manually
swift sdk install \
    https://download.swift.org/swift-6.0-release/static-sdk/swift-6.0-RELEASE/swift-6.0-RELEASE_static-linux-0.0.1.artifactbundle.tar.gz
```

### "Command not found: swift"

```bash
# Install Swiftly first
curl -L https://swift.org/swiftly/install.sh | bash
source ~/.local/share/swiftly/env.sh

# Then install Swift
swiftly install latest
swiftly use latest
```

### Build Fails on macOS

Ensure you're using Swift.org toolchain, not Xcode:

```bash
# Check current Swift
which swift
# Should NOT be /usr/bin/swift (that's Xcode)

# Use Swiftly-managed Swift
swiftly use latest
```

### Verify Environment

```bash
make verify-deps
```

Shows all dependencies and their status.

## Next Steps

- **Deploy**: Copy binary to any Linux system and run
- **Container**: Use `make build` for containerized deployment
- **Docs**: See [STATIC-COMPILATION.md](STATIC-COMPILATION.md) for details
- **Architecture**: See [CONTAINER-RUNTIME.md](CONTAINER-RUNTIME.md) for runtime info

## Key Benefits

✅ **Zero dependencies** - Runs on any Linux with minimal kernel
✅ **Single binary** - No libraries or runtime needed
✅ **Portable** - Works across all Linux distributions
✅ **Fast** - No dynamic linking overhead
✅ **Secure** - No external dependencies to update

## Support

- Issues: https://github.com/your-org/luci-metabase-mcp/issues
- Docs: [README.md](README.md)
- Static Build Guide: [STATIC-COMPILATION.md](STATIC-COMPILATION.md)
