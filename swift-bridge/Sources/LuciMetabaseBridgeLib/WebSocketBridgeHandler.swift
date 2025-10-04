import Foundation
import Logging
import NIO
import NIOWebSocket

/// WebSocket handler for bidirectional bridge communication
final class WebSocketBridgeHandler: ChannelInboundHandler {
    typealias InboundIn = WebSocketFrame
    typealias OutboundOut = WebSocketFrame

    private let mcpServerUrl: String
    private let logger: Logger

    init(mcpServerUrl: String, logger: Logger) {
        self.mcpServerUrl = mcpServerUrl
        self.logger = logger
    }

    func channelRead(context: ChannelHandlerContext, data: NIOAny) {
        let frame = unwrapInboundIn(data)

        switch frame.opcode {
        case .text:
            handleTextFrame(context: context, frame: frame)
        case .binary:
            handleBinaryFrame(context: context, frame: frame)
        case .connectionClose:
            handleCloseFrame(context: context, frame: frame)
        case .ping:
            handlePing(context: context, frame: frame)
        case .pong:
            // Ignore pong frames
            break
        default:
            logger.warning("Unhandled WebSocket frame opcode: \(frame.opcode)")
        }
    }

    private func handleTextFrame(context: ChannelHandlerContext, frame: WebSocketFrame) {
        var data = frame.unmaskedData
        guard let text = data.readString(length: data.readableBytes) else {
            logger.error("Failed to read text from WebSocket frame")
            return
        }

        logger.debug("Received WebSocket text: \(text)")

        // Echo back for now (implement actual bridge logic)
        let response = """
        {
            "type": "bridge_response",
            "received": \(text.count) bytes",
            "timestamp": "\(ISO8601DateFormatter().string(from: Date()))"
        }
        """

        sendTextFrame(context: context, text: response)
    }

    private func handleBinaryFrame(context: ChannelHandlerContext, frame: WebSocketFrame) {
        var data = frame.unmaskedData
        let bytes = data.readBytes(length: data.readableBytes) ?? []

        logger.debug("Received WebSocket binary: \(bytes.count) bytes")

        // Echo back binary data
        sendBinaryFrame(context: context, data: Data(bytes))
    }

    private func handleCloseFrame(context: ChannelHandlerContext, frame: WebSocketFrame) {
        logger.info("WebSocket close frame received")

        // Send close frame back and close connection
        let closeFrame = WebSocketFrame(fin: true, opcode: .connectionClose, data: ByteBuffer())
        context.writeAndFlush(wrapOutboundOut(closeFrame)).whenComplete { _ in
            context.close(promise: nil)
        }
    }

    private func handlePing(context: ChannelHandlerContext, frame: WebSocketFrame) {
        // Respond with pong
        let pongFrame = WebSocketFrame(fin: true, opcode: .pong, data: frame.unmaskedData)
        context.writeAndFlush(wrapOutboundOut(pongFrame), promise: nil)
    }

    private func sendTextFrame(context: ChannelHandlerContext, text: String) {
        var buffer = context.channel.allocator.buffer(capacity: text.utf8.count)
        buffer.writeString(text)
        let frame = WebSocketFrame(fin: true, opcode: .text, data: buffer)
        context.writeAndFlush(wrapOutboundOut(frame), promise: nil)
    }

    private func sendBinaryFrame(context: ChannelHandlerContext, data: Data) {
        var buffer = context.channel.allocator.buffer(capacity: data.count)
        buffer.writeBytes(data)
        let frame = WebSocketFrame(fin: true, opcode: .binary, data: buffer)
        context.writeAndFlush(wrapOutboundOut(frame), promise: nil)
    }
}
