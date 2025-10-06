# Swiftly Complete Reference

Complete knowledge base for Swiftly - the official Swift toolchain manager.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Commands Reference](#commands-reference)
4. [Environment Variables](#environment-variables)
5. [Configuration](#configuration)
6. [Usage Examples](#usage-examples)
7. [CI/CD Integration](#cicd-integration)

## Overview

### What is Swiftly?

Swiftly is the official CLI tool for installing, managing, and switching between Swift toolchains. It's:
- **Written in Swift** - Native performance and reliability
- **Community-driven** - Official Swift.org project
- **Cross-platform** - Linux and macOS support
- **First-class snapshots** - Full support for development snapshots
- **Self-contained** - Minimal system dependencies

### Version Information

- **Current Version**: 1.0.1 (Released March 2025)
- **Minimum Swift Version**: 5.9
- **License**: Apache-2.0
- **Repository**: https://github.com/swiftlang/swiftly

### Platform Support

**Supported Platforms:**
- macOS 13.0+ (arm64, x86_64)
- Linux distributions:
  - Ubuntu 20.04, 22.04, 24.04
  - Debian 10, 11, 12
  - RHEL 8, 9
  - Amazon Linux 2, 2023
  - Fedora

## Installation

### macOS Installation

#### Method 1: Download Package (Recommended)

```bash
# Download the package
curl -L https://download.swift.org/swiftly/swiftly-1.0.1.pkg -o swiftly.pkg

# Install to user home directory
installer -pkg swiftly.pkg -target CurrentUserHomeDirectory

# Initialize Swiftly and install latest Swift
~/.swiftly/bin/swiftly init

# Follow shell configuration instructions
```

#### Method 2: Homebrew

```bash
brew install swiftlang/tap/swiftly
swiftly init
```

### Linux Installation

```bash
# Download and run installer
curl -L https://swift.org/swiftly/install.sh | bash

# Source Swiftly environment
source "${SWIFTLY_HOME_DIR:-$HOME/.local/share/swiftly}/env.sh"

# Verify installation
swiftly --version
swift --version
```

### Custom Installation Location

```bash
# Set custom directories before installation
export SWIFTLY_HOME_DIR="$HOME/.swiftly"
export SWIFTLY_BIN_DIR="$HOME/.swiftly/bin"

# Then run installation
curl -L https://swift.org/swiftly/install.sh | bash
```

## Commands Reference

### Core Commands

#### `swiftly install`

Install Swift toolchains.

```bash
# Install latest stable release
swiftly install latest

# Install specific version
swiftly install 6.0.0

# Install and use immediately
swiftly install --use 6.0.0

# Install main development snapshot
swiftly install main-snapshot

# Install specific snapshot
swiftly install 6.1-snapshot
```

**Options:**
- `--use` - Set as active toolchain after installation
- `--post-install-file <path>` - Run script after installation
- `--overwrite` - Overwrite existing installation

#### `swiftly use`

Switch active Swift toolchain.

```bash
# Use specific version
swiftly use 6.0.0

# Use latest installed
swiftly use latest

# Use snapshot
swiftly use main-snapshot

# Temporary use for current shell
swiftly use --shell 5.10.0
```

**Options:**
- `--shell` - Only affect current shell session
- `--global` - Set system-wide default (requires sudo)

#### `swiftly list`

List installed toolchains.

```bash
# List installed toolchains
swiftly list

# Show with full details
swiftly list --verbose

# List available for installation
swiftly list-available
```

**Output format:**
```
* 6.0.0 (in use)
  5.10.0
  main-snapshot-2025-01-15
```

#### `swiftly update`

Update installed toolchains.

```bash
# Update all toolchains
swiftly update all

# Update specific toolchain
swiftly update 6.0.0

# Update snapshots only
swiftly update main-snapshot
```

#### `swiftly uninstall`

Remove installed toolchains.

```bash
# Uninstall specific version
swiftly uninstall 5.10.0

# Uninstall all toolchains
swiftly uninstall all

# Uninstall but keep currently active
swiftly uninstall all --except-active
```

#### `swiftly self-update`

Update Swiftly itself.

```bash
# Check for and install updates
swiftly self-update

# Check only (no installation)
swiftly self-update --check-only
```

#### `swiftly run`

Execute command with specific toolchain.

```bash
# Run swift with specific version
swiftly run 5.10.0 swift --version

# Build with specific toolchain
swiftly run 6.0.0 swift build -c release

# Run REPL with snapshot
swiftly run main-snapshot swift
```

### Advanced Commands

#### `swiftly which`

Show path to active Swift executable.

```bash
swiftly which swift
# Output: /home/user/.local/share/swiftly/toolchains/6.0.0/usr/bin/swift
```

#### `swiftly doctor`

Diagnose installation issues.

```bash
swiftly doctor

# Check specific toolchain
swiftly doctor 6.0.0
```

#### `swiftly config`

Manage Swiftly configuration.

```bash
# Show current configuration
swiftly config show

# Set configuration value
swiftly config set platform.verify-signatures true

# Reset to defaults
swiftly config reset
```

## Environment Variables

### Installation Directories

#### `SWIFTLY_HOME_DIR`
**Default**:
- macOS: `~/.swiftly`
- Linux: `~/.local/share/swiftly`

**Purpose**: Root directory for Swiftly data.

```bash
export SWIFTLY_HOME_DIR="$HOME/.swiftly"
```

**Structure:**
```
$SWIFTLY_HOME_DIR/
├── toolchains/          # Installed Swift toolchains
│   ├── 6.0.0/
│   ├── 5.10.0/
│   └── main-snapshot/
├── config.json          # Swiftly configuration
├── env.sh              # Environment setup script
└── tmp/                # Temporary downloads
```

#### `SWIFTLY_BIN_DIR`
**Default**:
- macOS: `~/.swiftly/bin`
- Linux: `~/.local/bin`

**Purpose**: Directory for Swiftly executables.

```bash
export SWIFTLY_BIN_DIR="$HOME/bin"
```

**Contents:**
```
$SWIFTLY_BIN_DIR/
├── swiftly             # Swiftly executable
├── swift               # Symlink to active Swift
├── swiftc              # Symlink to active swiftc
└── sourcekit-lsp       # Symlink to active sourcekit-lsp
```

### Network Configuration

#### `HTTPS_PROXY` / `HTTP_PROXY`
**Purpose**: Configure proxy for downloads.

```bash
export HTTPS_PROXY="http://proxy.company.com:8080"
export HTTP_PROXY="http://proxy.company.com:8080"
export NO_PROXY="localhost,127.0.0.1"
```

#### `SWIFTLY_DISABLE_SIGNATURE_VALIDATION`
**Default**: `false`

**Purpose**: Disable GPG signature verification (not recommended).

```bash
export SWIFTLY_DISABLE_SIGNATURE_VALIDATION=true
```

### Behavior Control

#### `SWIFTLY_QUIET`
**Default**: `false`

**Purpose**: Suppress non-error output.

```bash
export SWIFTLY_QUIET=true
swiftly install latest  # Silent installation
```

#### `SWIFTLY_ASSUME_YES`
**Default**: `false`

**Purpose**: Auto-answer yes to prompts.

```bash
export SWIFTLY_ASSUME_YES=true
swiftly uninstall all  # No confirmation prompt
```

## Configuration

### Configuration File

**Location**: `$SWIFTLY_HOME_DIR/config.json`

**Format**: JSON

**Example:**
```json
{
  "platform": {
    "verify-signatures": true,
    "install-dir": "/usr/local/swift"
  },
  "network": {
    "timeout": 300,
    "retry-count": 3
  },
  "behavior": {
    "quiet": false,
    "assume-yes": false
  }
}
```

### Shell Integration

Swiftly modifies shell configuration files to add itself to PATH:

**bash** (`~/.bashrc` or `~/.bash_profile`):
```bash
# swiftly - Managed by swiftly-init
if [ -f "$HOME/.local/share/swiftly/env.sh" ]; then
    source "$HOME/.local/share/swiftly/env.sh"
fi
# swiftly - End
```

**zsh** (`~/.zshrc`):
```zsh
# swiftly - Managed by swiftly-init
if [ -f "$HOME/.local/share/swiftly/env.sh" ]; then
    source "$HOME/.local/share/swiftly/env.sh"
fi
# swiftly - End
```

**fish** (`~/.config/fish/config.fish`):
```fish
# swiftly - Managed by swiftly-init
if test -f $HOME/.local/share/swiftly/env.fish
    source $HOME/.local/share/swiftly/env.fish
end
# swiftly - End
```

### `.swift-version` File

Use `.swift-version` for project-specific Swift versions:

```bash
# Create .swift-version in project root
echo "6.0.0" > .swift-version

# Swiftly automatically uses this version when in directory
cd my-project
swift --version  # Uses 6.0.0
```

## Usage Examples

### Development Workflow

```bash
# Install latest stable for production
swiftly install --use latest

# Install main snapshot for testing new features
swiftly install main-snapshot

# Work on production code
swiftly use 6.0.0
swift build -c release

# Test with latest snapshot
swiftly use main-snapshot
swift test

# Quick test without changing default
swiftly run main-snapshot swift test
```

### Multiple Projects

```bash
# Project A (stable Swift)
cd project-a
echo "6.0.0" > .swift-version
swift build

# Project B (bleeding edge)
cd project-b
echo "main-snapshot" > .swift-version
swift build
```

### Keeping Toolchains Updated

```bash
# Weekly maintenance script
#!/bin/bash

# Update Swiftly itself
swiftly self-update

# Update all installed toolchains
swiftly update all

# Clean up old snapshots
swiftly list | grep snapshot | head -n -2 | while read -r version; do
    swiftly uninstall "$version"
done
```

### CI/CD Usage

```bash
# Install specific version in CI
if ! command -v swiftly &> /dev/null; then
    curl -L https://swift.org/swiftly/install.sh | bash
    source ~/.local/share/swiftly/env.sh
fi

# Install project's Swift version
swiftly install --use $(cat .swift-version)

# Build and test
swift build -c release
swift test
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install Swiftly
        run: |
          curl -L https://swift.org/swiftly/install.sh | bash
          echo "$HOME/.local/bin" >> $GITHUB_PATH
          source ~/.local/share/swiftly/env.sh

      - name: Install Swift
        run: |
          swiftly install --use $(cat .swift-version || echo "latest")

      - name: Build
        run: swift build -c release

      - name: Test
        run: swift test
```

### GitLab CI

```yaml
image: ubuntu:22.04

variables:
  SWIFTLY_HOME_DIR: "$CI_PROJECT_DIR/.swiftly"
  SWIFTLY_BIN_DIR: "$CI_PROJECT_DIR/.swiftly/bin"

before_script:
  - apt-get update && apt-get install -y curl
  - curl -L https://swift.org/swiftly/install.sh | bash
  - source .swiftly/env.sh
  - swiftly install --use $(cat .swift-version || echo "latest")

build:
  script:
    - swift build -c release

test:
  script:
    - swift test
```

### Docker

```dockerfile
FROM ubuntu:22.04

# Install Swiftly
RUN apt-get update && apt-get install -y curl && \
    curl -L https://swift.org/swiftly/install.sh | bash && \
    rm -rf /var/lib/apt/lists/*

# Add Swiftly to PATH
ENV PATH="/root/.local/bin:${PATH}"

# Install Swift
RUN . /root/.local/share/swiftly/env.sh && \
    swiftly install --use latest

# Set working directory
WORKDIR /app

# Build project
COPY . .
RUN swift build -c release
```

## Uninstallation

### Complete Removal

```bash
# 1. Uninstall all toolchains (optional)
swiftly uninstall all

# 2. Remove Swiftly home directory
rm -rf ~/.local/share/swiftly  # Linux
rm -rf ~/.swiftly               # macOS

# 3. Remove Swiftly binaries
rm -rf ~/.local/bin/swiftly     # Linux
rm -rf ~/.swiftly/bin           # macOS

# 4. Remove shell configuration
# Edit ~/.bashrc, ~/.zshrc, etc. and remove swiftly sections

# 5. Restart shell
exec $SHELL
```

## Troubleshooting

### Swiftly not found after installation

```bash
# Source the environment file
source ~/.local/share/swiftly/env.sh  # Linux
source ~/.swiftly/env.sh               # macOS

# Or add to PATH manually
export PATH="$HOME/.local/bin:$PATH"
```

### Permission denied errors

```bash
# Ensure directories are writable
chmod -R u+w ~/.local/share/swiftly

# Check ownership
ls -la ~/.local/share/swiftly
```

### Signature verification failures

```bash
# Update GPG keys
swiftly self-update

# Or disable verification (not recommended)
export SWIFTLY_DISABLE_SIGNATURE_VALIDATION=true
```

### Network/proxy issues

```bash
# Set proxy environment variables
export HTTPS_PROXY="http://proxy:8080"
export HTTP_PROXY="http://proxy:8080"

# Increase timeout
swiftly config set network.timeout 600
```

## References

- **Official Site**: https://www.swift.org/install/
- **Documentation**: https://www.swift.org/swiftly/documentation/swiftlydocs/
- **GitHub**: https://github.com/swiftlang/swiftly
- **Announcement**: https://www.swift.org/blog/introducing-swiftly_10/
- **Design Document**: https://github.com/swiftlang/swiftly/blob/main/DESIGN.md

## License

Apache-2.0 License - See https://github.com/swiftlang/swiftly/blob/main/LICENSE
