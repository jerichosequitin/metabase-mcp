# Makefile for Luci-Metabase-MCP Bridge Runtime
# Supports both Podman and Docker

.PHONY: help build run stop clean test swift-setup logs shell

# Detect container runtime
CONTAINER_CMD := $(shell command -v podman 2> /dev/null || command -v docker 2> /dev/null)
COMPOSE_CMD := $(shell command -v podman-compose 2> /dev/null || command -v docker-compose 2> /dev/null)

# Configuration
IMAGE_NAME ?= luci-metabase-mcp-bridge
IMAGE_TAG ?= latest
CONTAINER_NAME ?= luci-mcp-bridge

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

build: ## Build container image
	@echo "Building container with $(CONTAINER_CMD)..."
	@bash scripts/build-container.sh all

build-swift: ## Build Swift bridge only
	@echo "Building Swift bridge..."
	@bash scripts/build-container.sh swift

build-node: ## Build Node.js MCP server only
	@echo "Building Node.js server..."
	@bash scripts/build-container.sh node

run: ## Run container in standalone mode
	@echo "Running container..."
	@bash scripts/run-container.sh standalone

run-compose: ## Run with compose (all services)
	@echo "Running with compose..."
	@bash scripts/run-container.sh compose

run-swift: ## Run with Swift bridge enabled
	@echo "Running with Swift bridge..."
	@bash scripts/run-container.sh swift

run-dev: ## Run in development mode
	@echo "Running in development mode..."
	@bash scripts/run-container.sh dev

stop: ## Stop running containers
	@echo "Stopping containers..."
	@$(COMPOSE_CMD) down 2>/dev/null || $(CONTAINER_CMD) stop $(CONTAINER_NAME) 2>/dev/null || true

clean: ## Clean containers, images, and volumes
	@echo "Cleaning up..."
	@$(COMPOSE_CMD) down -v 2>/dev/null || true
	@$(CONTAINER_CMD) rm -f $(CONTAINER_NAME) 2>/dev/null || true
	@$(CONTAINER_CMD) rmi $(IMAGE_NAME):$(IMAGE_TAG) 2>/dev/null || true
	@rm -rf data/ logs/ cache/

clean-all: clean ## Clean everything including Swift build artifacts
	@echo "Deep cleaning..."
	@cd swift-bridge && swift package clean 2>/dev/null || true
	@rm -rf swift-bridge/.build/

test: ## Run tests
	@echo "Running tests..."
	@npm test

test-coverage: ## Run tests with coverage
	@echo "Running tests with coverage..."
	@npm run test:coverage

swift-setup: ## Setup Swift bridge components
	@echo "Setting up Swift bridge..."
	@bash scripts/setup-swift-bridge.sh

swift-build: ## Build Swift bridge locally
	@echo "Building Swift bridge..."
	@cd swift-bridge && swift build -c release

swift-test: ## Run Swift bridge tests
	@echo "Running Swift tests..."
	@cd swift-bridge && swift test

logs: ## Show container logs
	@$(COMPOSE_CMD) logs -f 2>/dev/null || $(CONTAINER_CMD) logs -f $(CONTAINER_NAME) 2>/dev/null

logs-mcp: ## Show MCP server logs
	@$(COMPOSE_CMD) logs -f mcp-server

logs-swift: ## Show Swift bridge logs
	@$(COMPOSE_CMD) logs -f swift-bridge

shell: ## Open shell in container
	@bash scripts/run-container.sh shell

ps: ## Show running containers
	@$(COMPOSE_CMD) ps 2>/dev/null || $(CONTAINER_CMD) ps --filter name=$(CONTAINER_NAME)

env-setup: ## Create .env from template
	@if [ ! -f .env ]; then \
		cp .env.container .env; \
		echo "Created .env file - please edit with your configuration"; \
	else \
		echo ".env file already exists"; \
	fi

validate: ## Validate configuration and environment
	@echo "Validating environment..."
	@test -f .env || (echo "Error: .env file not found. Run 'make env-setup'" && exit 1)
	@echo "Environment configuration valid"

install: env-setup build ## Complete installation (setup env + build)
	@echo "Installation complete"
	@echo "Next steps:"
	@echo "  1. Edit .env with your Metabase configuration"
	@echo "  2. Run 'make run' to start the server"

.DEFAULT_GOAL := help
