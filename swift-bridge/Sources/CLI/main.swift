import ArgumentParser
import Foundation
import Logging
import LuciMetabaseBridgeLib

@main
struct LuciMetabaseBridge: AsyncParsableCommand {
    static let configuration = CommandConfiguration(
        commandName: "luci-metabase-bridge",
        abstract: "Swift-NIO bridge server for Luci-Metabase-MCP",
        discussion: """
        A high-performance bridge server that connects Swift ecosystem with Node.js Metabase MCP server.
        Implements the BRIDGING-ARCHITECTURE.md patterns for multi-language integration.
        """
    )

    @Option(name: .long, help: "Host to bind to (default: ::)")
    var host: String = "::"

    @Option(name: .long, help: "Port to bind to (default: 8001)")
    var port: Int = 8001

    @Option(name: .long, help: "Number of NIO threads (0 = auto)")
    var threads: Int = 0

    @Option(name: .long, help: "MCP server URL")
    var mcpServerUrl: String = "http://localhost:3000"

    @Option(name: .long, help: "Log level (trace, debug, info, notice, warning, error, critical)")
    var logLevel: String = "info"

    @Flag(name: .long, help: "Enable WebSocket bridge")
    var enableWebSocket: Bool = false

    @Flag(name: .long, help: "Enable HTTP/2 server")
    var enableHTTP2: Bool = false

    @Flag(name: .long, help: "Enable gRPC service mesh")
    var enableGRPC: Bool = false

    mutating func run() async throws {
        // Setup logging
        let level = parseLogLevel(logLevel)
        LoggingSystem.bootstrap { label in
            var handler = StreamLogHandler.standardOutput(label: label)
            handler.logLevel = level
            return handler
        }

        let logger = Logger(label: "luci.metabase.bridge")

        logger.info("Starting Luci-Metabase-MCP Bridge Server")
        logger.info("Host: \(host)")
        logger.info("Port: \(port)")
        logger.info("MCP Server URL: \(mcpServerUrl)")
        logger.info("WebSocket: \(enableWebSocket)")
        logger.info("HTTP/2: \(enableHTTP2)")
        logger.info("gRPC: \(enableGRPC)")

        // Create bridge configuration
        let config = BridgeConfiguration(
            host: host,
            port: port,
            numberOfThreads: threads,
            mcpServerUrl: mcpServerUrl,
            enableWebSocket: enableWebSocket,
            enableHTTP2: enableHTTP2,
            enableGRPC: enableGRPC
        )

        // Start bridge server
        let server = try BridgeServer(configuration: config, logger: logger)

        do {
            try await server.start()

            // Keep running until interrupted
            try await withThrowingTaskGroup(of: Void.self) { group in
                group.addTask {
                    try await Task.sleep(for: .seconds(.max))
                }
                try await group.next()
            }
        } catch {
            logger.error("Bridge server error: \(error)")
            throw error
        }
    }

    private func parseLogLevel(_ level: String) -> Logger.Level {
        switch level.lowercased() {
        case "trace": return .trace
        case "debug": return .debug
        case "info": return .info
        case "notice": return .notice
        case "warning": return .warning
        case "error": return .error
        case "critical": return .critical
        default: return .info
        }
    }
}
