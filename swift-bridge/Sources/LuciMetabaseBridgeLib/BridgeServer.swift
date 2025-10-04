import Foundation
import Logging
import NIO
import NIOHTTP1
import NIOWebSocket

/// Main bridge server that coordinates Swift-NIO with Node.js MCP server
public final class BridgeServer {
    private let configuration: BridgeConfiguration
    private let logger: Logger
    private let group: MultiThreadedEventLoopGroup

    public init(configuration: BridgeConfiguration, logger: Logger) throws {
        self.configuration = configuration
        self.logger = logger

        // Create event loop group with configured number of threads
        let threads = configuration.numberOfThreads > 0
            ? configuration.numberOfThreads
            : System.coreCount
        self.group = MultiThreadedEventLoopGroup(numberOfThreads: threads)

        logger.info("Initialized bridge server with \(threads) threads")
    }

    deinit {
        try? group.syncShutdownGracefully()
    }

    public func start() async throws {
        logger.info("Starting bridge server on \(configuration.host):\(configuration.port)")

        let bootstrap = ServerBootstrap(group: group)
            // Specify backlog and enable SO_REUSEADDR
            .serverChannelOption(ChannelOptions.backlog, value: 256)
            .serverChannelOption(ChannelOptions.socketOption(.so_reuseaddr), value: 1)

            // Set up the child channel pipeline
            .childChannelInitializer { channel in
                self.setupChildChannel(channel)
            }

            // Enable TCP_NODELAY and SO_REUSEADDR for child channels
            .childChannelOption(ChannelOptions.socketOption(.tcp_nodelay), value: 1)
            .childChannelOption(ChannelOptions.socketOption(.so_reuseaddr), value: 1)

        let channel = try await bootstrap.bind(host: configuration.host, port: configuration.port).get()

        logger.info("Bridge server started successfully on \(channel.localAddress!)")

        // Wait for the channel to close
        try await channel.closeFuture.get()
    }

    private func setupChildChannel(_ channel: Channel) -> EventLoopFuture<Void> {
        // Set up WebSocket upgrade handler if enabled
        if configuration.enableWebSocket {
            return setupWebSocketPipeline(channel)
        } else {
            return setupHTTPPipeline(channel)
        }
    }

    private func setupHTTPPipeline(_ channel: Channel) -> EventLoopFuture<Void> {
        return channel.pipeline.addHandlers([
            HTTPServerCodec(),
            HTTPBridgeHandler(
                mcpServerUrl: configuration.mcpServerUrl,
                logger: logger
            )
        ])
    }

    private func setupWebSocketPipeline(_ channel: Channel) -> EventLoopFuture<Void> {
        let upgrader = NIOWebSocketServerUpgrader(
            shouldUpgrade: { channel, head in
                return channel.eventLoop.makeSucceededFuture([:])
            },
            upgradePipelineHandler: { channel, request in
                return channel.pipeline.addHandler(
                    WebSocketBridgeHandler(
                        mcpServerUrl: self.configuration.mcpServerUrl,
                        logger: self.logger
                    )
                )
            }
        )

        return channel.pipeline.configureHTTPServerPipeline(
            withServerUpgrade: (
                upgraders: [upgrader],
                completionHandler: { context in
                    // Upgrade completed
                    self.logger.debug("WebSocket upgrade completed")
                }
            )
        ).flatMap {
            channel.pipeline.addHandler(
                HTTPBridgeHandler(
                    mcpServerUrl: self.configuration.mcpServerUrl,
                    logger: self.logger
                )
            )
        }
    }
}
