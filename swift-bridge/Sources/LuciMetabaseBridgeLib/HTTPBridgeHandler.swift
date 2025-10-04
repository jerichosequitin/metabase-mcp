import Foundation
import Logging
import NIO
import NIOHTTP1

/// HTTP handler that bridges requests to the Node.js MCP server
final class HTTPBridgeHandler: ChannelInboundHandler {
    typealias InboundIn = HTTPServerRequestPart
    typealias OutboundOut = HTTPServerResponsePart

    private let mcpServerUrl: String
    private let logger: Logger
    private var requestBody: ByteBuffer?
    private var requestHead: HTTPRequestHead?

    init(mcpServerUrl: String, logger: Logger) {
        self.mcpServerUrl = mcpServerUrl
        self.logger = logger
    }

    func channelRead(context: ChannelHandlerContext, data: NIOAny) {
        let reqPart = unwrapInboundIn(data)

        switch reqPart {
        case .head(let head):
            requestHead = head
            logger.debug("Received request: \(head.method) \(head.uri)")

        case .body(var buffer):
            if requestBody == nil {
                requestBody = buffer
            } else {
                requestBody!.writeBuffer(&buffer)
            }

        case .end:
            handleRequest(context: context)
        }
    }

    private func handleRequest(context: ChannelHandlerContext) {
        guard let head = requestHead else {
            sendError(context: context, status: .badRequest, message: "Invalid request")
            return
        }

        // Handle health check endpoint
        if head.uri == "/health" {
            sendHealthResponse(context: context)
            return
        }

        // Handle bridge status endpoint
        if head.uri == "/bridge/status" {
            sendBridgeStatus(context: context)
            return
        }

        // For other requests, proxy to MCP server
        proxyToMCPServer(context: context, head: head)
    }

    private func sendHealthResponse(context: ChannelHandlerContext) {
        let response = """
        {
            "status": "healthy",
            "service": "luci-metabase-bridge",
            "timestamp": "\(ISO8601DateFormatter().string(from: Date()))"
        }
        """

        sendJSONResponse(context: context, status: .ok, body: response)
    }

    private func sendBridgeStatus(context: ChannelHandlerContext) {
        let response = """
        {
            "bridge": "active",
            "mcpServerUrl": "\(mcpServerUrl)",
            "protocol": "http",
            "timestamp": "\(ISO8601DateFormatter().string(from: Date()))"
        }
        """

        sendJSONResponse(context: context, status: .ok, body: response)
    }

    private func proxyToMCPServer(context: ChannelHandlerContext, head: HTTPRequestHead) {
        // This is a placeholder for actual proxy implementation
        // In production, this would forward the request to the Node.js MCP server

        let response = """
        {
            "message": "Bridge proxy to MCP server",
            "path": "\(head.uri)",
            "method": "\(head.method)",
            "note": "Implement actual proxy logic here"
        }
        """

        sendJSONResponse(context: context, status: .ok, body: response)
    }

    private func sendJSONResponse(context: ChannelHandlerContext, status: HTTPResponseStatus, body: String) {
        var headers = HTTPHeaders()
        headers.add(name: "Content-Type", value: "application/json")
        headers.add(name: "Content-Length", value: "\(body.utf8.count)")
        headers.add(name: "Connection", value: "close")

        let responseHead = HTTPResponseHead(version: .http1_1, status: status, headers: headers)
        context.write(wrapOutboundOut(.head(responseHead)), promise: nil)

        var buffer = context.channel.allocator.buffer(capacity: body.utf8.count)
        buffer.writeString(body)
        context.write(wrapOutboundOut(.body(.byteBuffer(buffer))), promise: nil)
        context.writeAndFlush(wrapOutboundOut(.end(nil)), promise: nil)
    }

    private func sendError(context: ChannelHandlerContext, status: HTTPResponseStatus, message: String) {
        let response = """
        {
            "error": "\(message)",
            "status": \(status.code)
        }
        """

        sendJSONResponse(context: context, status: status, body: response)
    }
}
