# Variables for Swift SDK Generator Infrastructure
# OpenTofu/Terraform Configuration

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "development"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production"
  }
}

variable "swift_version" {
  description = "Swift version to install and use"
  type        = string
  default     = "6.0.0"

  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+\\.[0-9]+$|^latest$|^main-snapshot$", var.swift_version))
    error_message = "Swift version must be in format X.Y.Z, 'latest', or 'main-snapshot'"
  }
}

variable "enable_static_sdk" {
  description = "Install and configure Swift Static Linux SDK for musl-based static linking"
  type        = bool
  default     = true
}

variable "sdk_target_distributions" {
  description = "List of Linux distributions to generate SDKs for"
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

  validation {
    condition = alltrue([
      for dist in var.sdk_target_distributions :
      contains(["ubuntu", "debian", "rhel", "fedora", "amazonlinux"], dist.name)
    ])
    error_message = "Distribution name must be one of: ubuntu, debian, rhel, fedora, amazonlinux"
  }

  validation {
    condition = alltrue([
      for dist in var.sdk_target_distributions :
      contains(["x86_64", "aarch64", "armv7"], dist.arch)
    ])
    error_message = "Architecture must be one of: x86_64, aarch64, armv7"
  }
}

variable "container_runtime" {
  description = "Container runtime to use for SDK generation"
  type        = string
  default     = "docker"

  validation {
    condition     = contains(["docker", "podman"], var.container_runtime)
    error_message = "Container runtime must be either 'docker' or 'podman'"
  }
}

variable "workspace_path" {
  description = "Path to workspace directory for Swift development"
  type        = string
  default     = "~/.luci-swift-workspace"
}

variable "extra_libraries" {
  description = "Additional system libraries to include in generated SDKs"
  type        = list(string)
  default = [
    "libssl-dev",
    "libcurl4-openssl-dev",
    "zlib1g-dev",
    "libsqlite3-dev"
  ]
}

variable "enable_docker_container" {
  description = "Create persistent Docker container for SDK generation"
  type        = bool
  default     = false
}

variable "auto_generate_sdks" {
  description = "Automatically generate SDKs on terraform apply"
  type        = bool
  default     = false
}

variable "proxy_settings" {
  description = "HTTP/HTTPS proxy settings for downloads"
  type = object({
    http_proxy  = string
    https_proxy = string
    no_proxy    = string
  })
  default = {
    http_proxy  = ""
    https_proxy = ""
    no_proxy    = "localhost,127.0.0.1"
  }
  sensitive = true
}
