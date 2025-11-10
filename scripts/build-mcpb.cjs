#!/usr/bin/env node

/**
 * Build script for creating MCPB package
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(message) {
  console.log(`[MCPB Builder] ${message}`);
}

function buildMcpbPackage() {
  log('Building Metabase MCP MCPB package...');

  try {
    const manifestPath = path.join(process.cwd(), 'manifest.json');

    // Verify manifest exists
    if (!fs.existsSync(manifestPath)) {
      throw new Error('manifest.json not found');
    }

    // Read and validate manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const outputFile = `${manifest.name}-${manifest.version}.mcpb`;
    log(`Building: ${manifest.name} v${manifest.version}`);

    // Build the MCPB package
    const mcpbCommand = `mcpb pack . ${outputFile}`;
    log(`Executing: ${mcpbCommand}`);

    execSync(mcpbCommand, {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    log(`Successfully created: ${outputFile}`);

    // Verify the file was created
    const outputPath = path.join(process.cwd(), outputFile);
    if (!fs.existsSync(outputPath)) {
      throw new Error(`MCPB file was not created: ${outputFile}`);
    }

    const stats = fs.statSync(outputPath);
    log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    return outputFile;
  } catch (error) {
    log(`Error building MCPB package: ${error.message}`);
    throw error;
  }
}


function main() {
  log('Starting MCPB package build process...');

  // Ensure we're in the project root
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json not found. Please run this script from the project root.');
  }

  // Build the MCPB package
  const outputFile = buildMcpbPackage();

  log('\nMCPB package built successfully!');
  log(`Created: ${outputFile}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[MCPB Builder] Fatal error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { buildMcpbPackage };
