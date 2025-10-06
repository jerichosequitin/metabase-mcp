# Swift SDK Generator Reference

Complete knowledge base for the Swift SDK Generator - automated cross-compilation SDK creation.

## Overview

### What is Swift SDK Generator?

The Swift SDK Generator automates creating cross-compilation SDKs for Swift, making it easier to build Swift packages across different platforms.

**Key Features:**
- Automated SDK generation for Linux and FreeBSD
- Cross-compilation support from macOS, Linux, FreeBSD
- Docker/Podman container integration
- Customizable with extra libraries
- Distributable SDK bundles

**Repository**: https://github.com/swiftlang/swift-sdk-generator

**Requirements**:
- Swift 5.9 or later
- Docker or Podman (for container-based generation)

## Platform Support

### Host Platforms (Build From)

✅ **macOS** 13.0+
✅ **FreeBSD** 14.3+
✅ **Ubuntu** 20.04, 22.04, 24.04

### Target Platforms (Build For)

✅ **Linux Distributions:**
- Ubuntu 18.04, 20.04, 22.04, 24.04
- Debian 10, 11, 12
- Amazon Linux 2, 2023
- RHEL 8, 9
- Fedora 39, 40

✅ **FreeBSD**:
- FreeBSD 13, 14

### Supported Architectures

- x86_64 (amd64)
- aarch64 (arm64)
- armv7

## Installation

### Using Swift Package Manager

```bash
# Clone repository
git clone https://github.com/swiftlang/swift-sdk-generator.git
cd swift-sdk-generator

# Build the generator
swift build -c release

# Alias for easier usage
alias swift-sdk-generator=".build/release/swift-sdk-generator"
```

### Installing as Swift SDK Plugin

```bash
# Install as system-wide SDK generator
swift build -c release
sudo cp .build/release/swift-sdk-generator /usr/local/bin/
```

## Basic Usage

### Generate Linux SDK

```bash
# Generate Ubuntu 22.04 SDK for x86_64
swift run swift-sdk-generator make-linux-sdk \
    --distribution-name ubuntu \
    --distribution-version 22.04 \
    --target-arch x86_64

# Generate with Docker
swift run swift-sdk-generator make-linux-sdk \
    --with-docker \
    --distribution-name ubuntu \
    --distribution-version 22.04
```

### Generate FreeBSD SDK

```bash
# Generate FreeBSD 14 SDK
swift run swift-sdk-generator make-freebsd-sdk \
    --target-arch amd64 \
    --version 14.0
```

### Use Generated SDK

```bash
# List available SDKs
swift sdk list

# Build project with SDK
swift build --swift-sdk <generated_sdk_id>

# Example with specific SDK
swift build --swift-sdk x86_64-unknown-linux-gnu_ubuntu22.04
```

## Command Reference

### `make-linux-sdk`

Generate a Linux cross-compilation SDK.

```bash
swift-sdk-generator make-linux-sdk [OPTIONS]
```

**Required Options:**
- `--distribution-name <name>` - Linux distribution (ubuntu, debian, rhel, etc.)
- `--distribution-version <version>` - Distribution version

**Optional Options:**
- `--target-arch <arch>` - Target architecture (x86_64, aarch64, armv7)
  - Default: Same as host
- `--with-docker` - Build SDK from Docker container
- `--container-image <image>` - Custom Docker image
- `--host-toolchain <path>` - Include host Swift toolchain
- `--swift-version <version>` - Swift version to use
- `--include-package <url>` - Include additional Swift package
- `--extra-library <name>` - Include extra system library
- `--output-path <path>` - Output directory for SDK
- `--skip-signature-validation` - Skip package signature checks

**Examples:**

```bash
# Basic Ubuntu 22.04 SDK
swift-sdk-generator make-linux-sdk \
    --distribution-name ubuntu \
    --distribution-version 22.04

# ARM64 Debian with Docker
swift-sdk-generator make-linux-sdk \
    --with-docker \
    --distribution-name debian \
    --distribution-version 12 \
    --target-arch aarch64

# Custom image with extra libraries
swift-sdk-generator make-linux-sdk \
    --container-image custom/ubuntu:22.04 \
    --extra-library libssl-dev \
    --extra-library libcurl4-openssl-dev \
    --output-path ./sdks
```

### `make-freebsd-sdk`

Generate a FreeBSD cross-compilation SDK.

```bash
swift-sdk-generator make-freebsd-sdk [OPTIONS]
```

**Required Options:**
- `--version <version>` - FreeBSD version (13.0, 14.0, etc.)

**Optional Options:**
- `--target-arch <arch>` - Target architecture (amd64, arm64)
- `--output-path <path>` - Output directory

**Example:**

```bash
swift-sdk-generator make-freebsd-sdk \
    --version 14.0 \
    --target-arch amd64 \
    --output-path ./freebsd-sdks
```

### `bundle`

Create distributable SDK archive.

```bash
swift-sdk-generator bundle \
    --sdk-id <id> \
    --output <path>
```

**Example:**

```bash
swift-sdk-generator bundle \
    --sdk-id x86_64-unknown-linux-gnu_ubuntu22.04 \
    --output ubuntu-22.04-sdk.tar.gz
```

## Configuration

### Configuration File

Create `.swift-sdk-generator.json` in project root:

```json
{
  "linux": {
    "default-distribution": "ubuntu",
    "default-version": "22.04",
    "docker-enabled": true,
    "extra-libraries": [
      "libssl-dev",
      "libcurl4-openssl-dev",
      "zlib1g-dev"
    ]
  },
  "swift": {
    "version": "6.0.0",
    "static-stdlib": true
  },
  "output": {
    "path": "./sdks",
    "bundle-format": "tar.gz"
  }
}
```

### Environment Variables

```bash
# Container runtime
export SWIFT_SDK_GENERATOR_CONTAINER_RUNTIME=podman  # or docker

# Swift version
export SWIFT_SDK_GENERATOR_SWIFT_VERSION=6.0.0

# Output directory
export SWIFT_SDK_GENERATOR_OUTPUT_PATH=./generated-sdks

# Enable verbose output
export SWIFT_SDK_GENERATOR_VERBOSE=1
```

## Advanced Usage

### Including Extra Libraries

```bash
# Generate SDK with OpenSSL, cURL, and PostgreSQL
swift-sdk-generator make-linux-sdk \
    --distribution-name ubuntu \
    --distribution-version 22.04 \
    --extra-library libssl-dev \
    --extra-library libcurl4-openssl-dev \
    --extra-library libpq-dev \
    --extra-library zlib1g-dev
```

### Custom Container Images

```bash
# Use custom base image with pre-installed dependencies
swift-sdk-generator make-linux-sdk \
    --container-image myregistry.com/custom-ubuntu:22.04 \
    --distribution-name ubuntu \
    --distribution-version 22.04
```

### Multi-Architecture SDKs

```bash
# Generate SDKs for multiple architectures
for arch in x86_64 aarch64; do
    swift-sdk-generator make-linux-sdk \
        --with-docker \
        --distribution-name ubuntu \
        --distribution-version 22.04 \
        --target-arch $arch \
        --output-path ./sdks/$arch
done
```

### Including Swift Packages

```bash
# Include specific Swift packages in SDK
swift-sdk-generator make-linux-sdk \
    --distribution-name ubuntu \
    --distribution-version 22.04 \
    --include-package https://github.com/apple/swift-nio.git \
    --include-package https://github.com/apple/swift-crypto.git
```

## Integration with Swift Package Manager

### Package.swift Configuration

Use generated SDKs in your Package.swift:

```swift
// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "MyApp",
    platforms: [
        .macOS(.v13),
        .linux
    ],
    products: [
        .executable(name: "myapp", targets: ["MyApp"])
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "MyApp",
            dependencies: []
        )
    ]
)
```

### Building with SDK

```bash
# List available SDKs
swift sdk list

# Configure SDK for project
swift sdk configure --sdk-id x86_64-unknown-linux-gnu_ubuntu22.04

# Build with SDK
swift build --swift-sdk x86_64-unknown-linux-gnu_ubuntu22.04

# Build release with static linking
swift build -c release \
    --swift-sdk x86_64-unknown-linux-gnu_ubuntu22.04 \
    --static-swift-stdlib
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Cross-Compile

on: [push]

jobs:
  build-linux:
    runs-on: macos-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Swift SDK Generator
        run: |
          git clone https://github.com/swiftlang/swift-sdk-generator.git
          cd swift-sdk-generator
          swift build -c release
          echo "$(pwd)/.build/release" >> $GITHUB_PATH

      - name: Generate Linux SDK
        run: |
          swift-sdk-generator make-linux-sdk \
            --with-docker \
            --distribution-name ubuntu \
            --distribution-version 22.04

      - name: Build for Linux
        run: |
          swift build --swift-sdk x86_64-unknown-linux-gnu_ubuntu22.04

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: linux-binary
          path: .build/x86_64-unknown-linux-gnu_ubuntu22.04/release/
```

### GitLab CI

```yaml
build:linux:
  image: swift:6.0

  variables:
    SWIFT_SDK_GENERATOR_CONTAINER_RUNTIME: docker

  before_script:
    - git clone https://github.com/swiftlang/swift-sdk-generator.git
    - cd swift-sdk-generator && swift build -c release
    - export PATH="$(pwd)/.build/release:$PATH"
    - cd ..

  script:
    - swift-sdk-generator make-linux-sdk \
        --with-docker \
        --distribution-name ubuntu \
        --distribution-version 22.04
    - swift build --swift-sdk x86_64-unknown-linux-gnu_ubuntu22.04

  artifacts:
    paths:
      - .build/x86_64-unknown-linux-gnu_ubuntu22.04/release/
```

## Troubleshooting

### Docker/Podman Issues

```bash
# Check container runtime
docker --version  # or podman --version

# Test container access
docker run --rm ubuntu:22.04 echo "Working"

# Use Podman instead of Docker
export SWIFT_SDK_GENERATOR_CONTAINER_RUNTIME=podman
```

### SDK Not Found

```bash
# List installed SDKs
swift sdk list

# Re-install SDK
swift sdk install <sdk-bundle>.tar.gz

# Check SDK directory
ls -la ~/.swiftpm/swift-sdks/
```

### Missing Libraries

```bash
# Regenerate SDK with required libraries
swift-sdk-generator make-linux-sdk \
    --distribution-name ubuntu \
    --distribution-version 22.04 \
    --extra-library <missing-lib>-dev

# Check available libraries in container
docker run ubuntu:22.04 apt-cache search <library-name>
```

### Build Failures

```bash
# Clean and rebuild
swift package clean
swift build --swift-sdk <sdk-id>

# Verbose output
swift build --swift-sdk <sdk-id> --verbose

# Check SDK configuration
swift sdk configure --show-configuration
```

## Best Practices

### SDK Management

1. **Version SDKs by target**: Use descriptive names
   ```bash
   --output-path ./sdks/ubuntu-22.04-x86_64
   ```

2. **Bundle SDKs for distribution**: Create portable archives
   ```bash
   swift-sdk-generator bundle \
       --sdk-id <id> \
       --output production-sdk.tar.gz
   ```

3. **Document required libraries**: Maintain list in README
   ```markdown
   ## Cross-Compilation Requirements
   - libssl-dev
   - libcurl4-openssl-dev
   ```

### Development Workflow

1. **Use `.swift-version`**: Pin Swift version
   ```bash
   echo "6.0.0" > .swift-version
   ```

2. **Automate SDK generation**: Script for team consistency
   ```bash
   ./scripts/generate-sdks.sh
   ```

3. **Cache SDKs in CI**: Speed up builds
   ```yaml
   - uses: actions/cache@v4
     with:
       path: ~/.swiftpm/swift-sdks
       key: swift-sdks-${{ hashFiles('**/Package.swift') }}
   ```

## Distribution Support Matrix

| Distribution | Versions | Architectures | Status |
|--------------|----------|---------------|--------|
| Ubuntu | 18.04, 20.04, 22.04, 24.04 | x86_64, aarch64 | ✅ Fully Supported |
| Debian | 10, 11, 12 | x86_64, aarch64 | ✅ Fully Supported |
| RHEL | 8, 9 | x86_64, aarch64 | ✅ Fully Supported |
| Amazon Linux | 2, 2023 | x86_64, aarch64 | ✅ Fully Supported |
| Fedora | 39, 40 | x86_64, aarch64 | ✅ Fully Supported |
| FreeBSD | 13, 14 | amd64, arm64 | ✅ Fully Supported |

## References

- **Repository**: https://github.com/swiftlang/swift-sdk-generator
- **Swift.org SDKs**: https://www.swift.org/install/linux/#cross-compilation
- **Contributing**: https://github.com/swiftlang/swift-sdk-generator/blob/main/CONTRIBUTING.md
- **Issues**: https://github.com/swiftlang/swift-sdk-generator/issues

## License

Apache-2.0 - See repository for details
