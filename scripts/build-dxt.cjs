#!/usr/bin/env node

/**
 * Build script for creating DXT package
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(message) {
  console.log(`[DXT Builder] ${message}`);
}

function buildDxtPackage() {
  log('Building Metabase MCP DXT package...');

  try {
    const manifestPath = path.join(process.cwd(), 'manifest.json');

    // Verify manifest exists
    if (!fs.existsSync(manifestPath)) {
      throw new Error('manifest.json not found');
    }

    // Read and validate manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const outputFile = `${manifest.name}-${manifest.version}.dxt`;
    log(`Building: ${manifest.name} v${manifest.version}`);

    // Build the DXT package
    const dxtCommand = `dxt pack . ${outputFile}`;
    log(`Executing: ${dxtCommand}`);

    execSync(dxtCommand, {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    log(`Successfully created: ${outputFile}`);

    // Verify the file was created
    const outputPath = path.join(process.cwd(), outputFile);
    if (!fs.existsSync(outputPath)) {
      throw new Error(`DXT file was not created: ${outputFile}`);
    }

    const stats = fs.statSync(outputPath);
    log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    return outputFile;
  } catch (error) {
    log(`Error building DXT package: ${error.message}`);
    throw error;
  }
}


function main() {
  log('Starting DXT package build process...');

  // Ensure we're in the project root
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json not found. Please run this script from the project root.');
  }

  // Build the DXT package
  const outputFile = buildDxtPackage();

  log('\nDXT package built successfully!');
  log(`Created: ${outputFile}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[DXT Builder] Fatal error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { buildDxtPackage };
