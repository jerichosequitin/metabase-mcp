// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "LuciMetabaseBridge",
    platforms: [
        .macOS(.v13),
        .iOS(.v16),
        .linux
    ],
    products: [
        .executable(
            name: "LuciMetabaseBridge",
            targets: ["LuciMetabaseBridge"]
        ),
        .library(
            name: "LuciMetabaseBridgeLib",
            targets: ["LuciMetabaseBridgeLib"]
        )
    ],
    dependencies: [
        // Apple Swift ecosystem - High-performance networking
        .package(url: "https://github.com/apple/swift-nio", from: "2.65.0"),
        .package(url: "https://github.com/apple/swift-nio-ssl", from: "2.26.0"),
        .package(url: "https://github.com/apple/swift-nio-http2", from: "1.30.0"),
        .package(url: "https://github.com/apple/swift-nio-transport-services", from: "1.20.0"),

        // Apple Swift Collections - High-performance data structures
        .package(url: "https://github.com/apple/swift-collections", from: "1.1.0"),

        // Apple Swift Crypto - Cryptographic operations
        .package(url: "https://github.com/apple/swift-crypto", from: "3.2.0"),

        // Swift argument parser for CLI
        .package(url: "https://github.com/apple/swift-argument-parser", from: "1.3.0"),

        // Swift log for structured logging
        .package(url: "https://github.com/apple/swift-log", from: "1.5.0"),

        // Web3 integration (optional)
        // .package(url: "https://github.com/chainnodesorg/Web3.swift", from: "1.0.0"),
    ],
    targets: [
        // Executable target
        .executableTarget(
            name: "LuciMetabaseBridge",
            dependencies: [
                "LuciMetabaseBridgeLib",
                .product(name: "ArgumentParser", package: "swift-argument-parser"),
                .product(name: "Logging", package: "swift-log"),
            ],
            path: "Sources/CLI"
        ),

        // Library target - Bridge implementation
        .target(
            name: "LuciMetabaseBridgeLib",
            dependencies: [
                .product(name: "NIO", package: "swift-nio"),
                .product(name: "NIOHTTP1", package: "swift-nio"),
                .product(name: "NIOHTTP2", package: "swift-nio-http2"),
                .product(name: "NIOWebSocket", package: "swift-nio"),
                .product(name: "NIOSSL", package: "swift-nio-ssl"),
                .product(name: "NIOTransportServices", package: "swift-nio-transport-services"),
                .product(name: "NIOFoundationCompat", package: "swift-nio"),
                .product(name: "Collections", package: "swift-collections"),
                .product(name: "Crypto", package: "swift-crypto"),
                .product(name: "Logging", package: "swift-log"),
            ],
            path: "Sources/LuciMetabaseBridgeLib"
        ),

        // Test target
        .testTarget(
            name: "LuciMetabaseBridgeTests",
            dependencies: [
                "LuciMetabaseBridgeLib",
                .product(name: "NIO", package: "swift-nio"),
                .product(name: "NIOTestUtils", package: "swift-nio"),
            ],
            path: "Tests/LuciMetabaseBridgeTests"
        ),
    ]
)
