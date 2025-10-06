# Swift Development Automation Guide

Complete guide for automated setup and management of Swift development infrastructure using Ansible, OpenTofu/Terraform, and custom automation scripts.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Ansible Automation](#ansible-automation)
4. [OpenTofu/Terraform Infrastructure](#opentofu-terraform-infrastructure)
5. [Automated SDK Generation](#automated-sdk-generation)
6. [CI/CD Integration](#cicd-integration)
7. [Troubleshooting](#troubleshooting)

## Overview

This project provides three complementary automation approaches:

### 1. **Ansible** - Configuration Management
- Installs and configures Swiftly
- Sets up Swift toolchains
- Configures shell environments
- Manages multiple servers/hosts

### 2. **OpenTofu/Terraform** - Infrastructure as Code
- Creates workspace structure
- Manages SDK generator installation
- Automates SDK generation
- Provides reproducible infrastructure

### 3. **Shell Scripts** - Operational Automation
- Quick SDK generation
- Development workflows
- Maintenance tasks

## Prerequisites

### Required Tools

```bash
# Ansible (for configuration management)
pip install ansible

# OpenTofu or Terraform (for infrastructure)
# OpenTofu (recommended, open-source)
brew install opentofu
# OR Terraform
brew install terraform

# Container runtime
brew install --cask docker  # or install Podman

# Git
brew install git
```

### System Requirements

- **macOS** 13.0+ or **Linux** (Ubuntu 20.04+, Debian 11+, RHEL 8+)
- 10GB free disk space
- Internet connection
- sudo access (for system dependencies)

## Ansible Automation

### Quick Start

```bash
# 1. Navigate to project
cd luci-metabase-mcp

# 2. Create inventory
mkdir -p ansible/inventory
cat > ansible/inventory/hosts <<EOF
[local]
localhost ansible_connection=local
EOF

# 3. Run playbook
ansible-playbook ansible/swiftly-setup.yml -i ansible/inventory/hosts
```

### Configuration Options

Edit `ansible/inventory/hosts` or use `-e` flag:

```bash
# Custom Swift version
ansible-playbook ansible/swiftly-setup.yml -i ansible/inventory/hosts \
    -e "swift_version=6.0.0"

# Multiple toolchains
ansible-playbook ansible/swiftly-setup.yml -i ansible/inventory/hosts \
    -e "swift_toolchains=['6.0.0', '5.10.0', 'main-snapshot']"

# Custom directories
ansible-playbook ansible/swiftly-setup.yml -i ansible/inventory/hosts \
    -e "swiftly_home_dir=$HOME/.swift" \
    -e "swiftly_bin_dir=$HOME/.swift/bin"

# Skip SDK generator installation
ansible-playbook ansible/swiftly-setup.yml -i ansible/inventory/hosts \
    --skip-tags sdk-generator
```

### Multi-Host Deployment

```yaml
# ansible/inventory/hosts
[development]
dev-mac ansible_host=192.168.1.100 ansible_user=developer

[production]
prod-server-1 ansible_host=10.0.1.10 ansible_user=deploy
prod-server-2 ansible_host=10.0.1.11 ansible_user=deploy

[all:vars]
ansible_python_interpreter=/usr/bin/python3
swift_version=6.0.0
```

```bash
# Deploy to all hosts
ansible-playbook ansible/swiftly-setup.yml -i ansible/inventory/hosts

# Deploy to specific group
ansible-playbook ansible/swiftly-setup.yml -i ansible/inventory/hosts \
    --limit production

# Deploy to specific host
ansible-playbook ansible/swiftly-setup.yml -i ansible/inventory/hosts \
    --limit prod-server-1
```

### Proxy Configuration

```bash
ansible-playbook ansible/swiftly-setup.yml -i ansible/inventory/hosts \
    -e "https_proxy=http://proxy.company.com:8080" \
    -e "http_proxy=http://proxy.company.com:8080" \
    -e "no_proxy=localhost,127.0.0.1,.company.local"
```

## OpenTofu/Terraform Infrastructure

### Initial Setup

```bash
# 1. Navigate to terraform directory
cd terraform

# 2. Copy example variables
cp terraform.tfvars.example terraform.tfvars

# 3. Edit variables
vim terraform.tfvars

# 4. Initialize
tofu init  # or: terraform init

# 5. Plan changes
tofu plan  # or: terraform plan

# 6. Apply
tofu apply  # or: terraform apply
```

### Configuration Variables

Edit `terraform/terraform.tfvars`:

```hcl
# Environment
environment = "development"

# Swift version
swift_version = "6.0.0"

# Enable static SDK
enable_static_sdk = true

# Target distributions
sdk_target_distributions = [
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

# Container runtime
container_runtime = "docker"

# Workspace path
workspace_path = "~/.luci-swift-workspace"

# Extra libraries
extra_libraries = [
  "libssl-dev",
  "libcurl4-openssl-dev",
  "zlib1g-dev"
]

# Auto-generate SDKs
auto_generate_sdks = true
```

### Common Operations

```bash
# View planned changes
tofu plan

# Apply changes
tofu apply

# Apply with auto-approve
tofu apply -auto-approve

# Destroy infrastructure
tofu destroy

# Show current state
tofu show

# List outputs
tofu output

# Get specific output
tofu output workspace_path
```

### Generated Outputs

After `tofu apply`, you'll get:

```bash
# Source the environment
source $(tofu output -raw environment_script)

# View all outputs
tofu output

# Outputs include:
# - workspace_path: Workspace directory
# - sdk_output_path: Generated SDKs location
# - sdk_generator_path: Generator executable path
# - environment_script: Environment setup script
# - generated_sdks: List of configured SDKs
# - usage_instructions: Quick start guide
```

### Advanced Usage

#### Custom Distributions

```hcl
# terraform/custom.tfvars
sdk_target_distributions = [
  {
    name    = "ubuntu"
    version = "24.04"
    arch    = "x86_64"
  },
  {
    name    = "amazonlinux"
    version = "2023"
    arch    = "aarch64"
  },
  {
    name    = "rhel"
    version = "9"
    arch    = "x86_64"
  }
]
```

```bash
tofu apply -var-file=custom.tfvars
```

#### Multiple Environments

```bash
# Development
tofu workspace new development
tofu apply -var="environment=development"

# Production
tofu workspace new production
tofu apply -var="environment=production"

# List workspaces
tofu workspace list

# Switch workspace
tofu workspace select development
```

## Automated SDK Generation

### Using the Automation Script

```bash
# Navigate to project root
cd luci-metabase-mcp

# Generate default SDKs
./scripts/auto-generate-sdks.sh

# Generate specific SDKs
./scripts/auto-generate-sdks.sh \
    ubuntu:22.04:x86_64 \
    debian:12:aarch64 \
    amazonlinux:2023:x86_64

# Parallel generation
./scripts/auto-generate-sdks.sh --parallel --max-parallel 4

# Generate and install
./scripts/auto-generate-sdks.sh --install

# List generated SDKs
./scripts/auto-generate-sdks.sh --list

# Custom workspace
./scripts/auto-generate-sdks.sh --workspace /custom/path

# Help
./scripts/auto-generate-sdks.sh --help
```

### Scheduled SDK Updates

Create a cron job for automatic updates:

```bash
# Edit crontab
crontab -e

# Add weekly SDK regeneration (Sundays at 2 AM)
0 2 * * 0 /path/to/luci-metabase-mcp/scripts/auto-generate-sdks.sh --install >> /var/log/sdk-gen.log 2>&1
```

Or use launchd on macOS:

```xml
<!-- ~/Library/LaunchAgents/com.luciverse.sdk-generator.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.luciverse.sdk-generator</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/luci-metabase-mcp/scripts/auto-generate-sdks.sh</string>
        <string>--install</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key>
        <integer>0</integer>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/sdk-generator.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/sdk-generator.error.log</string>
</dict>
</plist>
```

Load the agent:
```bash
launchctl load ~/Library/LaunchAgents/com.luciverse.sdk-generator.plist
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/sdk-generation.yml`:

```yaml
name: Generate Swift SDKs

on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sundays at 2 AM
  workflow_dispatch:  # Manual trigger

jobs:
  generate-sdks:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Swiftly
        run: |
          curl -L https://swift.org/swiftly/install.sh | bash
          echo "$HOME/.local/bin" >> $GITHUB_PATH
          source ~/.local/share/swiftly/env.sh
          swiftly install latest

      - name: Run Ansible Playbook
        run: |
          pip install ansible
          ansible-playbook ansible/swiftly-setup.yml \
            -i ansible/inventory/hosts \
            --tags sdk-generator

      - name: Generate SDKs
        run: |
          source ~/.local/share/swiftly/env.sh
          ./scripts/auto-generate-sdks.sh --install

      - name: Upload SDK Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: swift-sdks
          path: ~/.luci-swift-workspace/sdks/**/*.artifactbundle
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
stages:
  - setup
  - generate
  - deploy

variables:
  WORKSPACE_PATH: "$CI_PROJECT_DIR/.swift-workspace"

setup:swiftly:
  stage: setup
  script:
    - curl -L https://swift.org/swiftly/install.sh | bash
    - source ~/.local/share/swiftly/env.sh
    - swiftly install latest
  artifacts:
    paths:
      - ~/.local/share/swiftly
    expire_in: 1 day

generate:sdks:
  stage: generate
  dependencies:
    - setup:swiftly
  script:
    - source ~/.local/share/swiftly/env.sh
    - ./scripts/auto-generate-sdks.sh \
        --workspace $WORKSPACE_PATH \
        --install
  artifacts:
    paths:
      - $WORKSPACE_PATH/sdks
    expire_in: 30 days

deploy:sdks:
  stage: deploy
  dependencies:
    - generate:sdks
  script:
    - # Upload to artifact repository
    - # Example: Upload to S3, Artifactory, etc.
  only:
    - main
```

### Jenkins Pipeline

Create `Jenkinsfile`:

```groovy
pipeline {
    agent any

    parameters {
        booleanParam(name: 'INSTALL_SDKS', defaultValue: true, description: 'Install generated SDKs')
        booleanParam(name: 'PARALLEL_BUILD', defaultValue: true, description: 'Enable parallel builds')
    }

    environment {
        WORKSPACE_PATH = "${env.HOME}/.luci-swift-workspace"
    }

    stages {
        stage('Setup') {
            steps {
                sh '''
                    curl -L https://swift.org/swiftly/install.sh | bash
                    source ~/.local/share/swiftly/env.sh
                    swiftly install latest
                '''
            }
        }

        stage('Generate SDKs') {
            steps {
                script {
                    def installFlag = params.INSTALL_SDKS ? '--install' : ''
                    def parallelFlag = params.PARALLEL_BUILD ? '--parallel' : ''

                    sh """
                        source ~/.local/share/swiftly/env.sh
                        ./scripts/auto-generate-sdks.sh ${parallelFlag} ${installFlag}
                    """
                }
            }
        }

        stage('Archive') {
            steps {
                archiveArtifacts artifacts: '**/.luci-swift-workspace/sdks/**/*.artifactbundle',
                                 fingerprint: true
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
```

## Workflow Examples

### Complete Setup from Scratch

```bash
# 1. Clone repository
git clone https://github.com/your-org/luci-metabase-mcp.git
cd luci-metabase-mcp

# 2. Setup with Ansible
ansible-playbook ansible/swiftly-setup.yml -i ansible/inventory/hosts

# 3. Generate SDKs with automation script
./scripts/auto-generate-sdks.sh --install

# 4. Or use OpenTofu for infrastructure
cd terraform
tofu init
tofu apply

# 5. Source environment
source ~/.luci-swift-workspace/env.sh

# 6. Verify
swift sdk list
```

### Development Workflow

```bash
# Daily: Update toolchain
swiftly update all

# Weekly: Regenerate SDKs
./scripts/auto-generate-sdks.sh --install

# As needed: Generate specific SDK
swift-sdk-generator make-linux-sdk \
    --with-docker \
    --distribution-name ubuntu \
    --distribution-version 22.04
```

### Team Onboarding

```bash
# New team member setup
git clone https://github.com/your-org/luci-metabase-mcp.git
cd luci-metabase-mcp

# One-command setup
./scripts/setup-toolchain.sh

# Generate team-standard SDKs
./scripts/auto-generate-sdks.sh --install

# Verify
./scripts/verify-dependencies.sh
```

## Troubleshooting

### Ansible Issues

**Problem**: "Permission denied" errors

```bash
# Solution: Add become password
ansible-playbook ansible/swiftly-setup.yml -i ansible/inventory/hosts --ask-become-pass
```

**Problem**: Swiftly already installed

```bash
# Solution: Force reinstallation
ansible-playbook ansible/swiftly-setup.yml -i ansible/inventory/hosts -e "force_install=true"
```

### OpenTofu/Terraform Issues

**Problem**: State file locked

```bash
# Solution: Force unlock (use with caution)
tofu force-unlock <lock-id>
```

**Problem**: Workspace already exists

```bash
# Solution: Import existing workspace
tofu import local_file.workspace_structure ~/.luci-swift-workspace
```

### SDK Generation Issues

**Problem**: Container runtime not found

```bash
# Solution: Specify runtime explicitly
CONTAINER_RUNTIME=podman ./scripts/auto-generate-sdks.sh
```

**Problem**: Insufficient disk space

```bash
# Solution: Clean old SDKs
rm -rf ~/.luci-swift-workspace/sdks/*
rm -rf ~/.luci-swift-workspace/cache/*
```

## Best Practices

### 1. Version Control

```bash
# Track automation configuration
git add ansible/ terraform/ scripts/
git commit -m "Update automation config"

# Don't track generated files
echo "~/.luci-swift-workspace/" >> .gitignore
echo "terraform/.terraform/" >> .gitignore
echo "terraform/terraform.tfstate" >> .gitignore
```

### 2. Reproducibility

```bash
# Pin Swift versions
echo "6.0.0" > .swift-version

# Pin SDK configurations
git add terraform/terraform.tfvars

# Document in README
echo "Run: ./scripts/auto-generate-sdks.sh" >> README.md
```

### 3. Security

```bash
# Don't commit sensitive data
echo "terraform/terraform.tfvars" >> .gitignore

# Use secrets management
export PROXY_PASSWORD=$(security find-generic-password -a $USER -s proxy -w)
```

### 4. Monitoring

```bash
# Enable logging
./scripts/auto-generate-sdks.sh 2>&1 | tee -a ~/.luci-swift-workspace/logs/sdk-gen-$(date +%Y%m%d).log

# Monitor disk usage
du -sh ~/.luci-swift-workspace/*
```

## References

- [Ansible Documentation](https://docs.ansible.com/)
- [OpenTofu Documentation](https://opentofu.org/docs/)
- [Terraform Documentation](https://developer.hashicorp.com/terraform/docs)
- [Swiftly Reference](knowledge/SWIFTLY-REFERENCE.md)
- [Swift SDK Generator Reference](knowledge/SWIFT-SDK-GENERATOR-REFERENCE.md)

## License

Apache-2.0 - See [LICENSE](../LICENSE) for details.
