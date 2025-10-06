import Foundation
import NIO
import Crypto

/// Concern Domain Isolation System
/// Manages functional separation and cross-container communication
public actor ConcernDomainIsolation {

    // MARK: - Properties

    private var concernDomains: [UUID: IsolatedConcernDomain] = [:]
    private var crossContainerConnections: [UUID: Set<ContainerConnection>] = [:]
    private let container: APISchemaGenerator.PersonalAIContainer
    private let encryptionKey: SymmetricKey

    // MARK: - Initialization

    public init(
        container: APISchemaGenerator.PersonalAIContainer,
        encryptionKey: SymmetricKey? = nil
    ) {
        self.container = container
        self.encryptionKey = encryptionKey ?? SymmetricKey(size: .bits256)
    }

    // MARK: - Isolated Concern Domain

    private struct IsolatedConcernDomain {
        let domain: APISchemaGenerator.ConcernDomain
        var dataStore: SecureDataStore
        var connectedAgents: Set<UUID>
        var crossContainerLinks: Set<UUID>  // Other concern domain IDs
        let createdAt: Date
        var lastAccessedAt: Date

        init(domain: APISchemaGenerator.ConcernDomain) {
            self.domain = domain
            self.dataStore = SecureDataStore()
            self.connectedAgents = Set(domain.connectedAgents)
            self.crossContainerLinks = []
            self.createdAt = Date()
            self.lastAccessedAt = Date()
        }
    }

    /// Secure data store for concern domain
    private struct SecureDataStore {
        private var encryptedData: [String: Data] = [:]

        mutating func set(_ key: String, value: Data, encryptWith: SymmetricKey) throws {
            let sealedBox = try AES.GCM.seal(value, using: encryptWith)
            encryptedData[key] = sealedBox.combined
        }

        func get(_ key: String, decryptWith: SymmetricKey) throws -> Data? {
            guard let combined = encryptedData[key] else { return nil }
            let sealedBox = try AES.GCM.SealedBox(combined: combined)
            return try AES.GCM.open(sealedBox, using: decryptWith)
        }

        mutating func remove(_ key: String) {
            encryptedData.removeValue(forKey: key)
        }

        func keys() -> [String] {
            Array(encryptedData.keys)
        }
    }

    // MARK: - Concern Domain Management

    /// Initialize concern domain with isolation
    public func initializeConcernDomain(_ domain: APISchemaGenerator.ConcernDomain) async throws {
        // Verify domain belongs to this container
        guard container.concernDomains.contains(where: { $0.id == domain.id }) else {
            throw IsolationError.domainNotInContainer(domain.id)
        }

        let isolated = IsolatedConcernDomain(domain: domain)
        concernDomains[domain.id] = isolated

        await auditLog(.domainInitialized(domain.id, domain.category))
    }

    /// Store data in concern domain
    public func storeData(
        in domainID: UUID,
        key: String,
        value: Data,
        agentID: UUID
    ) async throws {
        guard var domain = concernDomains[domainID] else {
            throw IsolationError.domainNotInitialized(domainID)
        }

        // Verify agent has access
        guard domain.connectedAgents.contains(agentID) else {
            throw IsolationError.agentNotConnected(agentID, domainID)
        }

        // Encrypt and store
        try domain.dataStore.set(key, value: value, encryptWith: encryptionKey)
        domain.lastAccessedAt = Date()
        concernDomains[domainID] = domain

        await auditLog(.dataStored(domainID, key, agentID))
    }

    /// Retrieve data from concern domain
    public func retrieveData(
        from domainID: UUID,
        key: String,
        agentID: UUID
    ) async throws -> Data? {
        guard var domain = concernDomains[domainID] else {
            throw IsolationError.domainNotInitialized(domainID)
        }

        // Verify agent has access
        guard domain.connectedAgents.contains(agentID) else {
            throw IsolationError.agentNotConnected(agentID, domainID)
        }

        // Decrypt and retrieve
        domain.lastAccessedAt = Date()
        concernDomains[domainID] = domain

        let data = try domain.dataStore.get(key, decryptWith: encryptionKey)
        await auditLog(.dataRetrieved(domainID, key, agentID))

        return data
    }

    // MARK: - Cross-Container Communication

    /// Container connection for federated concern domains
    public struct ContainerConnection: Hashable, Sendable {
        public let remoteContainerID: UUID
        public let remoteOwnerID: UUID
        public let concernDomainID: UUID
        public let connectionType: ConnectionType
        public let establishedAt: Date

        public enum ConnectionType: String, Codable, Sendable {
            case ownerShared    // Same owner, different container
            case trusted        // Explicitly trusted connection
            case federated      // Federated across instances
        }

        public init(
            remoteContainerID: UUID,
            remoteOwnerID: UUID,
            concernDomainID: UUID,
            connectionType: ConnectionType,
            establishedAt: Date = Date()
        ) {
            self.remoteContainerID = remoteContainerID
            self.remoteOwnerID = remoteOwnerID
            self.concernDomainID = concernDomainID
            self.connectionType = connectionType
            self.establishedAt = establishedAt
        }

        public func hash(into hasher: inout Hasher) {
            hasher.combine(remoteContainerID)
            hasher.combine(concernDomainID)
        }

        public static func == (lhs: ContainerConnection, rhs: ContainerConnection) -> Bool {
            lhs.remoteContainerID == rhs.remoteContainerID &&
            lhs.concernDomainID == rhs.concernDomainID
        }
    }

    /// Establish cross-container connection
    public func establishCrossContainerConnection(
        concernDomainID: UUID,
        remoteContainerID: UUID,
        remoteOwnerID: UUID,
        connectionType: ContainerConnection.ConnectionType
    ) async throws {
        guard let domain = concernDomains[concernDomainID] else {
            throw IsolationError.domainNotInitialized(concernDomainID)
        }

        // Verify cross-container policy allows this connection
        switch (domain.domain.crossContainerPolicy, connectionType) {
        case (.isolated, _):
            throw IsolationError.crossContainerNotAllowed(concernDomainID)
        case (.ownerOnly, .ownerShared):
            // Verify same owner
            guard remoteOwnerID == container.owner.id else {
                throw IsolationError.ownerMismatch
            }
        case (.trusted, .trusted):
            // Trusted connections allowed
            break
        case (.public, .federated):
            // Federated connections allowed
            break
        default:
            throw IsolationError.connectionTypeMismatch
        }

        let connection = ContainerConnection(
            remoteContainerID: remoteContainerID,
            remoteOwnerID: remoteOwnerID,
            concernDomainID: concernDomainID,
            connectionType: connectionType
        )

        crossContainerConnections[concernDomainID, default: []].insert(connection)
        await auditLog(.crossContainerConnected(concernDomainID, remoteContainerID))
    }

    /// Share data across containers
    public func shareDataCrossContainer(
        concernDomainID: UUID,
        key: String,
        with remoteContainerID: UUID
    ) async throws -> SharedDataPacket {
        guard let domain = concernDomains[concernDomainID] else {
            throw IsolationError.domainNotInitialized(concernDomainID)
        }

        // Verify connection exists
        guard let connection = crossContainerConnections[concernDomainID]?.first(where: {
            $0.remoteContainerID == remoteContainerID
        }) else {
            throw IsolationError.noConnectionToContainer(remoteContainerID)
        }

        // Get encrypted data
        guard let encryptedData = try domain.dataStore.get(key, decryptWith: encryptionKey) else {
            throw IsolationError.dataNotFound(key)
        }

        // Create shared packet with metadata
        let packet = SharedDataPacket(
            id: UUID(),
            sourceContainerID: container.id,
            sourceOwnerID: container.owner.id,
            concernDomainID: concernDomainID,
            dataKey: key,
            encryptedData: encryptedData,
            connectionType: connection.connectionType,
            timestamp: Date()
        )

        await auditLog(.dataShared(concernDomainID, key, remoteContainerID))

        return packet
    }

    /// Shared data packet for cross-container transfer
    public struct SharedDataPacket: Sendable {
        public let id: UUID
        public let sourceContainerID: UUID
        public let sourceOwnerID: UUID
        public let concernDomainID: UUID
        public let dataKey: String
        public let encryptedData: Data
        public let connectionType: ContainerConnection.ConnectionType
        public let timestamp: Date

        public init(
            id: UUID,
            sourceContainerID: UUID,
            sourceOwnerID: UUID,
            concernDomainID: UUID,
            dataKey: String,
            encryptedData: Data,
            connectionType: ContainerConnection.ConnectionType,
            timestamp: Date
        ) {
            self.id = id
            self.sourceContainerID = sourceContainerID
            self.sourceOwnerID = sourceOwnerID
            self.concernDomainID = concernDomainID
            self.dataKey = dataKey
            self.encryptedData = encryptedData
            self.connectionType = connectionType
            self.timestamp = timestamp
        }
    }

    // MARK: - Concern Domain Queries

    /// Get all concern domains by category
    public func getConcernDomains(
        byCategory category: APISchemaGenerator.ConcernDomain.Category
    ) -> [APISchemaGenerator.ConcernDomain] {
        container.concernDomains.filter { $0.category == category }
    }

    /// Get concern domains for specific agent
    public func getConcernDomains(
        forAgent agentID: UUID
    ) -> [APISchemaGenerator.ConcernDomain] {
        container.concernDomains.filter { $0.connectedAgents.contains(agentID) }
    }

    /// Check if agent can access concern domain
    public func canAccess(
        agentID: UUID,
        concernDomainID: UUID
    ) -> Bool {
        guard let domain = concernDomains[concernDomainID] else {
            return false
        }
        return domain.connectedAgents.contains(agentID)
    }

    // MARK: - Data Retention and Cleanup

    /// Clean up expired data based on retention policy
    public func cleanupExpiredData() async {
        let retentionDate = Date().addingTimeInterval(
            -Double(container.securityPolicy.dataRetentionDays * 24 * 3600)
        )

        for (domainID, var domain) in concernDomains {
            if domain.lastAccessedAt < retentionDate {
                // Remove old data
                for key in domain.dataStore.keys() {
                    domain.dataStore.remove(key)
                }
                concernDomains[domainID] = domain
                await auditLog(.dataCleanup(domainID, retentionDate))
            }
        }
    }

    // MARK: - Audit Logging

    private enum AuditEvent {
        case domainInitialized(UUID, APISchemaGenerator.ConcernDomain.Category)
        case dataStored(UUID, String, UUID)  // domain, key, agent
        case dataRetrieved(UUID, String, UUID)
        case dataShared(UUID, String, UUID)  // domain, key, remote container
        case crossContainerConnected(UUID, UUID)  // domain, remote container
        case dataCleanup(UUID, Date)
        case accessDenied(UUID, UUID, String)  // agent, domain, reason
    }

    private func auditLog(_ event: AuditEvent) async {
        guard container.securityPolicy.auditLogging else { return }

        let timestamp = ISO8601DateFormatter().string(from: Date())
        let logEntry: String

        switch event {
        case .domainInitialized(let id, let category):
            logEntry = "\(timestamp) [ISOLATION] Concern domain \(id) initialized - Category: \(category)"
        case .dataStored(let domainID, let key, let agentID):
            logEntry = "\(timestamp) [ISOLATION] Data stored - Domain: \(domainID), Key: \(key), Agent: \(agentID)"
        case .dataRetrieved(let domainID, let key, let agentID):
            logEntry = "\(timestamp) [ISOLATION] Data retrieved - Domain: \(domainID), Key: \(key), Agent: \(agentID)"
        case .dataShared(let domainID, let key, let remoteID):
            logEntry = "\(timestamp) [ISOLATION] Data shared - Domain: \(domainID), Key: \(key), Remote: \(remoteID)"
        case .crossContainerConnected(let domainID, let remoteID):
            logEntry = "\(timestamp) [ISOLATION] Cross-container connection - Domain: \(domainID), Remote: \(remoteID)"
        case .dataCleanup(let domainID, let retentionDate):
            logEntry = "\(timestamp) [ISOLATION] Data cleanup - Domain: \(domainID), Before: \(retentionDate)"
        case .accessDenied(let agentID, let domainID, let reason):
            logEntry = "\(timestamp) [SECURITY] Access denied - Agent: \(agentID), Domain: \(domainID), Reason: \(reason)"
        }

        print(logEntry)
    }

    // MARK: - Errors

    public enum IsolationError: Error, CustomStringConvertible {
        case domainNotInContainer(UUID)
        case domainNotInitialized(UUID)
        case agentNotConnected(UUID, UUID)  // agent, domain
        case crossContainerNotAllowed(UUID)
        case ownerMismatch
        case connectionTypeMismatch
        case noConnectionToContainer(UUID)
        case dataNotFound(String)

        public var description: String {
            switch self {
            case .domainNotInContainer(let id):
                return "Concern domain \(id) does not belong to this container"
            case .domainNotInitialized(let id):
                return "Concern domain \(id) not initialized"
            case .agentNotConnected(let agentID, let domainID):
                return "Agent \(agentID) not connected to domain \(domainID)"
            case .crossContainerNotAllowed(let id):
                return "Cross-container communication not allowed for domain \(id)"
            case .ownerMismatch:
                return "Owner mismatch for cross-container connection"
            case .connectionTypeMismatch:
                return "Connection type not allowed by domain policy"
            case .noConnectionToContainer(let id):
                return "No connection established to container \(id)"
            case .dataNotFound(let key):
                return "Data not found for key: \(key)"
            }
        }
    }
}
