# OpenTofu/Terraform Configuration for Swift Development Infrastructure
# Purpose: Automated provisioning of Swift SDK generator infrastructure
# Supports: AWS EC2, DigitalOcean, and local Docker/Podman
# Version: 1.0.0

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

# ============================================================================
# Variables
# ============================================================================

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "development"
}

variable "swift_version" {
  description = "Swift version to install"
  type        = string
  default     = "6.0.0"
}

variable "enable_static_sdk" {
  description = "Install Swift Static Linux SDK"
  type        = bool
  default     = true
}

variable "sdk_target_distributions" {
  description = "Linux distributions to generate SDKs for"
  type = list(object({
    name    = string
    version = string
    arch    = string
  }))
  default = [
    {
      name    = "ubuntu"
      version = "22.04"
      arch    = "x86_64"
    },
    {
      name    = "ubuntu"
      version = "22.04"
      arch    = "aarch64"
    },
    {
      name    = "debian"
      version = "12"
      arch    = "x86_64"
    }
  ]
}

variable "container_runtime" {
  description = "Container runtime to use (docker or podman)"
  type        = string
  default     = "docker"
}

variable "workspace_path" {
  description = "Path to workspace directory"
  type        = string
  default     = "~/.luci-swift-workspace"
}

# ============================================================================
# Local Development Configuration
# ============================================================================

locals {
  workspace_path = pathexpand(var.workspace_path)
  sdk_output_path = "${local.workspace_path}/sdks"
  tools_path      = "${local.workspace_path}/tools"

  # Container configuration
  container_labels = {
    environment = var.environment
    managed_by  = "opentofu"
    project     = "luci-metabase-mcp"
  }
}

# ============================================================================
# Workspace Directory Structure
# ============================================================================

resource "local_file" "workspace_structure" {
  for_each = toset([
    "sdks",
    "sdks/x86_64",
    "sdks/aarch64",
    "tools",
    "logs",
    "cache"
  ])

  filename = "${local.workspace_path}/${each.key}/.keep"
  content  = "# Managed by OpenTofu - Do not delete\n"

  provisioner "local-exec" {
    command = "mkdir -p ${local.workspace_path}/${each.key}"
  }
}

# ============================================================================
# Swift SDK Generator Installation
# ============================================================================

resource "null_resource" "swift_sdk_generator" {
  triggers = {
    tools_path = local.tools_path
  }

  provisioner "local-exec" {
    command = <<-EOT
      #!/bin/bash
      set -e

      TOOLS_PATH="${local.tools_path}"
      SDK_GEN_PATH="$TOOLS_PATH/swift-sdk-generator"

      # Clone or update swift-sdk-generator
      if [ -d "$SDK_GEN_PATH" ]; then
        echo "Updating swift-sdk-generator..."
        cd "$SDK_GEN_PATH"
        git pull origin main
      else
        echo "Cloning swift-sdk-generator..."
        git clone https://github.com/swiftlang/swift-sdk-generator.git "$SDK_GEN_PATH"
      fi

      # Build swift-sdk-generator
      cd "$SDK_GEN_PATH"
      swift build -c release

      echo "swift-sdk-generator installed at: $SDK_GEN_PATH/.build/release/swift-sdk-generator"
    EOT
  }

  depends_on = [local_file.workspace_structure]
}

# ============================================================================
# Generate Swift SDKs
# ============================================================================

resource "null_resource" "generate_sdk" {
  for_each = {
    for idx, dist in var.sdk_target_distributions :
    "${dist.name}-${dist.version}-${dist.arch}" => dist
  }

  triggers = {
    distribution = each.value.name
    version      = each.value.version
    arch         = each.value.arch
    sdk_gen_id   = null_resource.swift_sdk_generator.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      #!/bin/bash
      set -e

      SDK_GEN="${local.tools_path}/swift-sdk-generator/.build/release/swift-sdk-generator"
      OUTPUT_DIR="${local.sdk_output_path}/${each.value.arch}"
      DIST_NAME="${each.value.name}"
      DIST_VERSION="${each.value.version}"
      TARGET_ARCH="${each.value.arch}"

      echo "Generating SDK for $DIST_NAME $DIST_VERSION ($TARGET_ARCH)..."

      $SDK_GEN make-linux-sdk \
        --with-docker \
        --distribution-name "$DIST_NAME" \
        --distribution-version "$DIST_VERSION" \
        --target-arch "$TARGET_ARCH" \
        --output-path "$OUTPUT_DIR" \
        2>&1 | tee "${local.workspace_path}/logs/sdk-${each.key}.log"

      echo "SDK generated successfully: $OUTPUT_DIR"
    EOT
  }

  depends_on = [null_resource.swift_sdk_generator]
}

# ============================================================================
# Docker Container for SDK Generation (Alternative)
# ============================================================================

resource "docker_image" "swift_builder" {
  count = var.container_runtime == "docker" ? 1 : 0
  name  = "swift:6.0-jammy"

  keep_locally = true
}

resource "docker_container" "swift_sdk_builder" {
  count = var.container_runtime == "docker" ? 1 : 0

  name  = "luci-swift-sdk-builder-${var.environment}"
  image = docker_image.swift_builder[0].image_id

  command = ["sleep", "infinity"]

  labels {
    label = "environment"
    value = var.environment
  }

  labels {
    label = "managed_by"
    value = "opentofu"
  }

  volumes {
    host_path      = local.workspace_path
    container_path = "/workspace"
  }

  volumes {
    host_path      = "${local.tools_path}/swift-sdk-generator"
    container_path = "/sdk-generator"
  }

  restart = "unless-stopped"

  healthcheck {
    test     = ["CMD", "swift", "--version"]
    interval = "30s"
    timeout  = "3s"
    retries  = 3
  }
}

# ============================================================================
# Configuration Files
# ============================================================================

resource "local_file" "sdk_generator_config" {
  filename = "${local.workspace_path}/.swift-sdk-generator.json"
  content = jsonencode({
    linux = {
      default-distribution = "ubuntu"
      default-version      = "22.04"
      docker-enabled       = true
      extra-libraries = [
        "libssl-dev",
        "libcurl4-openssl-dev",
        "zlib1g-dev",
        "libsqlite3-dev"
      ]
    }
    swift = {
      version         = var.swift_version
      static-stdlib   = true
      enable-testing  = true
    }
    output = {
      path          = local.sdk_output_path
      bundle-format = "tar.gz"
    }
  })
}

resource "local_file" "swiftly_config" {
  filename = "${local.workspace_path}/.swiftly-config.json"
  content = jsonencode({
    platform = {
      verify-signatures = true
    }
    toolchains = {
      default = var.swift_version
      install = [
        var.swift_version,
        "main-snapshot"
      ]
    }
    sdks = {
      auto-install-static = var.enable_static_sdk
    }
  })
}

resource "local_file" "environment_script" {
  filename = "${local.workspace_path}/env.sh"
  content  = <<-EOT
    #!/bin/bash
    # Swift Development Environment
    # Generated by OpenTofu - Managed automatically

    export SWIFT_VERSION="${var.swift_version}"
    export SWIFTLY_HOME_DIR="$HOME/.local/share/swiftly"
    export SWIFTLY_BIN_DIR="$HOME/.local/bin"
    export SWIFT_SDK_GENERATOR_PATH="${local.tools_path}/swift-sdk-generator/.build/release/swift-sdk-generator"
    export SWIFT_SDK_OUTPUT_PATH="${local.sdk_output_path}"
    export WORKSPACE_PATH="${local.workspace_path}"

    # Add to PATH
    export PATH="$SWIFTLY_BIN_DIR:${local.tools_path}/swift-sdk-generator/.build/release:$PATH"

    # Container runtime
    export SWIFT_SDK_GENERATOR_CONTAINER_RUNTIME="${var.container_runtime}"

    # Convenience aliases
    alias swift-sdk-gen="$SWIFT_SDK_GENERATOR_PATH"
    alias sdk-list="swift sdk list"
    alias sdk-use="swift build --swift-sdk"

    echo "Swift development environment loaded"
    echo "Swift Version: $SWIFT_VERSION"
    echo "Workspace: $WORKSPACE_PATH"
    echo ""
    echo "Available commands:"
    echo "  swift-sdk-gen   - Run SDK generator"
    echo "  sdk-list        - List installed SDKs"
    echo "  sdk-use <id>    - Build with specific SDK"
  EOT

  file_permission = "0755"
}

resource "local_file" "makefile_include" {
  filename = "${local.workspace_path}/Makefile.inc"
  content  = <<-EOT
    # Swift SDK Generator Makefile Include
    # Generated by OpenTofu

    WORKSPACE_PATH := ${local.workspace_path}
    SDK_GENERATOR := ${local.tools_path}/swift-sdk-generator/.build/release/swift-sdk-generator
    SDK_OUTPUT_PATH := ${local.sdk_output_path}

    .PHONY: sdk-ubuntu-x86_64 sdk-ubuntu-aarch64 sdk-all

    sdk-ubuntu-x86_64:
    	@echo "Generating Ubuntu 22.04 x86_64 SDK..."
    	@$(SDK_GENERATOR) make-linux-sdk \
    		--with-docker \
    		--distribution-name ubuntu \
    		--distribution-version 22.04 \
    		--target-arch x86_64 \
    		--output-path $(SDK_OUTPUT_PATH)/x86_64

    sdk-ubuntu-aarch64:
    	@echo "Generating Ubuntu 22.04 aarch64 SDK..."
    	@$(SDK_GENERATOR) make-linux-sdk \
    		--with-docker \
    		--distribution-name ubuntu \
    		--distribution-version 22.04 \
    		--target-arch aarch64 \
    		--output-path $(SDK_OUTPUT_PATH)/aarch64

    sdk-all: sdk-ubuntu-x86_64 sdk-ubuntu-aarch64
    	@echo "All SDKs generated successfully"
  EOT
}

# ============================================================================
# Outputs
# ============================================================================

output "workspace_path" {
  description = "Path to Swift development workspace"
  value       = local.workspace_path
}

output "sdk_output_path" {
  description = "Path to generated SDKs"
  value       = local.sdk_output_path
}

output "sdk_generator_path" {
  description = "Path to swift-sdk-generator executable"
  value       = "${local.tools_path}/swift-sdk-generator/.build/release/swift-sdk-generator"
}

output "environment_script" {
  description = "Path to environment setup script"
  value       = "${local.workspace_path}/env.sh"
}

output "generated_sdks" {
  description = "List of SDKs configured for generation"
  value = [
    for dist in var.sdk_target_distributions :
    "${dist.name}-${dist.version}-${dist.arch}"
  ]
}

output "usage_instructions" {
  description = "Instructions for using the workspace"
  value       = <<-EOT
    ╔════════════════════════════════════════════════════════╗
    ║  Swift SDK Generator Infrastructure Ready              ║
    ╚════════════════════════════════════════════════════════╝

    Workspace: ${local.workspace_path}

    Setup:
      source ${local.workspace_path}/env.sh

    Generate SDKs:
      cd ${local.workspace_path}
      make -f Makefile.inc sdk-all

    Or manually:
      swift-sdk-gen make-linux-sdk \
        --with-docker \
        --distribution-name ubuntu \
        --distribution-version 22.04

    List SDKs:
      swift sdk list

    Build with SDK:
      swift build --swift-sdk x86_64-unknown-linux-gnu_ubuntu22.04

    View logs:
      tail -f ${local.workspace_path}/logs/*.log
  EOT
}
