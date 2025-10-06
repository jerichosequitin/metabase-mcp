import Foundation

/// API Schema Generator for Personal AI Container Builds
/// Generates type-safe API schemas with carbon-based security constraints
/// Ensures only necessary connections for agent and concern domains
public struct APISchemaGenerator {

    // MARK: - Carbon-Based Security Model

    /// Carbon-based entity representing a human user
    /// Only carbon-based entities can create personal AI containers
    public struct CarbonBasedEntity: Codable, Sendable {
        public let id: UUID
        public let biometricHash: String  // SHA-256 hash of biometric data
        public let verificationLevel: SecurityLevel
        public let createdAt: Date

        public enum SecurityLevel: String, Codable, Sendable {
            case basic         // Email/password
            case enhanced      // + 2FA
            case biometric     // + Biometric verification
            case carbonProof   // + Physical presence verification
        }

        public init(id: UUID, biometricHash: String, verificationLevel: SecurityLevel, createdAt: Date = Date()) {
            self.id = id
            self.biometricHash = biometricHash
            self.verificationLevel = verificationLevel
            self.createdAt = createdAt
        }
    }

    // MARK: - Personal AI Container Schema

    /// Personal AI Container - Isolated instance for a single carbon-based entity
    public struct PersonalAIContainer: Codable, Sendable {
        public let id: UUID
        public let owner: CarbonBasedEntity
        public let agentDomains: [AgentDomain]
        public let concernDomains: [ConcernDomain]
        public let securityPolicy: SecurityPolicy
        public let containerConfig: ContainerConfiguration
        public let createdAt: Date
        public let lastAccessedAt: Date

        public init(
            id: UUID = UUID(),
            owner: CarbonBasedEntity,
            agentDomains: [AgentDomain] = [],
            concernDomains: [ConcernDomain] = [],
            securityPolicy: SecurityPolicy = .default,
            containerConfig: ContainerConfiguration = .default,
            createdAt: Date = Date(),
            lastAccessedAt: Date = Date()
        ) {
            self.id = id
            self.owner = owner
            self.agentDomains = agentDomains
            self.concernDomains = concernDomains
            self.securityPolicy = securityPolicy
            self.containerConfig = containerConfig
            self.createdAt = createdAt
            self.lastAccessedAt = lastAccessedAt
        }
    }

    // MARK: - Agent Domain Model

    /// Agent Domain - Isolated capability sphere for AI agents
    public struct AgentDomain: Codable, Sendable, Identifiable {
        public let id: UUID
        public let name: String
        public let capabilities: [Capability]
        public let allowedConnections: [UUID]  // IDs of other domains this can connect to
        public let dataAccessLevel: DataAccessLevel
        public let isolation: IsolationLevel

        public enum Capability: String, Codable, Sendable {
            case dataAnalysis
            case textGeneration
            case imageProcessing
            case codeGeneration
            case webSearch
            case fileAccess
            case networkAccess
            case databaseQuery
            case apiCall
        }

        public enum DataAccessLevel: String, Codable, Sendable {
            case none           // No data access
            case readOnly       // Read-only access
            case readWrite      // Full access within domain
            case crossDomain    // Can access other domains (restricted)
        }

        public enum IsolationLevel: String, Codable, Sendable {
            case strict         // Complete isolation, no external connections
            case managed        // Controlled connections via security policy
            case collaborative  // Can communicate with approved domains
        }

        public init(
            id: UUID = UUID(),
            name: String,
            capabilities: [Capability],
            allowedConnections: [UUID] = [],
            dataAccessLevel: DataAccessLevel = .readOnly,
            isolation: IsolationLevel = .strict
        ) {
            self.id = id
            self.name = name
            self.capabilities = capabilities
            self.allowedConnections = allowedConnections
            self.dataAccessLevel = dataAccessLevel
            self.isolation = isolation
        }
    }

    // MARK: - Concern Domain Model

    /// Concern Domain - Functional separation of concerns across container instances
    public struct ConcernDomain: Codable, Sendable, Identifiable {
        public let id: UUID
        public let category: Category
        public let scope: Scope
        public let connectedAgents: [UUID]  // Agent domain IDs
        public let crossContainerPolicy: CrossContainerPolicy

        public enum Category: String, Codable, Sendable {
            case personal       // Personal data and preferences
            case professional   // Work-related concerns
            case health         // Health and wellness
            case financial      // Financial information
            case social         // Social connections
            case creative       // Creative projects
            case learning       // Educational content
            case technical      // Technical/development work
        }

        public enum Scope: String, Codable, Sendable {
            case local          // This container only
            case shared         // Can share with other containers (same owner)
            case federated      // Can federate across instances
        }

        public enum CrossContainerPolicy: String, Codable, Sendable {
            case isolated       // No cross-container communication
            case ownerOnly      // Only with containers of same owner
            case trusted        // With explicitly trusted containers
            case public         // Publicly accessible (with encryption)
        }

        public init(
            id: UUID = UUID(),
            category: Category,
            scope: Scope,
            connectedAgents: [UUID] = [],
            crossContainerPolicy: CrossContainerPolicy = .isolated
        ) {
            self.id = id
            self.category = category
            self.scope = scope
            self.connectedAgents = connectedAgents
            self.crossContainerPolicy = crossContainerPolicy
        }
    }

    // MARK: - Security Policy

    /// Security Policy for Personal AI Containers
    public struct SecurityPolicy: Codable, Sendable {
        public let requiresCarbonBasedAuth: Bool
        public let maxConcurrentConnections: Int
        public let allowedNetworkPorts: [Int]
        public let encryptionRequired: Bool
        public let auditLogging: Bool
        public let dataRetentionDays: Int
        public let allowPlugins: Bool
        public let allowExternalAPIs: Bool
        public let trustedDomains: [String]

        public static let `default` = SecurityPolicy(
            requiresCarbonBasedAuth: true,
            maxConcurrentConnections: 10,
            allowedNetworkPorts: [8080, 8443],
            encryptionRequired: true,
            auditLogging: true,
            dataRetentionDays: 90,
            allowPlugins: false,
            allowExternalAPIs: false,
            trustedDomains: []
        )

        public static let strict = SecurityPolicy(
            requiresCarbonBasedAuth: true,
            maxConcurrentConnections: 5,
            allowedNetworkPorts: [8443],
            encryptionRequired: true,
            auditLogging: true,
            dataRetentionDays: 30,
            allowPlugins: false,
            allowExternalAPIs: false,
            trustedDomains: []
        )

        public init(
            requiresCarbonBasedAuth: Bool = true,
            maxConcurrentConnections: Int = 10,
            allowedNetworkPorts: [Int] = [8080, 8443],
            encryptionRequired: Bool = true,
            auditLogging: Bool = true,
            dataRetentionDays: Int = 90,
            allowPlugins: Bool = false,
            allowExternalAPIs: Bool = false,
            trustedDomains: [String] = []
        ) {
            self.requiresCarbonBasedAuth = requiresCarbonBasedAuth
            self.maxConcurrentConnections = maxConcurrentConnections
            self.allowedNetworkPorts = allowedNetworkPorts
            self.encryptionRequired = encryptionRequired
            self.auditLogging = auditLogging
            self.dataRetentionDays = dataRetentionDays
            self.allowPlugins = allowPlugins
            self.allowExternalAPIs = allowExternalAPIs
            self.trustedDomains = trustedDomains
        }
    }

    // MARK: - Container Configuration

    /// Container Configuration for Swift Container Plugin
    public struct ContainerConfiguration: Codable, Sendable {
        public let baseImage: String
        public let staticLinking: Bool
        public let exposedPorts: [Int]
        public let environmentVars: [String: String]
        public let labels: [String: String]
        public let volumes: [String]
        public let user: String
        public let readOnlyRoot: Bool

        public static let `default` = ContainerConfiguration(
            baseImage: "alpine:3.19",
            staticLinking: true,
            exposedPorts: [8080],
            environmentVars: [:],
            labels: ["com.luciverse.carbon-based": "true"],
            volumes: ["/data", "/config"],
            user: "1000:1000",
            readOnlyRoot: true
        )

        public init(
            baseImage: String = "alpine:3.19",
            staticLinking: Bool = true,
            exposedPorts: [Int] = [8080],
            environmentVars: [String: String] = [:],
            labels: [String: String] = [:],
            volumes: [String] = [],
            user: String = "1000:1000",
            readOnlyRoot: Bool = true
        ) {
            self.baseImage = baseImage
            self.staticLinking = staticLinking
            self.exposedPorts = exposedPorts
            self.environmentVars = environmentVars
            self.labels = labels
            self.volumes = volumes
            self.user = user
            self.readOnlyRoot = readOnlyRoot
        }
    }

    // MARK: - Plugin API Schema

    /// Plugin API Schema - Defines safe plugin interfaces
    public struct PluginAPISchema: Codable, Sendable {
        public let id: UUID
        public let name: String
        public let version: String
        public let requiredCapabilities: [AgentDomain.Capability]
        public let endpoints: [APIEndpoint]
        public let securityRequirements: PluginSecurityRequirements

        public struct APIEndpoint: Codable, Sendable {
            public let path: String
            public let method: HTTPMethod
            public let requestSchema: JSONSchema
            public let responseSchema: JSONSchema
            public let requiresAuth: Bool
            public let rateLimit: RateLimit?

            public enum HTTPMethod: String, Codable, Sendable {
                case GET, POST, PUT, DELETE, PATCH
            }

            public struct RateLimit: Codable, Sendable {
                public let requestsPerMinute: Int
                public let burstSize: Int

                public init(requestsPerMinute: Int, burstSize: Int) {
                    self.requestsPerMinute = requestsPerMinute
                    self.burstSize = burstSize
                }
            }

            public init(
                path: String,
                method: HTTPMethod,
                requestSchema: JSONSchema,
                responseSchema: JSONSchema,
                requiresAuth: Bool = true,
                rateLimit: RateLimit? = nil
            ) {
                self.path = path
                self.method = method
                self.requestSchema = requestSchema
                self.responseSchema = responseSchema
                self.requiresAuth = requiresAuth
                self.rateLimit = rateLimit
            }
        }

        public struct PluginSecurityRequirements: Codable, Sendable {
            public let carbonBasedAuthRequired: Bool
            public let domainIsolation: Bool
            public let encryptedTransport: Bool
            public let auditLog: Bool
            public let maxDataAccess: AgentDomain.DataAccessLevel

            public init(
                carbonBasedAuthRequired: Bool = true,
                domainIsolation: Bool = true,
                encryptedTransport: Bool = true,
                auditLog: Bool = true,
                maxDataAccess: AgentDomain.DataAccessLevel = .readOnly
            ) {
                self.carbonBasedAuthRequired = carbonBasedAuthRequired
                self.domainIsolation = domainIsolation
                self.encryptedTransport = encryptedTransport
                self.auditLog = auditLog
                self.maxDataAccess = maxDataAccess
            }
        }

        public init(
            id: UUID = UUID(),
            name: String,
            version: String,
            requiredCapabilities: [AgentDomain.Capability],
            endpoints: [APIEndpoint],
            securityRequirements: PluginSecurityRequirements = .init()
        ) {
            self.id = id
            self.name = name
            self.version = version
            self.requiredCapabilities = requiredCapabilities
            self.endpoints = endpoints
            self.securityRequirements = securityRequirements
        }
    }

    // MARK: - JSON Schema

    /// JSON Schema for request/response validation
    public struct JSONSchema: Codable, Sendable {
        public let type: SchemaType
        public let properties: [String: JSONSchema]?
        public let items: Box<JSONSchema>?
        public let required: [String]?
        public let description: String?

        public enum SchemaType: String, Codable, Sendable {
            case string, number, integer, boolean, array, object, null
        }

        // Box to handle recursive types
        public struct Box<T: Codable & Sendable>: Codable, Sendable {
            public let value: T
            public init(_ value: T) { self.value = value }
        }

        public init(
            type: SchemaType,
            properties: [String: JSONSchema]? = nil,
            items: Box<JSONSchema>? = nil,
            required: [String]? = nil,
            description: String? = nil
        ) {
            self.type = type
            self.properties = properties
            self.items = items
            self.required = required
            self.description = description
        }
    }

    // MARK: - Schema Generator Methods

    /// Generate OpenAPI 3.0 specification for Personal AI Container
    public static func generateOpenAPISpec(
        for container: PersonalAIContainer,
        plugins: [PluginAPISchema]
    ) -> String {
        var spec = """
        openapi: 3.0.0
        info:
          title: Personal AI Container API
          version: 1.0.0
          description: |
            Secure API for Personal AI Container
            Carbon-based authentication required
            Owner: \(container.owner.id)

        servers:
          - url: https://localhost:\(container.securityPolicy.allowedNetworkPorts.first ?? 8443)
            description: Personal AI Container Instance

        security:
          - carbonBasedAuth: []

        """

        // Add plugin endpoints
        spec += "\npaths:\n"
        for plugin in plugins {
            for endpoint in plugin.endpoints {
                spec += generateEndpointSpec(endpoint: endpoint, plugin: plugin)
            }
        }

        // Add security schemes
        spec += """

        components:
          securitySchemes:
            carbonBasedAuth:
              type: http
              scheme: bearer
              bearerFormat: JWT
              description: Carbon-based entity authentication token

        """

        return spec
    }

    private static func generateEndpointSpec(
        endpoint: PluginAPISchema.APIEndpoint,
        plugin: PluginAPISchema
    ) -> String {
        """
          \(endpoint.path):
            \(endpoint.method.rawValue.lowercased()):
              summary: \(plugin.name) - \(endpoint.path)
              security:
                - carbonBasedAuth: []
              responses:
                '200':
                  description: Successful response
                '401':
                  description: Unauthorized - Carbon-based auth required
                '403':
                  description: Forbidden - Insufficient domain permissions

        """
    }

    /// Generate Swift Container Plugin configuration
    public static func generateContainerConfig(
        for container: PersonalAIContainer
    ) -> String {
        let config = container.containerConfig

        return """
        {
            "base-image": "\(config.baseImage)",
            "static-linking": \(config.staticLinking),
            "expose": \(config.exposedPorts),
            "env": {
                "CARBON_BASED_AUTH": "required",
                "OWNER_ID": "\(container.owner.id)",
                "SECURITY_LEVEL": "\(container.owner.verificationLevel.rawValue)"
            },
            "labels": {
                "com.luciverse.personal-ai": "true",
                "com.luciverse.carbon-based": "true",
                "com.luciverse.owner": "\(container.owner.id)",
                \(config.labels.map { "\"\($0.key)\": \"\($0.value)\"" }.joined(separator: ",\n                "))
            },
            "volumes": \(config.volumes),
            "user": "\(config.user)",
            "read-only-root": \(config.readOnlyRoot),
            "security-opt": [
                "no-new-privileges:true"
            ]
        }
        """
    }

    /// Validate plugin against security policy
    public static func validatePlugin(
        _ plugin: PluginAPISchema,
        against policy: SecurityPolicy
    ) -> ValidationResult {
        var errors: [String] = []
        var warnings: [String] = []

        // Check if plugins are allowed
        if !policy.allowPlugins {
            errors.append("Plugins are not allowed by security policy")
        }

        // Check carbon-based auth requirement
        if !plugin.securityRequirements.carbonBasedAuthRequired {
            errors.append("Plugin must require carbon-based authentication")
        }

        // Check domain isolation
        if !plugin.securityRequirements.domainIsolation {
            warnings.append("Plugin does not enforce domain isolation")
        }

        // Check for external API calls
        if !policy.allowExternalAPIs {
            for capability in plugin.requiredCapabilities {
                if capability == .apiCall || capability == .networkAccess {
                    errors.append("Plugin requires external API access which is not allowed")
                }
            }
        }

        return ValidationResult(
            isValid: errors.isEmpty,
            errors: errors,
            warnings: warnings
        )
    }

    public struct ValidationResult {
        public let isValid: Bool
        public let errors: [String]
        public let warnings: [String]
    }
}
