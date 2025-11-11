# Swift Container Plugin Reference

Complete reference for Swift Container Plugin 1.1.0 - Build and publish container images using Swift Package Manager.

## Overview

### What is Swift Container Plugin?

Swift Container Plugin streamlines building and publishing container images for Swift services directly from Swift Package Manager. It eliminates the need for separate Dockerfiles and build processes.

**Key Features:**
- **Integrated workflow** - Build and containerize in one command
- **Cross-compilation** - Build Linux containers from macOS
- **Automatic packaging** - Packages executables from Package.swift
- **Multi-architecture** - Supports x86_64 and ARM64
- **Registry integration** - Push directly to container registries

**Version**: 1.1.0 (Latest)
**Requirements**: Swift 6.0+
**Platforms**: macOS, Linux

## Installation

### Adding to Package.swift

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MyService",
    platforms: [
        .macOS(.v13),
        .linux
    ],
    products: [
        .executable(name: "myservice", targets: ["MyService"])
    ],
    dependencies: [
        // Add Swift Container Plugin
        .package(
            url: "https://github.com/apple/swift-container-plugin",
            from: "1.1.0"
        )
    ],
    targets: [
        .executableTarget(
            name: "MyService",
            dependencies: []
        )
    ]
)
```

### Verify Installation

```bash
# Resolve dependencies
swift package resolve

# Verify plugin is available
swift package plugin --list
# Should show: build-container-image
```

## Basic Usage

### Build Container Image

```bash
# Basic build with static SDK
swift package --swift-sdk x86_64-swift-linux-musl \
    build-container-image \
    --repository registry.example.com/myservice
```

### Specify Tag

```bash
# Build with specific tag
swift package --swift-sdk x86_64-swift-linux-musl \
    build-container-image \
    --repository registry.example.com/myservice \
    --tag v1.0.0
```

### Multiple Tags

```bash
# Build with multiple tags
swift package --swift-sdk x86_64-swift-linux-musl \
    build-container-image \
    --repository registry.example.com/myservice \
    --tag latest \
    --tag v1.0.0 \
    --tag stable
```

## Configuration

### Container Configuration File

Create `.swift-container-config.json` in project root:

```json
{
    "base-image": "alpine:3.19",
    "entrypoint": ["/app/myservice"],
    "cmd": ["--host", "0.0.0.0", "--port", "8080"],
    "expose": [8080, 9090],
    "env": {
        "LOG_LEVEL": "info",
        "ENVIRONMENT": "production"
    },
    "labels": {
        "org.opencontainers.image.title": "MyService",
        "org.opencontainers.image.version": "1.0.0",
        "org.opencontainers.image.authors": "team@example.com"
    },
    "volumes": ["/data", "/config"],
    "working-dir": "/app",
    "user": "1000:1000"
}
```

### In Package.swift (Programmatic)

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MyService",
    products: [
        .executable(name: "myservice", targets: ["MyService"])
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-container-plugin", from: "1.1.0")
    ],
    targets: [
        .executableTarget(
            name: "MyService",
            plugins: [
                .plugin(name: "ContainerImageBuilder", package: "swift-container-plugin")
            ]
        )
    ]
)
```

## Advanced Usage

### Multi-Architecture Builds

```bash
# Build for x86_64
swift package --swift-sdk x86_64-swift-linux-musl \
    build-container-image \
    --repository registry.example.com/myservice \
    --tag amd64

# Build for ARM64
swift package --swift-sdk aarch64-swift-linux-musl \
    build-container-image \
    --repository registry.example.com/myservice \
    --tag arm64

# Create multi-arch manifest
docker manifest create \
    registry.example.com/myservice:latest \
    registry.example.com/myservice:amd64 \
    registry.example.com/myservice:arm64

docker manifest push registry.example.com/myservice:latest
```

### Custom Base Images

```json
{
    "base-image": "debian:12-slim",
    "additional-packages": [
        "ca-certificates",
        "curl",
        "libssl3"
    ]
}
```

### Build Arguments

```bash
# Pass build arguments
swift package --swift-sdk x86_64-swift-linux-musl \
    build-container-image \
    --repository registry.example.com/myservice \
    --build-arg SWIFT_VERSION=6.0.0 \
    --build-arg BUILD_TYPE=release
```

### Private Registry Authentication

```bash
# Login to private registry
docker login registry.example.com

# Build and push
swift package --swift-sdk x86_64-swift-linux-musl \
    build-container-image \
    --repository registry.example.com/myservice \
    --push
```

## Container Optimization

### Static Linking for Minimal Images

```json
{
    "base-image": "scratch",
    "static-linking": true,
    "strip-symbols": true,
    "optimize": true
}
```

Result: Ultra-small images (5-20MB)

### Alpine-based Images

```json
{
    "base-image": "alpine:3.19",
    "static-linking": true,
    "runtime-deps": [
        "ca-certificates"
    ]
}
```

Result: Small, functional images (20-50MB)

### Distroless Images

```json
{
    "base-image": "gcr.io/distroless/static-debian12",
    "static-linking": true
}
```

Result: Secure, minimal images

## Security Configuration

### Non-Root User

```json
{
    "user": "appuser:appgroup",
    "create-user": true,
    "user-id": 1000,
    "group-id": 1000
}
```

### Read-Only Filesystem

```json
{
    "read-only-root": true,
    "tmpfs": [
        "/tmp",
        "/var/tmp"
    ]
}
```

### Security Labels

```json
{
    "labels": {
        "org.opencontainers.image.vendor": "Luciverse",
        "org.opencontainers.image.licenses": "Apache-2.0",
        "com.luciverse.security.level": "high",
        "com.luciverse.carbon-based": "true"
    },
    "security-opt": [
        "no-new-privileges:true"
    ]
}
```

## Integration with CI/CD

### GitHub Actions

```yaml
name: Build and Push Container

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install Swift Static SDK
        run: |
          swift sdk install \
            https://download.swift.org/swift-6.0-release/static-sdk/swift-6.0-RELEASE/swift-6.0-RELEASE_static-linux-0.0.1.artifactbundle.tar.gz

      - name: Build Container Image
        run: |
          swift package --swift-sdk x86_64-swift-linux-musl \
            build-container-image \
            --repository ghcr.io/${{ github.repository }} \
            --tag ${{ github.ref_name }} \
            --tag latest

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Push Image
        run: |
          docker push ghcr.io/${{ github.repository }}:${{ github.ref_name }}
          docker push ghcr.io/${{ github.repository }}:latest
```

### GitLab CI

```yaml
build-container:
  image: swift:6.0
  script:
    - swift sdk install <static-sdk-url>
    - swift package --swift-sdk x86_64-swift-linux-musl
        build-container-image
        --repository $CI_REGISTRY_IMAGE
        --tag $CI_COMMIT_TAG
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_TAG
```

## Deployment

### Podman

```bash
# Run container
podman run -d \
    -p 8080:8080 \
    --name myservice \
    registry.example.com/myservice:latest

# View logs
podman logs -f myservice

# Stop
podman stop myservice
```

### Docker

```bash
# Run container
docker run -d \
    -p 8080:8080 \
    --name myservice \
    --restart unless-stopped \
    registry.example.com/myservice:latest
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myservice
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myservice
  template:
    metadata:
      labels:
        app: myservice
    spec:
      containers:
      - name: myservice
        image: registry.example.com/myservice:latest
        ports:
        - containerPort: 8080
        env:
        - name: LOG_LEVEL
          value: "info"
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          readOnlyRootFilesystem: true
```

## Plugin Commands

### List Plugins

```bash
swift package plugin --list
```

### Plugin Help

```bash
swift package plugin build-container-image --help
```

### Verbose Output

```bash
swift package --swift-sdk x86_64-swift-linux-musl \
    build-container-image \
    --repository registry.example.com/myservice \
    --verbose
```

## Troubleshooting

### Plugin Not Found

```bash
# Ensure dependency is added
swift package resolve

# Clean and rebuild
swift package clean
swift package resolve
```

### SDK Not Found

```bash
# List available SDKs
swift sdk list

# Install static SDK
swift sdk install <sdk-url>
```

### Image Build Fails

```bash
# Enable verbose output
swift package --swift-sdk x86_64-swift-linux-musl \
    build-container-image \
    --repository registry.example.com/myservice \
    --verbose \
    --debug

# Check Docker/Podman
docker info
```

### Registry Authentication

```bash
# Login manually
docker login registry.example.com

# Or use credential helper
docker-credential-helper configure
```

## Best Practices

### 1. Use Static Linking

```json
{
    "static-linking": true,
    "swift-sdk": "x86_64-swift-linux-musl"
}
```

### 2. Minimal Base Images

```json
{
    "base-image": "alpine:3.19",
    "additional-packages": ["ca-certificates"]
}
```

### 3. Security Hardening

```json
{
    "user": "1000:1000",
    "read-only-root": true,
    "drop-capabilities": ["ALL"],
    "add-capabilities": ["NET_BIND_SERVICE"]
}
```

### 4. Health Checks

```json
{
    "healthcheck": {
        "test": ["CMD", "curl", "-f", "http://localhost:8080/health"],
        "interval": "30s",
        "timeout": "3s",
        "retries": 3,
        "start-period": "10s"
    }
}
```

### 5. Version Tagging

```bash
# Always tag with version
swift package --swift-sdk x86_64-swift-linux-musl \
    build-container-image \
    --repository registry.example.com/myservice \
    --tag v1.0.0 \
    --tag latest
```

## Examples

### Minimal Service

```swift
// Package.swift
let package = Package(
    name: "MinimalService",
    products: [.executable(name: "minimal", targets: ["Minimal"])],
    dependencies: [
        .package(url: "https://github.com/apple/swift-container-plugin", from: "1.1.0")
    ],
    targets: [.executableTarget(name: "Minimal")]
)
```

```json
// .swift-container-config.json
{
    "base-image": "scratch",
    "static-linking": true
}
```

### API Service

```swift
// Package.swift with Vapor
let package = Package(
    name: "APIService",
    products: [.executable(name: "api", targets: ["API"])],
    dependencies: [
        .package(url: "https://github.com/apple/swift-container-plugin", from: "1.1.0"),
        .package(url: "https://github.com/vapor/vapor", from: "4.99.0")
    ],
    targets: [
        .executableTarget(name: "API", dependencies: [
            .product(name: "Vapor", package: "vapor")
        ])
    ]
)
```

```json
{
    "base-image": "alpine:3.19",
    "expose": [8080],
    "env": {
        "PORT": "8080"
    },
    "healthcheck": {
        "test": ["CMD", "wget", "-q", "--spider", "http://localhost:8080/health"]
    }
}
```

## References

- **GitHub**: https://github.com/apple/swift-container-plugin
- **Documentation**: https://swiftpackageindex.com/apple/swift-container-plugin
- **FOSDEM 2025 Talk**: Building Container Images with Swift Container Plugin
- **Swift.org**: https://www.swift.org/get-started/cloud-services/

## License

Apache-2.0 - See repository for details
