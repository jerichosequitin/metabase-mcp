import Foundation

/// Configuration for the Luci-Metabase-MCP Bridge Server
public struct BridgeConfiguration {
    /// Host to bind to (supports IPv6)
    public let host: String

    /// Port to bind to
    public let port: Int

    /// Number of NIO event loop threads (0 = auto-detect based on CPU cores)
    public let numberOfThreads: Int

    /// URL of the Node.js MCP server to bridge to
    public let mcpServerUrl: String

    /// Enable WebSocket bridge protocol
    public let enableWebSocket: Bool

    /// Enable HTTP/2 server
    public let enableHTTP2: Bool

    /// Enable gRPC service mesh
    public let enableGRPC: Bool

    public init(
        host: String = "::",
        port: Int = 8001,
        numberOfThreads: Int = 0,
        mcpServerUrl: String = "http://localhost:3000",
        enableWebSocket: Bool = true,
        enableHTTP2: Bool = false,
        enableGRPC: Bool = false
    ) {
        self.host = host
        self.port = port
        self.numberOfThreads = numberOfThreads
        self.mcpServerUrl = mcpServerUrl
        self.enableWebSocket = enableWebSocket
        self.enableHTTP2 = enableHTTP2
        self.enableGRPC = enableGRPC
    }
}
