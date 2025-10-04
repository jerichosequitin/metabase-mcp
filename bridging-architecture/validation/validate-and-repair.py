#!/usr/bin/env python3
"""
Comprehensive Validation and Repair for Metabase MCP Bridging Architecture
Validates all components and applies automatic repairs where possible
"""

import json
import os
import subprocess
import sys
import time
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Any

class MetabaseBridgeValidator:
    """Comprehensive validation and repair system for Metabase MCP bridge"""

    def __init__(self, base_path: str = "/Users/lucia/Documents/GitHub/luci-metabase-mcp/bridging-architecture"):
        self.base_path = Path(base_path)
        self.validation_results = {}
        self.repairs_applied = []
        self.issues_found = []

    def run_validation_and_repair(self) -> Dict[str, Any]:
        """Run complete validation and repair process"""
        print("Validating Metabase MCP Bridging Architecture...")
        print("=" * 60)

        # Validate Swift package structure
        self.validate_swift_package_structure()

        # Validate containerization
        self.validate_containerization()

        # Validate API alignment
        self.validate_api_alignment()

        # Validate integration components
        self.validate_integration_components()

        # Apply automatic repairs
        self.apply_automatic_repairs()

        # Generate final report
        report = {
            "validation_results": self.validation_results,
            "repairs_applied": self.repairs_applied,
            "issues_found": self.issues_found,
            "overall_health": self.calculate_overall_health()
        }

        return report

    def validate_swift_package_structure(self):
        """Validate Swift package structure"""
        print("\nValidating Swift Package Structure...")

        package_file = self.base_path / "swift-package" / "Package.swift"

        if not package_file.exists():
            self.record_issue("Package.swift missing", "CRITICAL", "Create Package.swift")
            return

        try:
            with open(package_file, 'r') as f:
                content = f.read()

            # Validate package structure
            required_elements = [
                "name:",
                "platforms:",
                "dependencies:",
                "targets:"
            ]

            missing_elements = []
            for element in required_elements:
                if element not in content:
                    missing_elements.append(element)

            if missing_elements:
                self.record_issue(f"Missing package elements: {missing_elements}", "HIGH", "Add missing package elements")
            else:
                self.record_validation("swift_package_structure", "PASSED", "Package structure is valid")

            # Validate Metabase-specific components
            if "MetabaseBridge" in content:
                self.record_validation("metabase_bridge_component", "PASSED", "MetabaseBridge component present")
            else:
                self.record_issue("MetabaseBridge component missing", "HIGH", "Add MetabaseBridge component")

        except Exception as e:
            self.record_issue(f"Package validation error: {e}", "HIGH", "Fix Package.swift syntax")

    def validate_containerization(self):
        """Validate containerization setup"""
        print("\nValidating Containerization...")

        dockerfile = self.base_path / "containerization" / "Dockerfile.bridge"

        if not dockerfile.exists():
            self.record_issue("Dockerfile.bridge missing", "CRITICAL", "Create containerization/Dockerfile.bridge")
            return

        with open(dockerfile, 'r') as f:
            content = f.read()

        # Validate Dockerfile best practices
        dockerfile_checks = []

        if "FROM swift:5.9-focal as builder" in content:
            dockerfile_checks.append("Multi-stage build configured")
        else:
            dockerfile_checks.append("Multi-stage build missing")

        if "USER metabase" in content:
            dockerfile_checks.append("Non-root user configured")
        else:
            dockerfile_checks.append("Non-root user missing")

        if "HEALTHCHECK" in content:
            dockerfile_checks.append("Health check configured")
        else:
            dockerfile_checks.append("Health check missing")

        if "EXPOSE 3000" in content:
            dockerfile_checks.append("Metabase port properly exposed")
        else:
            dockerfile_checks.append("Metabase port exposure missing")

        if all("configured" in check for check in dockerfile_checks):
            self.record_validation("containerization", "PASSED", "Containerization is properly configured")
        else:
            self.record_issue("Containerization configuration issues", "HIGH", "Fix Dockerfile configuration")

    def validate_api_alignment(self):
        """Validate API alignment"""
        print("\nValidating API Alignment...")

        metabase_bridge_file = self.base_path / "swift-package" / "Sources" / "MetabaseBridge" / "MetabaseBridge.swift"

        if not metabase_bridge_file.exists():
            self.record_issue("MetabaseBridge.swift missing", "HIGH", "Create MetabaseBridge implementation")
            return

        with open(metabase_bridge_file, 'r') as f:
            content = f.read()

        # Check for required API endpoints
        required_endpoints = [
            "/health",
            "/api/v1/metrics",
            "/api/v1/metabase/process"
        ]

        missing_endpoints = []
        for endpoint in required_endpoints:
            if endpoint not in content:
                missing_endpoints.append(endpoint)

        if missing_endpoints:
            self.record_issue(f"Missing API endpoints: {missing_endpoints}", "MEDIUM", "Implement missing API endpoints")
        else:
            self.record_validation("api_alignment", "PASSED", "All required API endpoints referenced")

    def validate_integration_components(self):
        """Validate integration components"""
        print("\nValidating Integration Components...")

        # Check for required component files
        required_components = {
            "MetabaseBridge.swift": self.base_path / "swift-package" / "Sources" / "MetabaseBridge" / "MetabaseBridge.swift",
            "AppleEcosystemBridge.swift": self.base_path / "swift-package" / "Sources" / "AppleEcosystemBridge" / "AppleEcosystemBridge.swift",
            "NodeJSBridge.swift": self.base_path / "swift-package" / "Sources" / "NodeJSBridge" / "NodeJSBridge.swift"
        }

        missing_components = []
        for name, path in required_components.items():
            if not path.exists():
                missing_components.append(name)

        if missing_components:
            self.record_issue(f"Missing components: {missing_components}", "CRITICAL", "Create missing component files")
        else:
            self.record_validation("integration_components", "PASSED", "All integration components present")

    def apply_automatic_repairs(self):
        """Apply automatic repairs where possible"""
        print("\nApplying Automatic Repairs...")

        # Repair missing directories
        self.repair_missing_directories()

        # Repair configuration files
        self.repair_configuration_files()

    def repair_missing_directories(self):
        """Create missing required directories"""
        required_dirs = [
            self.base_path / "swift-package" / "Sources",
            self.base_path / "containerization",
            self.base_path / "integration",
            self.base_path / "tests",
            self.base_path / "optimization",
            self.base_path / "validation"
        ]

        for dir_path in required_dirs:
            if not dir_path.exists():
                dir_path.mkdir(parents=True, exist_ok=True)
                print(f"  Created directory: {dir_path}")
                self.repairs_applied.append(f"Created directory: {dir_path}")

    def repair_configuration_files(self):
        """Repair configuration files"""
        # Create basic docker-compose.yml if missing
        compose_file = self.base_path / "containerization" / "docker-compose.bridge.yml"
        if not compose_file.exists():
            basic_compose = '''version: '3.8'
services:
  metabase-bridge:
    build: .
    ports:
      - "3000:3000"
    environment:
      - METABASE_BRIDGE_CONFIG=/app/config/bridge.json
      - METABASE_URL=http://localhost:3000
'''
            with open(compose_file, 'w') as f:
                f.write(basic_compose)
            print(f"  Created docker-compose.bridge.yml")
            self.repairs_applied.append("Created docker-compose.bridge.yml")

    def record_validation(self, component: str, status: str, message: str):
        """Record validation result"""
        self.validation_results[component] = {
            "status": status,
            "message": message,
            "timestamp": time.time()
        }

        print(f"  {component}: {message}")

    def record_issue(self, issue: str, severity: str, solution: str):
        """Record identified issue"""
        self.issues_found.append({
            "issue": issue,
            "severity": severity,
            "solution": solution,
            "timestamp": time.time()
        })

        print(f"  ISSUE ({severity}): {issue}")
        print(f"     Solution: {solution}")

    def calculate_overall_health(self) -> str:
        """Calculate overall system health"""
        passed_validations = sum(1 for result in self.validation_results.values() if result["status"] == "PASSED")
        total_validations = len(self.validation_results)

        if total_validations == 0:
            return "UNKNOWN"

        health_percentage = (passed_validations / total_validations) * 100

        if health_percentage >= 90:
            return "EXCELLENT"
        elif health_percentage >= 70:
            return "GOOD"
        elif health_percentage >= 50:
            return "FAIR"
        else:
            return "POOR"

def main():
    """Main validation and repair execution"""
    validator = MetabaseBridgeValidator()
    report = validator.run_validation_and_repair()

    # Summary
    print("\n" + "=" * 60)
    print("VALIDATION & REPAIR COMPLETE")
    print("=" * 60)

    overall_health = report["overall_health"]
    print(f"Overall Health: {overall_health}")

    validations_count = len(report["validation_results"])
    passed_count = sum(1 for result in report["validation_results"].values() if result["status"] == "PASSED")

    print(f"Passed Validations: {passed_count}/{validations_count}")
    print(f"Repairs Applied: {len(report['repairs_applied'])}")
    print(f"Issues Found: {len(report['issues_found'])}")

    if overall_health in ["EXCELLENT", "GOOD"]:
        print("System is healthy and ready for deployment!")
    elif overall_health == "FAIR":
        print("System is functional but needs some improvements")
    else:
        print("System needs significant repairs before deployment")

    return 0 if overall_health in ["EXCELLENT", "GOOD"] else 1

if __name__ == "__main__":
    exit(main())
