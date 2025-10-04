// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Metabase-MCP-Bridging-Architecture",
    platforms: [
        .macOS(.v13),
        .iOS(.v16),
        .linux
    ],
    dependencies: [
        // Apple Swift ecosystem
        .package(url: "https://github.com/apple/swift-collections", from: "1.0.0"),
        .package(url: "https://github.com/apple/swift-crypto", from: "3.0.0"),
        .package(url: "https://github.com/apple/swift-nio", from: "2.65.0"),
        .package(url: "https://github.com/apple/swift-nio-ssl", from: "2.25.0"),
        .package(url: "https://github.com/apple/swift-nio-transport-services", from: "1.20.0"),
        .package(url: "https://github.com/apple/swift-nio-http2", from: "1.30.0"),
        .package(url: "https://github.com/apple/swift-nio-extras", from: "1.21.0"),

        // Node.js integration
        .package(url: "https://github.com/kabiroberai/node-swift", from: "1.0.0"),

        // HTTP client for API calls
        .package(url: "https://github.com/swift-server/async-http-client", from: "1.20.0"),

        // Argument parsing
        .package(url: "https://github.com/apple/swift-argument-parser", from: "1.3.0"),

        // Testing
        .package(url: "https://github.com/apple/swift-testing", from: "0.7.0")
    ],
    targets: [
        // Core bridging library for Metabase MCP
        .target(
            name: "MetabaseBridge",
            dependencies: [
                .product(name: "Collections", package: "swift-collections"),
                .product(name: "Crypto", package: "swift-crypto"),
                .product(name: "NIO", package: "swift-nio"),
                .product(name: "NIOHTTP1", package: "swift-nio"),
                .product(name: "NIOHTTP2", package: "swift-nio-http2"),
                .product(name: "NIOSSL", package: "swift-nio-ssl"),
                .product(name: "NIOTransportServices", package: "swift-nio-transport-services"),
                .product(name: "NIOExtras", package: "swift-nio-extras"),
                .product(name: "AsyncHTTPClient", package: "async-http-client"),
                .product(name: "ArgumentParser", package: "swift-argument-parser")
            ],
            swiftSettings: [
                .enableExperimentalFeature("StrictConcurrency")
            ]
        ),

        // Apple ecosystem integration for Metabase analytics
        .target(
            name: "AppleEcosystemBridge",
            dependencies: ["MetabaseBridge"]
        ),

        // Node.js integration for TypeScript MCP server
        .target(
            name: "NodeJSBridge",
            dependencies: [
                "MetabaseBridge",
                .product(name: "NodeSwift", package: "node-swift")
            ]
        ),

        // HTTP server for bridging APIs
        .target(
            name: "BridgingHTTPServer",
            dependencies: [
                "MetabaseBridge",
                .product(name: "NIO", package: "swift-nio"),
                .product(name: "NIOHTTP1", package: "swift-nio"),
                .product(name: "NIOHTTP2", package: "swift-nio-http2"),
                .product(name: "NIOSSL", package: "swift-nio-ssl")
            ]
        ),

        // Main executable
        .executableTarget(
            name: "MetabaseBridgeServer",
            dependencies: [
                "MetabaseBridge",
                "AppleEcosystemBridge",
                "NodeJSBridge",
                "BridgingHTTPServer",
                .product(name: "ArgumentParser", package: "swift-argument-parser")
            ]
        ),

        // Tests
        .testTarget(
            name: "MetabaseBridgeTests",
            dependencies: [
                "MetabaseBridge",
                .product(name: "Testing", package: "swift-testing")
            ]
        )
    ]
)
