# Makefile for Luci Hashgraph Nodes Repository Management

.PHONY: help clone update setup-auto watch status logs clean

SCRIPTS_DIR := scripts
REPOS_DIR := repos
LOGS_DIR := logs

help: ## Show this help message
	@echo 'Luci Hashgraph Nodes Repository Management'
	@echo ''
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

clone: ## Clone all Hashgraph repositories
	@echo "Cloning all Hashgraph organization repositories..."
	@bash $(SCRIPTS_DIR)/clone-all-repos.sh

update: ## Update all repositories
	@echo "Updating all repositories..."
	@bash $(SCRIPTS_DIR)/update-repos.sh

setup-auto: ## Setup automatic updates (launchd)
	@echo "Setting up automatic updates..."
	@bash $(SCRIPTS_DIR)/setup-auto-update.sh

watch: ## Start watching repositories for changes
	@echo "Starting repository watcher..."
	@bash $(SCRIPTS_DIR)/watch-repos.sh

status: ## Show git status of all repositories
	@echo "Repository Status:"
	@for dir in $(REPOS_DIR)/*; do \
		if [ -d "$$dir/.git" ]; then \
			echo ""; \
			echo "=== $$(basename $$dir) ==="; \
			cd "$$dir" && git status -s && cd - > /dev/null; \
		fi \
	done

logs: ## View auto-update logs
	@tail -f $(LOGS_DIR)/auto-update.log

logs-error: ## View auto-update error logs
	@tail -f $(LOGS_DIR)/auto-update.error.log

list: ## List all cloned repositories
	@echo "Cloned repositories:"
	@ls -1 $(REPOS_DIR) 2>/dev/null || echo "No repositories cloned yet"

count: ## Count repositories
	@echo "Total repositories: $$(ls -1 $(REPOS_DIR) 2>/dev/null | wc -l | tr -d ' ')"

fetch-all: ## Fetch updates for all repos without merging
	@echo "Fetching all repositories..."
	@for dir in $(REPOS_DIR)/*; do \
		if [ -d "$$dir/.git" ]; then \
			echo "Fetching $$(basename $$dir)..."; \
			cd "$$dir" && git fetch --all && cd - > /dev/null; \
		fi \
	done

pull-all: update ## Alias for update (pull all repos)

stop-auto: ## Stop automatic update service
	@echo "Stopping automatic update service..."
	@launchctl unload ~/Library/LaunchAgents/com.luci.hashgraph.auto-update.plist 2>/dev/null || echo "Service not loaded"

start-auto: ## Start automatic update service
	@echo "Starting automatic update service..."
	@launchctl load ~/Library/LaunchAgents/com.luci.hashgraph.auto-update.plist 2>/dev/null || echo "Service already loaded"

check-auto: ## Check automatic update service status
	@echo "Checking service status..."
	@launchctl list | grep luci.hashgraph || echo "Service not running"

clean-logs: ## Clean log files
	@echo "Cleaning logs..."
	@rm -f $(LOGS_DIR)/*.log
	@echo "Logs cleaned"

clean: ## Remove all cloned repositories (WARNING: destructive)
	@echo "WARNING: This will delete all cloned repositories!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo ""; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		rm -rf $(REPOS_DIR)/*; \
		echo "Repositories removed"; \
	else \
		echo "Cancelled"; \
	fi

install: clone setup-auto ## Full installation (clone + setup auto-updates)
	@echo ""
	@echo "Installation complete!"
	@echo "Repositories will automatically update every hour"

.DEFAULT_GOAL := help
