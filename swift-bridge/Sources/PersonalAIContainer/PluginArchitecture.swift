import Foundation
import NIO
import NIOHTTP1

/// Plugin Architecture for Personal AI Containers
/// Manages agent domains and ensures secure plugin execution
public actor PluginArchitecture {

    // MARK: - Properties

    private var registeredPlugins: [UUID: RegisteredPlugin] = [:]
    private var activeAgentDomains: [UUID: ActiveAgentDomain] = [:]
    private let container: APISchemaGenerator.PersonalAIContainer
    private let eventLoopGroup: EventLoopGroup

    // MARK: - Initialization

    public init(
        container: APISchemaGenerator.PersonalAIContainer,
        eventLoopGroup: EventLoopGroup
    ) {
        self.container = container
        self.eventLoopGroup = eventLoopGroup
    }

    // MARK: - Plugin Registration

    public struct RegisteredPlugin {
        public let schema: APISchemaGenerator.PluginAPISchema
        public let agentDomain: APISchemaGenerator.AgentDomain
        public let handler: PluginHandler
        public let registeredAt: Date

        public init(
            schema: APISchemaGenerator.PluginAPISchema,
            agentDomain: APISchemaGenerator.AgentDomain,
            handler: PluginHandler,
            registeredAt: Date = Date()
        ) {
            self.schema = schema
            self.agentDomain = agentDomain
            self.handler = handler
            self.registeredAt = registeredAt
        }
    }

    /// Register a new plugin
    public func registerPlugin(
        schema: APISchemaGenerator.PluginAPISchema,
        agentDomain: APISchemaGenerator.AgentDomain,
        handler: PluginHandler
    ) async throws {
        // Validate plugin against security policy
        let validation = APISchemaGenerator.validatePlugin(
            schema,
            against: container.securityPolicy
        )

        guard validation.isValid else {
            throw PluginError.validationFailed(errors: validation.errors)
        }

        // Check if agent domain exists
        guard container.agentDomains.contains(where: { $0.id == agentDomain.id }) else {
            throw PluginError.agentDomainNotFound(agentDomain.id)
        }

        // Verify capabilities
        for capability in schema.requiredCapabilities {
            guard agentDomain.capabilities.contains(capability) else {
                throw PluginError.missingCapability(capability)
            }
        }

        // Register plugin
        let registered = RegisteredPlugin(
            schema: schema,
            agentDomain: agentDomain,
            handler: handler
        )

        registeredPlugins[schema.id] = registered

        // Log registration (audit)
        await auditLog(event: .pluginRegistered(schema.id, agentDomain.id))
    }

    /// Unregister a plugin
    public func unregisterPlugin(_ pluginID: UUID) async {
        registeredPlugins.removeValue(forKey: pluginID)
        await auditLog(event: .pluginUnregistered(pluginID))
    }

    // MARK: - Agent Domain Management

    private struct ActiveAgentDomain {
        let domain: APISchemaGenerator.AgentDomain
        let connections: Set<UUID>  // Connected domain IDs
        let activeRequests: Int
        let lastActivity: Date
    }

    /// Activate an agent domain
    public func activateAgentDomain(_ domainID: UUID) async throws {
        guard let domain = container.agentDomains.first(where: { $0.id == domainID }) else {
            throw PluginError.agentDomainNotFound(domainID)
        }

        activeAgentDomains[domainID] = ActiveAgentDomain(
            domain: domain,
            connections: Set(domain.allowedConnections),
            activeRequests: 0,
            lastActivity: Date()
        )

        await auditLog(event: .agentDomainActivated(domainID))
    }

    /// Deactivate an agent domain
    public func deactivateAgentDomain(_ domainID: UUID) async {
        activeAgentDomains.removeValue(forKey: domainID)
        await auditLog(event: .agentDomainDeactivated(domainID))
    }

    /// Check if domain can connect to another domain
    public func canConnect(from: UUID, to: UUID) -> Bool {
        guard let activeDomain = activeAgentDomains[from] else {
            return false
        }

        // Check isolation level
        switch activeDomain.domain.isolation {
        case .strict:
            return false
        case .managed:
            return activeDomain.domain.allowedConnections.contains(to)
        case .collaborative:
            return activeDomain.domain.allowedConnections.contains(to) ||
                   checkConcernDomainSharing(from: from, to: to)
        }
    }

    private func checkConcernDomainSharing(from: UUID, to: UUID) -> Bool {
        // Check if domains share a concern domain
        for concernDomain in container.concernDomains {
            if concernDomain.connectedAgents.contains(from) &&
               concernDomain.connectedAgents.contains(to) {
                switch concernDomain.crossContainerPolicy {
                case .isolated:
                    return false
                case .ownerOnly, .trusted, .public:
                    return true
                }
            }
        }
        return false
    }

    // MARK: - Plugin Execution

    /// Execute a plugin request
    public func executePluginRequest(
        pluginID: UUID,
        request: PluginRequest,
        auth: CarbonBasedAuthToken
    ) async throws -> PluginResponse {
        // Verify carbon-based authentication
        try await verifyCarbonBasedAuth(auth)

        // Get registered plugin
        guard let registered = registeredPlugins[pluginID] else {
            throw PluginError.pluginNotFound(pluginID)
        }

        // Check agent domain is active
        guard activeAgentDomains[registered.agentDomain.id] != nil else {
            throw PluginError.agentDomainNotActive(registered.agentDomain.id)
        }

        // Validate request against schema
        try validateRequest(request, against: registered.schema)

        // Log request
        await auditLog(event: .pluginRequestExecuted(pluginID, request.endpoint))

        // Execute with timeout and isolation
        return try await withThrowingTaskGroup(of: PluginResponse.self) { group in
            group.addTask {
                try await registered.handler.handle(
                    request: request,
                    domain: registered.agentDomain,
                    eventLoop: self.eventLoopGroup.next()
                )
            }

            // Timeout after 30 seconds
            let timeout = Task {
                try await Task.sleep(for: .seconds(30))
                throw PluginError.executionTimeout
            }

            let response = try await group.next()!
            timeout.cancel()

            return response
        }
    }

    private func validateRequest(
        _ request: PluginRequest,
        against schema: APISchemaGenerator.PluginAPISchema
    ) throws {
        // Find matching endpoint
        guard let endpoint = schema.endpoints.first(where: { $0.path == request.endpoint }) else {
            throw PluginError.endpointNotFound(request.endpoint)
        }

        // Validate HTTP method
        guard endpoint.method.rawValue == request.method else {
            throw PluginError.methodNotAllowed(request.method)
        }

        // TODO: Validate request body against JSON schema
        // This would use the JSONSchema to validate structure
    }

    // MARK: - Carbon-Based Authentication

    public struct CarbonBasedAuthToken {
        public let token: String
        public let entityID: UUID
        public let issuedAt: Date
        public let expiresAt: Date
        public let biometricVerified: Bool

        public init(
            token: String,
            entityID: UUID,
            issuedAt: Date = Date(),
            expiresAt: Date = Date().addingTimeInterval(3600),
            biometricVerified: Bool = false
        ) {
            self.token = token
            self.entityID = entityID
            self.issuedAt = issuedAt
            self.expiresAt = expiresAt
            self.biometricVerified = biometricVerified
        }

        public var isExpired: Bool {
            Date() > expiresAt
        }
    }

    private func verifyCarbonBasedAuth(_ auth: CarbonBasedAuthToken) async throws {
        // Verify token not expired
        guard !auth.isExpired else {
            throw PluginError.authTokenExpired
        }

        // Verify entity matches container owner
        guard auth.entityID == container.owner.id else {
            throw PluginError.unauthorizedOwner
        }

        // Verify biometric if required by security policy
        if container.securityPolicy.requiresCarbonBasedAuth && !auth.biometricVerified {
            throw PluginError.biometricVerificationRequired
        }
    }

    // MARK: - Audit Logging

    private enum AuditEvent {
        case pluginRegistered(UUID, UUID)  // plugin ID, agent domain ID
        case pluginUnregistered(UUID)
        case agentDomainActivated(UUID)
        case agentDomainDeactivated(UUID)
        case pluginRequestExecuted(UUID, String)  // plugin ID, endpoint
        case unauthorizedAccess(UUID, String)
        case connectionDenied(UUID, UUID)  // from domain, to domain
    }

    private func auditLog(event: AuditEvent) async {
        guard container.securityPolicy.auditLogging else { return }

        let timestamp = ISO8601DateFormatter().string(from: Date())
        let logEntry: String

        switch event {
        case .pluginRegistered(let pluginID, let domainID):
            logEntry = "\(timestamp) [AUDIT] Plugin \(pluginID) registered for domain \(domainID)"
        case .pluginUnregistered(let pluginID):
            logEntry = "\(timestamp) [AUDIT] Plugin \(pluginID) unregistered"
        case .agentDomainActivated(let domainID):
            logEntry = "\(timestamp) [AUDIT] Agent domain \(domainID) activated"
        case .agentDomainDeactivated(let domainID):
            logEntry = "\(timestamp) [AUDIT] Agent domain \(domainID) deactivated"
        case .pluginRequestExecuted(let pluginID, let endpoint):
            logEntry = "\(timestamp) [AUDIT] Plugin \(pluginID) executed: \(endpoint)"
        case .unauthorizedAccess(let domainID, let details):
            logEntry = "\(timestamp) [SECURITY] Unauthorized access attempt by domain \(domainID): \(details)"
        case .connectionDenied(let from, let to):
            logEntry = "\(timestamp) [SECURITY] Connection denied from \(from) to \(to)"
        }

        // In production, write to secure audit log storage
        print(logEntry)
    }

    // MARK: - Plugin Handler Protocol

    public protocol PluginHandler: Sendable {
        func handle(
            request: PluginRequest,
            domain: APISchemaGenerator.AgentDomain,
            eventLoop: EventLoop
        ) async throws -> PluginResponse
    }

    // MARK: - Plugin Request/Response

    public struct PluginRequest: Sendable {
        public let id: UUID
        public let endpoint: String
        public let method: String
        public let headers: [String: String]
        public let body: Data?

        public init(
            id: UUID = UUID(),
            endpoint: String,
            method: String,
            headers: [String: String] = [:],
            body: Data? = nil
        ) {
            self.id = id
            self.endpoint = endpoint
            self.method = method
            self.headers = headers
            self.body = body
        }
    }

    public struct PluginResponse: Sendable {
        public let statusCode: Int
        public let headers: [String: String]
        public let body: Data?

        public init(
            statusCode: Int,
            headers: [String: String] = [:],
            body: Data? = nil
        ) {
            self.statusCode = statusCode
            self.headers = headers
            self.body = body
        }
    }

    // MARK: - Errors

    public enum PluginError: Error, CustomStringConvertible {
        case validationFailed(errors: [String])
        case agentDomainNotFound(UUID)
        case agentDomainNotActive(UUID)
        case missingCapability(APISchemaGenerator.AgentDomain.Capability)
        case pluginNotFound(UUID)
        case endpointNotFound(String)
        case methodNotAllowed(String)
        case executionTimeout
        case authTokenExpired
        case unauthorizedOwner
        case biometricVerificationRequired
        case connectionDenied(from: UUID, to: UUID)

        public var description: String {
            switch self {
            case .validationFailed(let errors):
                return "Plugin validation failed: \(errors.joined(separator: ", "))"
            case .agentDomainNotFound(let id):
                return "Agent domain not found: \(id)"
            case .agentDomainNotActive(let id):
                return "Agent domain not active: \(id)"
            case .missingCapability(let capability):
                return "Missing required capability: \(capability)"
            case .pluginNotFound(let id):
                return "Plugin not found: \(id)"
            case .endpointNotFound(let endpoint):
                return "Endpoint not found: \(endpoint)"
            case .methodNotAllowed(let method):
                return "HTTP method not allowed: \(method)"
            case .executionTimeout:
                return "Plugin execution timeout"
            case .authTokenExpired:
                return "Authentication token expired"
            case .unauthorizedOwner:
                return "Unauthorized: Not container owner"
            case .biometricVerificationRequired:
                return "Biometric verification required"
            case .connectionDenied(let from, let to):
                return "Connection denied from \(from) to \(to)"
            }
        }
    }
}
