import Foundation
import NIO
import Logging

/// Swift Containerization Instance Manager
/// Manages lifecycle of Personal AI Container instances
public actor ContainerInstanceManager {

    // MARK: - Properties

    private var instances: [UUID: ContainerInstance] = [:]
    private let eventLoopGroup: EventLoopGroup
    private let logger: Logger
    private let pluginArchitecture: PluginArchitecture
    private let concernDomainIsolation: ConcernDomainIsolation

    // MARK: - Initialization

    public init(
        eventLoopGroup: EventLoopGroup = MultiThreadedEventLoopGroup(numberOfThreads: System.coreCount),
        logger: Logger = Logger(label: "com.luciverse.container-manager")
    ) {
        self.eventLoopGroup = eventLoopGroup
        self.logger = logger

        // These will be initialized per container
        self.pluginArchitecture = PluginArchitecture(
            container: .init(owner: .init(id: UUID(), biometricHash: "", verificationLevel: .basic)),
            eventLoopGroup: eventLoopGroup
        )
        self.concernDomainIsolation = ConcernDomainIsolation(
            container: .init(owner: .init(id: UUID(), biometricHash: "", verificationLevel: .basic))
        )
    }

    // MARK: - Container Instance

    public struct ContainerInstance {
        public let id: UUID
        public let container: APISchemaGenerator.PersonalAIContainer
        public let pluginArch: PluginArchitecture
        public let isolation: ConcernDomainIsolation
        public var state: InstanceState
        public let createdAt: Date
        public var lastHeartbeat: Date

        public enum InstanceState: String, Sendable {
            case initializing
            case running
            case paused
            case stopping
            case stopped
            case error
        }

        public init(
            id: UUID = UUID(),
            container: APISchemaGenerator.PersonalAIContainer,
            pluginArch: PluginArchitecture,
            isolation: ConcernDomainIsolation,
            state: InstanceState = .initializing,
            createdAt: Date = Date(),
            lastHeartbeat: Date = Date()
        ) {
            self.id = id
            self.container = container
            self.pluginArch = pluginArch
            self.isolation = isolation
            self.state = state
            self.createdAt = createdAt
            self.lastHeartbeat = lastHeartbeat
        }
    }

    // MARK: - Instance Lifecycle

    /// Create new container instance
    public func createInstance(
        for owner: APISchemaGenerator.CarbonBasedEntity,
        withConfig config: APISchemaGenerator.ContainerConfiguration = .default,
        securityPolicy: APISchemaGenerator.SecurityPolicy = .default
    ) async throws -> UUID {
        // Create container
        let container = APISchemaGenerator.PersonalAIContainer(
            owner: owner,
            securityPolicy: securityPolicy,
            containerConfig: config
        )

        // Initialize plugin architecture
        let pluginArch = PluginArchitecture(
            container: container,
            eventLoopGroup: eventLoopGroup
        )

        // Initialize concern domain isolation
        let isolation = ConcernDomainIsolation(container: container)

        // Create instance
        let instance = ContainerInstance(
            container: container,
            pluginArch: pluginArch,
            isolation: isolation,
            state: .initializing
        )

        instances[instance.id] = instance

        logger.info("Created container instance",
                    metadata: [
                        "instance_id": "\(instance.id)",
                        "owner_id": "\(owner.id)"
                    ])

        // Generate container build configuration
        try await generateContainerBuild(for: instance)

        return instance.id
    }

    /// Start container instance
    public func startInstance(_ instanceID: UUID) async throws {
        guard var instance = instances[instanceID] else {
            throw ManagerError.instanceNotFound(instanceID)
        }

        instance.state = .running
        instance.lastHeartbeat = Date()
        instances[instanceID] = instance

        logger.info("Started container instance", metadata: ["instance_id": "\(instanceID)"])
    }

    /// Stop container instance
    public func stopInstance(_ instanceID: UUID) async throws {
        guard var instance = instances[instanceID] else {
            throw ManagerError.instanceNotFound(instanceID)
        }

        instance.state = .stopping

        // Cleanup resources
        await cleanupInstance(instance)

        instance.state = .stopped
        instances[instanceID] = instance

        logger.info("Stopped container instance", metadata: ["instance_id": "\(instanceID)"])
    }

    /// Pause container instance
    public func pauseInstance(_ instanceID: UUID) async throws {
        guard var instance = instances[instanceID] else {
            throw ManagerError.instanceNotFound(instanceID)
        }

        guard instance.state == .running else {
            throw ManagerError.invalidState(instance.state)
        }

        instance.state = .paused
        instances[instanceID] = instance

        logger.info("Paused container instance", metadata: ["instance_id": "\(instanceID)"])
    }

    /// Resume container instance
    public func resumeInstance(_ instanceID: UUID) async throws {
        guard var instance = instances[instanceID] else {
            throw ManagerError.instanceNotFound(instanceID)
        }

        guard instance.state == .paused else {
            throw ManagerError.invalidState(instance.state)
        }

        instance.state = .running
        instance.lastHeartbeat = Date()
        instances[instanceID] = instance

        logger.info("Resumed container instance", metadata: ["instance_id": "\(instanceID)"])
    }

    /// Destroy container instance
    public func destroyInstance(_ instanceID: UUID) async throws {
        guard let instance = instances[instanceID] else {
            throw ManagerError.instanceNotFound(instanceID)
        }

        // Ensure stopped
        if instance.state != .stopped {
            try await stopInstance(instanceID)
        }

        // Remove instance
        instances.removeValue(forKey: instanceID)

        logger.info("Destroyed container instance", metadata: ["instance_id": "\(instanceID)"])
    }

    // MARK: - Instance Management

    /// Get instance by ID
    public func getInstance(_ instanceID: UUID) -> ContainerInstance? {
        instances[instanceID]
    }

    /// Get all instances for owner
    public func getInstances(forOwner ownerID: UUID) -> [ContainerInstance] {
        instances.values.filter { $0.container.owner.id == ownerID }
    }

    /// Get all running instances
    public func getRunningInstances() -> [ContainerInstance] {
        instances.values.filter { $0.state == .running }
    }

    /// Update instance heartbeat
    public func updateHeartbeat(_ instanceID: UUID) async throws {
        guard var instance = instances[instanceID] else {
            throw ManagerError.instanceNotFound(instanceID)
        }

        instance.lastHeartbeat = Date()
        instances[instanceID] = instance
    }

    /// Check for stale instances (no heartbeat in 5 minutes)
    public func checkStaleInstances() async {
        let staleThreshold = Date().addingTimeInterval(-300) // 5 minutes

        for (id, instance) in instances {
            if instance.state == .running && instance.lastHeartbeat < staleThreshold {
                logger.warning("Stale instance detected",
                             metadata: [
                                "instance_id": "\(id)",
                                "last_heartbeat": "\(instance.lastHeartbeat)"
                             ])

                try? await stopInstance(id)
            }
        }
    }

    // MARK: - Container Build Generation

    private func generateContainerBuild(for instance: ContainerInstance) async throws {
        let container = instance.container

        // Generate Swift Container Plugin configuration
        let containerConfig = APISchemaGenerator.generateContainerConfig(for: container)

        // Save configuration to file
        let configPath = "build/containers/\(instance.id)/.swift-container-config.json"
        try containerConfig.write(
            toFile: configPath,
            atomically: true,
            encoding: .utf8
        )

        // Generate Package.swift with container plugin
        let packageSwift = generatePackageSwift(for: instance)
        let packagePath = "build/containers/\(instance.id)/Package.swift"
        try packageSwift.write(
            toFile: packagePath,
            atomically: true,
            encoding: .utf8
        )

        // Generate main.swift entry point
        let mainSwift = generateMainSwift(for: instance)
        let mainPath = "build/containers/\(instance.id)/Sources/Main/main.swift"
        try mainSwift.write(
            toFile: mainPath,
            atomically: true,
            encoding: .utf8
        )

        logger.info("Generated container build files",
                    metadata: ["instance_id": "\(instance.id)"])
    }

    private func generatePackageSwift(for instance: ContainerInstance) -> String {
        """
        // swift-tools-version: 6.0
        import PackageDescription

        let package = Package(
            name: "PersonalAIContainer-\(instance.id)",
            platforms: [
                .macOS(.v13),
                .linux
            ],
            products: [
                .executable(
                    name: "personal-ai-container",
                    targets: ["Main"]
                )
            ],
            dependencies: [
                .package(url: "https://github.com/apple/swift-container-plugin", from: "1.1.0"),
                .package(url: "https://github.com/apple/swift-nio", from: "2.65.0"),
                .package(url: "https://github.com/apple/swift-crypto", from: "3.2.0"),
                .package(url: "https://github.com/apple/swift-log", from: "1.5.0"),
            ],
            targets: [
                .executableTarget(
                    name: "Main",
                    dependencies: [
                        .product(name: "NIO", package: "swift-nio"),
                        .product(name: "Crypto", package: "swift-crypto"),
                        .product(name: "Logging", package: "swift-log"),
                    ],
                    plugins: [
                        .plugin(name: "ContainerImageBuilder", package: "swift-container-plugin")
                    ]
                )
            ]
        )
        """
    }

    private func generateMainSwift(for instance: ContainerInstance) -> String {
        """
        import Foundation
        import NIO
        import Crypto
        import Logging

        @main
        struct PersonalAIContainer {
            static func main() async throws {
                let logger = Logger(label: "personal-ai-container")

                logger.info("Starting Personal AI Container",
                           metadata: [
                               "instance_id": "\(instance.id)",
                               "owner_id": "\(instance.container.owner.id)",
                               "carbon_based_auth": "required"
                           ])

                // Initialize event loop group
                let eventLoopGroup = MultiThreadedEventLoopGroup(numberOfThreads: System.coreCount)
                defer {
                    try? eventLoopGroup.syncShutdownGracefully()
                }

                // Start HTTP server on configured port
                let port = \(instance.container.securityPolicy.allowedNetworkPorts.first ?? 8080)

                logger.info("Container listening on port \\(port)")

                // Keep running
                try await Task.sleep(for: .seconds(.max))
            }
        }
        """
    }

    // MARK: - Build and Deploy

    /// Build container image using Swift Container Plugin
    public func buildContainerImage(
        for instanceID: UUID,
        repository: String,
        tag: String = "latest"
    ) async throws -> String {
        guard let instance = instances[instanceID] else {
            throw ManagerError.instanceNotFound(instanceID)
        }

        let buildPath = "build/containers/\(instance.id)"

        logger.info("Building container image",
                    metadata: [
                        "instance_id": "\(instanceID)",
                        "repository": "\(repository)",
                        "tag": "\(tag)"
                    ])

        // Execute swift package build-container-image
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/swift")
        process.arguments = [
            "package",
            "--swift-sdk", "x86_64-swift-linux-musl",
            "build-container-image",
            "--repository", repository,
            "--tag", tag
        ]
        process.currentDirectoryURL = URL(fileURLWithPath: buildPath)

        try process.run()
        process.waitUntilExit()

        guard process.terminationStatus == 0 else {
            throw ManagerError.buildFailed(process.terminationStatus)
        }

        let imageRef = "\(repository):\(tag)"
        logger.info("Container image built successfully",
                    metadata: ["image": "\(imageRef)"])

        return imageRef
    }

    // MARK: - Cleanup

    private func cleanupInstance(_ instance: ContainerInstance) async {
        // Cleanup concern domain data if retention expired
        await instance.isolation.cleanupExpiredData()

        logger.info("Cleaned up instance resources",
                    metadata: ["instance_id": "\(instance.id)"])
    }

    // MARK: - Errors

    public enum ManagerError: Error, CustomStringConvertible {
        case instanceNotFound(UUID)
        case invalidState(ContainerInstance.InstanceState)
        case buildFailed(Int32)
        case deploymentFailed(String)

        public var description: String {
            switch self {
            case .instanceNotFound(let id):
                return "Container instance not found: \(id)"
            case .invalidState(let state):
                return "Invalid instance state: \(state)"
            case .buildFailed(let code):
                return "Container build failed with exit code: \(code)"
            case .deploymentFailed(let reason):
                return "Deployment failed: \(reason)"
            }
        }
    }
}
