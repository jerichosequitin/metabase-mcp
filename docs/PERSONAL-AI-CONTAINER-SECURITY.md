## Personal AI Container Security Model

Complete security architecture for carbon-based personal AI containers with agent and concern domain isolation.

## Table of Contents

1. [Overview](#overview)
2. [Carbon-Based Security Model](#carbon-based-security-model)
3. [Architecture Components](#architecture-components)
4. [Agent Domain Management](#agent-domain-management)
5. [Concern Domain Isolation](#concern-domain-isolation)
6. [Plugin Security](#plugin-security)
7. [Cross-Container Communication](#cross-container-communication)
8. [API Schema Generation](#api-schema-generation)
9. [Implementation Guide](#implementation-guide)

## Overview

### What are Personal AI Containers?

Personal AI Containers are **isolated, secure Swift-based containerized environments** designed exclusively for individual carbon-based entities (humans). Each container:

- ✅ **Belongs to ONE human** - Verified through biometric authentication
- ✅ **Isolated execution** - No cross-contamination between users
- ✅ **Agent domain separation** - Capabilities isolated by function
- ✅ **Concern domain isolation** - Data separated by context
- ✅ **Secure plugin architecture** - Only approved plugins with minimal permissions
- ✅ **Static linking** - Self-contained binaries with no external dependencies

### Core Principles

1. **Carbon-Based Only** - Only humans can create and own Personal AI Containers
2. **Minimal Permission** - Plugins and APIs have only necessary connections
3. **Domain Isolation** - Agent and concern domains maintain strict boundaries
4. **Audit Everything** - All actions logged for accountability
5. **Encryption By Default** - All data encrypted at rest and in transit

## Carbon-Based Security Model

### Carbon-Based Entity

```swift
public struct CarbonBasedEntity {
    public let id: UUID
    public let biometricHash: String  // SHA-256 of biometric data
    public let verificationLevel: SecurityLevel

    public enum SecurityLevel {
        case basic         // Email/password
        case enhanced      // + 2FA
        case biometric     // + Biometric verification
        case carbonProof   // + Physical presence verification
    }
}
```

### Authentication Requirements

**Basic Level:**
- Email and password
- No container creation allowed

**Enhanced Level:**
- Two-factor authentication
- Limited container features

**Biometric Level:**
- Face ID / Touch ID / Fingerprint
- Full container access
- Required for plugin installation

**Carbon Proof Level:**
- Physical presence verification
- Required for cross-container communication
- Maximum security for sensitive operations

### Verification Flow

```
1. User initiates action
   ↓
2. Check security level requirement
   ↓
3. Request biometric verification
   ↓
4. Generate time-limited token
   ↓
5. Execute action with audit log
   ↓
6. Token expires (1 hour default)
```

## Architecture Components

### Personal AI Container Structure

```swift
public struct PersonalAIContainer {
    let id: UUID
    let owner: CarbonBasedEntity
    let agentDomains: [AgentDomain]
    let concernDomains: [ConcernDomain]
    let securityPolicy: SecurityPolicy
    let containerConfig: ContainerConfiguration
}
```

### Security Policy

```swift
public struct SecurityPolicy {
    let requiresCarbonBasedAuth: Bool = true    // Always true
    let maxConcurrentConnections: Int = 10
    let allowedNetworkPorts: [Int] = [8080, 8443]
    let encryptionRequired: Bool = true
    let auditLogging: Bool = true
    let dataRetentionDays: Int = 90
    let allowPlugins: Bool = false              // Opt-in only
    let allowExternalAPIs: Bool = false         // Opt-in only
    let trustedDomains: [String] = []
}
```

**Default Policy**: Strictest security, no plugins, no external APIs
**Strict Policy**: Even more restrictive for sensitive data
**Custom Policy**: User-defined with validation

## Agent Domain Management

### What are Agent Domains?

**Agent Domains** are isolated capability spheres where AI agents operate. Each domain:

- Has specific capabilities (text generation, image processing, etc.)
- Can only access allowed data
- Communicates only with approved domains
- Operates with defined isolation level

### Agent Domain Model

```swift
public struct AgentDomain {
    let id: UUID
    let name: String
    let capabilities: [Capability]
    let allowedConnections: [UUID]
    let dataAccessLevel: DataAccessLevel
    let isolation: IsolationLevel

    enum Capability {
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

    enum DataAccessLevel {
        case none           // No data access
        case readOnly       // Read-only access
        case readWrite      // Full access within domain
        case crossDomain    // Can access other domains (restricted)
    }

    enum IsolationLevel {
        case strict         // Complete isolation
        case managed        // Controlled connections
        case collaborative  // Approved domain communication
    }
}
```

### Example: Text Generation Agent

```swift
let textGenAgent = AgentDomain(
    name: "Text Generator",
    capabilities: [.textGeneration],
    allowedConnections: [],  // No connections
    dataAccessLevel: .readOnly,
    isolation: .strict
)
```

### Example: Research Assistant Agent

```swift
let researchAgent = AgentDomain(
    name: "Research Assistant",
    capabilities: [.webSearch, .dataAnalysis, .textGeneration],
    allowedConnections: [textGenAgent.id],
    dataAccessLevel: .readWrite,
    isolation: .collaborative
)
```

### Connection Rules

1. **Strict Isolation**: No outbound connections allowed
2. **Managed Isolation**: Only `allowedConnections` can be reached
3. **Collaborative Isolation**: Connections via shared concern domains

```swift
// Check if connection is allowed
func canConnect(from: UUID, to: UUID) -> Bool {
    guard let domain = activeDomains[from] else { return false }

    switch domain.isolation {
    case .strict:
        return false
    case .managed:
        return domain.allowedConnections.contains(to)
    case .collaborative:
        return domain.allowedConnections.contains(to) ||
               sharesConernDomain(from, to)
    }
}
```

## Concern Domain Isolation

### What are Concern Domains?

**Concern Domains** separate data and functionality by context/purpose. Examples:

- **Personal**: Personal preferences, private data
- **Professional**: Work documents, projects
- **Health**: Medical records, fitness data
- **Financial**: Banking, investments
- **Creative**: Art, music, writing projects

### Concern Domain Model

```swift
public struct ConcernDomain {
    let id: UUID
    let category: Category
    let scope: Scope
    let connectedAgents: [UUID]
    let crossContainerPolicy: CrossContainerPolicy

    enum Category {
        case personal, professional, health, financial
        case social, creative, learning, technical
    }

    enum Scope {
        case local          // This container only
        case shared         // Same owner's containers
        case federated      // Across instances
    }

    enum CrossContainerPolicy {
        case isolated       // No cross-container
        case ownerOnly      // Same owner only
        case trusted        // Explicitly trusted
        case public         // Publicly accessible (encrypted)
    }
}
```

### Data Isolation

All concern domain data is:
1. **Encrypted at rest** - AES-256-GCM encryption
2. **Access controlled** - Only connected agents can access
3. **Audit logged** - Every access recorded
4. **Retention managed** - Auto-cleanup per policy

```swift
// Store encrypted data
await isolation.storeData(
    in: financialDomain.id,
    key: "bank-account",
    value: sensitiveData,
    agentID: financialAgent.id
)

// Retrieve with validation
let data = try await isolation.retrieveData(
    from: financialDomain.id,
    key: "bank-account",
    agentID: financialAgent.id
)
```

### Cross-Container Communication

```swift
// Establish connection (requires owner verification)
await isolation.establishCrossContainerConnection(
    concernDomainID: personalDomain.id,
    remoteContainerID: workContainer.id,
    remoteOwnerID: owner.id,  // Must be same owner
    connectionType: .ownerOnly
)

// Share data securely
let packet = try await isolation.shareDataCrossContainer(
    concernDomainID: personalDomain.id,
    key: "preferences",
    with: workContainer.id
)
```

## Plugin Security

### Plugin API Schema

```swift
public struct PluginAPISchema {
    let id: UUID
    let name: String
    let version: String
    let requiredCapabilities: [AgentDomain.Capability]
    let endpoints: [APIEndpoint]
    let securityRequirements: PluginSecurityRequirements
}

public struct PluginSecurityRequirements {
    let carbonBasedAuthRequired: Bool = true  // Always required
    let domainIsolation: Bool = true
    let encryptedTransport: Bool = true
    let auditLog: Bool = true
    let maxDataAccess: DataAccessLevel = .readOnly
}
```

### Plugin Validation

Before registration, plugins are validated:

1. **Carbon-based auth required** - Must verify human owner
2. **Domain isolation enforced** - Cannot break isolation
3. **Minimal capabilities** - Only what's necessary
4. **No external APIs** - Unless explicitly allowed
5. **Security policy compliance** - Must meet all requirements

```swift
let validation = APISchemaGenerator.validatePlugin(
    pluginSchema,
    against: securityPolicy
)

guard validation.isValid else {
    throw PluginError.validationFailed(validation.errors)
}
```

### Example: Safe Plugin

```swift
let safePlugin = PluginAPISchema(
    name: "Text Formatter",
    requiredCapabilities: [.textGeneration],
    endpoints: [
        APIEndpoint(
            path: "/format",
            method: .POST,
            requiresAuth: true,
            rateLimit: RateLimit(requestsPerMinute: 60, burstSize: 10)
        )
    ],
    securityRequirements: PluginSecurityRequirements(
        carbonBasedAuthRequired: true,
        domainIsolation: true,
        maxDataAccess: .readOnly
    )
)
```

### Example: Rejected Plugin

```swift
let unsafePlugin = PluginAPISchema(
    name: "External Data Harvester",
    requiredCapabilities: [.networkAccess, .fileAccess, .databaseQuery],
    securityRequirements: PluginSecurityRequirements(
        carbonBasedAuthRequired: false,  // ❌ Rejected
        domainIsolation: false,          // ❌ Rejected
        maxDataAccess: .crossDomain      // ❌ Rejected
    )
)
// This would fail validation
```

## Cross-Container Communication

### Connection Types

**Owner Shared** - Same human owner, different containers
```swift
await establishConnection(
    type: .ownerShared,
    verifyOwner: true  // Biometric verification required
)
```

**Trusted** - Explicitly trusted containers
```swift
await establishConnection(
    type: .trusted,
    requiresTrustEstablishment: true  // Manual approval
)
```

**Federated** - Public federation (encrypted)
```swift
await establishConnection(
    type: .federated,
    encryptionLevel: .maximum
)
```

### Shared Data Packet

```swift
public struct SharedDataPacket {
    let sourceContainerID: UUID
    let sourceOwnerID: UUID
    let concernDomainID: UUID
    let encryptedData: Data  // Double-encrypted
    let connectionType: ConnectionType
    let timestamp: Date
}
```

Data is:
1. **Encrypted in source** - With container key
2. **Re-encrypted for transit** - With connection key
3. **Signed** - Cryptographic signature
4. **Time-stamped** - For audit trail

## API Schema Generation

### OpenAPI 3.0 Generation

```swift
let openAPISpec = APISchemaGenerator.generateOpenAPISpec(
    for: container,
    plugins: [textFormatterPlugin, calculatorPlugin]
)
```

Output:
```yaml
openapi: 3.0.0
info:
  title: Personal AI Container API
  description: Carbon-based authentication required

security:
  - carbonBasedAuth: []

paths:
  /format:
    post:
      security:
        - carbonBasedAuth: []
      responses:
        '200':
          description: Success
        '401':
          description: Unauthorized - Carbon auth required
        '403':
          description: Forbidden - Insufficient permissions
```

### Swift Container Plugin Config

```swift
let containerConfig = APISchemaGenerator.generateContainerConfig(
    for: container
)
```

Output:
```json
{
    "base-image": "alpine:3.19",
    "static-linking": true,
    "env": {
        "CARBON_BASED_AUTH": "required",
        "OWNER_ID": "<uuid>",
        "SECURITY_LEVEL": "biometric"
    },
    "labels": {
        "com.luciverse.personal-ai": "true",
        "com.luciverse.carbon-based": "true"
    },
    "user": "1000:1000",
    "read-only-root": true,
    "security-opt": ["no-new-privileges:true"]
}
```

## Implementation Guide

### 1. Create Carbon-Based Entity

```swift
let owner = CarbonBasedEntity(
    id: UUID(),
    biometricHash: SHA256.hash(data: biometricData).hexString,
    verificationLevel: .biometric
)
```

### 2. Define Agent Domains

```swift
let textAgent = AgentDomain(
    name: "Text Generator",
    capabilities: [.textGeneration],
    dataAccessLevel: .readOnly,
    isolation: .strict
)

let analysisAgent = AgentDomain(
    name: "Data Analyst",
    capabilities: [.dataAnalysis, .databaseQuery],
    allowedConnections: [textAgent.id],
    dataAccessLevel: .readWrite,
    isolation: .collaborative
)
```

### 3. Define Concern Domains

```swift
let personalData = ConcernDomain(
    category: .personal,
    scope: .local,
    connectedAgents: [textAgent.id, analysisAgent.id],
    crossContainerPolicy: .isolated
)

let workData = ConcernDomain(
    category: .professional,
    scope: .shared,
    connectedAgents: [analysisAgent.id],
    crossContainerPolicy: .ownerOnly
)
```

### 4. Create Container

```swift
let container = PersonalAIContainer(
    owner: owner,
    agentDomains: [textAgent, analysisAgent],
    concernDomains: [personalData, workData],
    securityPolicy: .strict
)
```

### 5. Initialize Manager

```swift
let manager = ContainerInstanceManager()

let instanceID = try await manager.createInstance(
    for: owner,
    withConfig: .default,
    securityPolicy: .strict
)
```

### 6. Register Plugins

```swift
let pluginArch = PluginArchitecture(
    container: container,
    eventLoopGroup: eventLoopGroup
)

try await pluginArch.registerPlugin(
    schema: textFormatterPlugin,
    agentDomain: textAgent,
    handler: TextFormatterHandler()
)
```

### 7. Build Container Image

```swift
let imageRef = try await manager.buildContainerImage(
    for: instanceID,
    repository: "registry.luciverse.dev/personal-ai",
    tag: owner.id.uuidString
)
```

### 8. Deploy

```bash
# Built with Swift Container Plugin
swift package --swift-sdk x86_64-swift-linux-musl \
    build-container-image \
    --repository registry.luciverse.dev/personal-ai \
    --tag <owner-id>

# Run container
podman run -d \
    -p 8443:8443 \
    --name personal-ai-<owner-id> \
    registry.luciverse.dev/personal-ai:<owner-id>
```

## Security Guarantees

### ✅ What is Guaranteed

1. **Carbon-based ownership** - Only humans can create containers
2. **Biometric verification** - Required for sensitive operations
3. **Domain isolation** - Agents cannot escape their domains
4. **Encrypted data** - AES-256-GCM encryption at rest
5. **Audit logging** - All actions recorded
6. **Static linking** - No external dependencies
7. **Minimal permissions** - Least privilege principle
8. **Time-limited tokens** - Auto-expiring authentication

### ⚠️ User Responsibilities

1. **Protect biometric data** - Keep secure
2. **Review plugins** - Before installation
3. **Monitor logs** - Regular audit review
4. **Update regularly** - Security patches
5. **Backup data** - Encrypted backups

## References

- [API Schema Generator](../swift-bridge/Sources/PersonalAIContainer/APISchemaGenerator.swift)
- [Plugin Architecture](../swift-bridge/Sources/PersonalAIContainer/PluginArchitecture.swift)
- [Concern Domain Isolation](../swift-bridge/Sources/PersonalAIContainer/ConcernDomainIsolation.swift)
- [Container Instance Manager](../swift-bridge/Sources/PersonalAIContainer/ContainerInstanceManager.swift)
- [Swift Container Plugin Reference](knowledge/SWIFT-CONTAINER-PLUGIN-REFERENCE.md)

## License

Apache-2.0 - For security-first personal AI infrastructure
