import Foundation
import NIO
import AsyncHTTPClient
import Collections

/// Core bridging architecture for Metabase MCP ecosystem
/// Provides seamless integration between Apple, TypeScript/Node.js, and Metabase ecosystems
public class MetabaseBridge {
    public static let shared = MetabaseBridge()

    private let httpClient: HTTPClient
    private let eventLoopGroup: MultiThreadedEventLoopGroup
    private let bridgeMetrics = BridgeMetrics()
    private let metabaseAPI: MetabaseAPI

    private init() {
        self.eventLoopGroup = MultiThreadedEventLoopGroup(numberOfThreads: System.coreCount)
        self.httpClient = HTTPClient(eventLoopGroupProvider: .shared(eventLoopGroup))
        self.metabaseAPI = MetabaseAPI()
    }

    deinit {
        try? httpClient.shutdown()
        try? eventLoopGroup.syncShutdownGracefully()
    }

    /// Process Metabase analytics request through multiple ecosystems
    public func processAnalyticsRequest(_ input: String) async throws -> AnalyticsResult {
        let startTime = Date()

        // Process through Metabase MCP API
        let metabaseResult = try await metabaseAPI.process(input)

        // Bridge to Apple ecosystem for design optimization
        let appleOptimization = try await bridgeToAppleEcosystem(metabaseResult)

        // Bridge to Node.js for TypeScript MCP processing
        let nodeJSResult = try await bridgeToNodeJSEcosystem(metabaseResult)

        let processingTime = Date().timeIntervalSince(startTime)
        bridgeMetrics.recordProcessing(time: processingTime, success: true)

        return AnalyticsResult(
            originalInput: input,
            metabaseResult: metabaseResult,
            appleOptimization: appleOptimization,
            nodeJSResult: nodeJSResult,
            processingTime: processingTime,
            bridgeMetrics: bridgeMetrics.getCurrentMetrics()
        )
    }

    /// Bridge Metabase data to Apple ecosystem
    private func bridgeToAppleEcosystem(_ metabaseResult: String) async throws -> AppleOptimization {
        let analyzer = AppleEcosystemAnalyzer()
        return try await analyzer.optimizeMetabaseData(metabaseResult)
    }

    /// Bridge Metabase data to Node.js ecosystem
    private func bridgeToNodeJSEcosystem(_ metabaseResult: String) async throws -> NodeJSResult {
        let nodeBridge = NodeJSBridge()
        return try await nodeBridge.processMetabaseData(metabaseResult)
    }

    /// Get current bridge metrics
    public func getMetrics() -> BridgeMetricsData {
        return bridgeMetrics.getCurrentMetrics()
    }

    /// Health check for all bridge components
    public func healthCheck() async -> BridgeHealthStatus {
        let metabaseHealth = try? await metabaseAPI.healthCheck()
        let appleHealth = await checkAppleEcosystemHealth()
        let nodeHealth = await checkNodeJSEcosystemHealth()

        return BridgeHealthStatus(
            overall: metabaseHealth == .healthy && appleHealth && nodeHealth,
            metabase: metabaseHealth ?? .unknown,
            appleEcosystem: appleHealth,
            nodeJSEcosystem: nodeHealth,
            lastChecked: Date()
        )
    }

    private func checkAppleEcosystemHealth() async -> Bool {
        do {
            let response = try await httpClient.get(url: "https://developer.apple.com")
            return response.status == .ok
        } catch {
            return false
        }
    }

    private func checkNodeJSEcosystemHealth() async -> Bool {
        do {
            let response = try await httpClient.get(url: "https://registry.npmjs.org")
            return response.status == .ok
        } catch {
            return false
        }
    }
}

/// Metabase analytics processing result with multi-ecosystem optimization
public struct AnalyticsResult {
    public let originalInput: String
    public let metabaseResult: String
    public let appleOptimization: AppleOptimization
    public let nodeJSResult: NodeJSResult
    public let processingTime: TimeInterval
    public let bridgeMetrics: BridgeMetricsData

    public var summary: String {
        return """
        Metabase Analytics Result:
        - Original Input: \(originalInput.prefix(50))...
        - Processing Time: \(String(format: "%.2f", processingTime))s
        - Apple Optimization Score: \(appleOptimization.optimizationScore)
        - Node.js Performance: \(nodeJSResult.performanceScore)
        """
    }
}

/// Apple ecosystem optimization result
public struct AppleOptimization {
    public let optimizationScore: Double
    public let cacheEfficiency: Double
    public let performanceImpact: String
    public let recommendations: [String]

    public init(optimizationScore: Double, cacheEfficiency: Double, performanceImpact: String, recommendations: [String]) {
        self.optimizationScore = optimizationScore
        self.cacheEfficiency = cacheEfficiency
        self.performanceImpact = performanceImpact
        self.recommendations = recommendations
    }
}

/// Node.js processing result
public struct NodeJSResult {
    public let performanceScore: Double
    public let executionTime: TimeInterval
    public let memoryUsage: Int
    public let mcpToolsAvailable: [String]

    public init(performanceScore: Double, executionTime: TimeInterval, memoryUsage: Int, mcpToolsAvailable: [String]) {
        self.performanceScore = performanceScore
        self.executionTime = executionTime
        self.memoryUsage = memoryUsage
        self.mcpToolsAvailable = mcpToolsAvailable
    }
}

/// Bridge health status
public struct BridgeHealthStatus {
    public let overall: Bool
    public let metabase: HealthStatus
    public let appleEcosystem: Bool
    public let nodeJSEcosystem: Bool
    public let lastChecked: Date

    public enum HealthStatus {
        case healthy, degraded, unhealthy, unknown
    }
}

/// Bridge metrics data
public struct BridgeMetricsData {
    public let totalRequests: Int
    public let averageLatency: TimeInterval
    public let errorRate: Double
    public let throughput: Double
    public let activeConnections: Int

    public init(totalRequests: Int, averageLatency: TimeInterval, errorRate: Double, throughput: Double, activeConnections: Int) {
        self.totalRequests = totalRequests
        self.averageLatency = averageLatency
        self.errorRate = errorRate
        self.throughput = throughput
        self.activeConnections = activeConnections
    }
}

/// Bridge metrics collector
private class BridgeMetrics {
    private var totalRequests = 0
    private var totalLatency: TimeInterval = 0
    private var errorCount = 0
    private var startTime = Date()
    private var connectionCount = 0

    func recordProcessing(time: TimeInterval, success: Bool) {
        totalRequests += 1
        totalLatency += time

        if !success {
            errorCount += 1
        }
    }

    func recordConnection() {
        connectionCount += 1
    }

    func recordDisconnection() {
        connectionCount = max(0, connectionCount - 1)
    }

    func getCurrentMetrics() -> BridgeMetricsData {
        let averageLatency = totalRequests > 0 ? totalLatency / Double(totalRequests) : 0
        let errorRate = totalRequests > 0 ? Double(errorCount) / Double(totalRequests) : 0
        let uptime = Date().timeIntervalSince(startTime)
        let throughput = uptime > 0 ? Double(totalRequests) / uptime : 0

        return BridgeMetricsData(
            totalRequests: totalRequests,
            averageLatency: averageLatency,
            errorRate: errorRate,
            throughput: throughput,
            activeConnections: connectionCount
        )
    }
}

/// Metabase MCP API client
private class MetabaseAPI {
    private let httpClient: HTTPClient
    private let eventLoopGroup: MultiThreadedEventLoopGroup

    init() {
        self.eventLoopGroup = MultiThreadedEventLoopGroup(numberOfThreads: 1)
        self.httpClient = HTTPClient(eventLoopGroupProvider: .shared(eventLoopGroup))
    }

    deinit {
        try? httpClient.shutdown()
        try? eventLoopGroup.syncShutdownGracefully()
    }

    func process(_ input: String) async throws -> String {
        guard let url = URL(string: "http://localhost:3000/api/v1/metabase/process") else {
            throw NSError(domain: "MetabaseBridge", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid API URL"])
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["input": input])

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw NSError(domain: "MetabaseBridge", code: -2, userInfo: [NSLocalizedDescriptionKey: "API request failed"])
        }

        let result = try JSONDecoder().decode(MetabaseAPIResponse.self, from: data)
        return result.result
    }

    func healthCheck() async throws -> BridgeHealthStatus.HealthStatus {
        guard let url = URL(string: "http://localhost:3000/health") else {
            return .unknown
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 5

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            return .unknown
        }

        return httpResponse.statusCode == 200 ? .healthy : .unhealthy
    }
}

/// API response structure
private struct MetabaseAPIResponse: Codable {
    let result: String
    let dataSize: Int?
    let processingTime: Double?

    enum CodingKeys: String, CodingKey {
        case result
        case dataSize = "data_size"
        case processingTime = "processing_time"
    }
}
