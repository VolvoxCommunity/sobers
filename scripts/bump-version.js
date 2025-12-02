#!/usr/bin/env node

/**
 * Automatic semantic version bumping based on conventional commits.
 *
 * @description
 * Analyzes commits since the last version tag and determines the appropriate
 * version bump based on conventional commit messages:
 * - feat: commits → minor bump
 * - Any other commits → patch bump
 *
 * Note: Major version bumps are intentionally disabled for automatic bumping.
 * Breaking changes will bump minor instead. Bump major manually when needed.
 *
 * @example
 * ```bash
 * node scripts/bump-version.js
 * ```
 *
 * @see {@link https://www.conventionalcommits.org/ Conventional Commits}
 * @see {@link https://semver.org/ Semantic Versioning}
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// =============================================================================
// Constants
// =============================================================================

const APP_CONFIG_PATH = path.join(__dirname, '..', 'app.config.ts');
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');
const VERSION_REGEX = /version:\s*['"](\d+\.\d+\.\d+)['"]/;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Executes a shell command and returns the output.
 *
 * @param {string} command - The shell command to execute
 * @returns {string} The command output, trimmed
 */
function exec(command) {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

/**
 * Gets the last version tag from git history.
 *
 * @returns {string | null} The last version tag (e.g., "v1.0.0") or null if none exists
 */
function getLastVersionTag() {
  const tag = exec('git describe --tags --abbrev=0 --match "v*" 2>/dev/null');
  return tag || null;
}

/**
 * Gets the current version from app.config.ts.
 *
 * @returns {string} The current version string (e.g., "1.0.0")
 * @throws {Error} If version cannot be found in app.config.ts
 */
function getCurrentVersion() {
  const content = fs.readFileSync(APP_CONFIG_PATH, 'utf-8');
  const match = content.match(VERSION_REGEX);

  if (!match) {
    throw new Error('Could not find version in app.config.ts');
  }

  return match[1];
}

/**
 * Gets commit messages since a given reference point.
 *
 * @param {string | null} since - Git reference to start from (tag or commit), or null for all commits
 * @returns {string[]} Array of commit messages
 */
function getCommitsSince(since) {
  const range = since ? `${since}..HEAD` : 'HEAD';
  const log = exec(`git log ${range} --oneline --no-merges`);

  if (!log) {
    return [];
  }

  return log.split('\n').filter(Boolean);
}

/**
 * Determines the type of version bump needed based on commit messages.
 *
 * @param {string[]} commits - Array of commit messages to analyze
 * @returns {'minor' | 'patch'} The type of version bump needed (major is manual-only)
 */
function determineBumpType(commits) {
  let hasFeat = false;
  let hasBreaking = false;

  for (const commit of commits) {
    const message = commit.toLowerCase();

    // Check for breaking changes (will bump minor, not major)
    if (message.includes('!:') || message.includes('breaking change')) {
      hasBreaking = true;
    }

    // Check for features
    if (message.includes('feat:') || message.includes('feat(')) {
      hasFeat = true;
    }
  }

  // Breaking changes and features get minor bump, everything else gets patch
  // Note: Major bumps are intentionally manual-only
  if (hasBreaking) {
    console.log('⚠️  Breaking change detected - bumping minor (major bumps are manual-only)');
  }

  return hasFeat || hasBreaking ? 'minor' : 'patch';
}

/**
 * Bumps a semantic version string.
 *
 * @param {string} version - Current version (e.g., "1.0.0")
 * @param {'major' | 'minor' | 'patch'} type - Type of bump to apply
 * @returns {string} New version string
 */
function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unknown bump type: ${type}`);
  }
}

/**
 * Updates the version in app.config.ts.
 *
 * @param {string} newVersion - The new version string to set
 */
function updateAppConfig(newVersion) {
  let content = fs.readFileSync(APP_CONFIG_PATH, 'utf-8');
  content = content.replace(VERSION_REGEX, `version: '${newVersion}'`);
  fs.writeFileSync(APP_CONFIG_PATH, content, 'utf-8');
}

/**
 * Updates the version in package.json.
 *
 * @param {string} newVersion - The new version string to set
 */
function updatePackageJson(newVersion) {
  const content = fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8');
  const packageJson = JSON.parse(content);
  packageJson.version = newVersion;
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
}

// =============================================================================
// Main
// =============================================================================

/**
 * Main entry point for the version bump script.
 */
function main() {
  console.log('🔍 Analyzing commits for version bump...\n');

  // Get last tag and current version
  const lastTag = getLastVersionTag();
  const currentVersion = getCurrentVersion();

  console.log(`📌 Current version: ${currentVersion}`);
  console.log(`🏷️  Last tag: ${lastTag || 'none'}\n`);

  // Get commits to analyze
  const commits = getCommitsSince(lastTag);

  if (commits.length === 0) {
    console.log('ℹ️  No new commits since last tag. Skipping version bump.');
    process.exit(0);
  }

  console.log(`📝 Found ${commits.length} commit(s) to analyze:`);
  commits.slice(0, 5).forEach((commit) => console.log(`   - ${commit}`));
  if (commits.length > 5) {
    console.log(`   ... and ${commits.length - 5} more\n`);
  } else {
    console.log('');
  }

  // Determine bump type and calculate new version
  const bumpType = determineBumpType(commits);
  const newVersion = bumpVersion(currentVersion, bumpType);

  console.log(`📈 Bump type: ${bumpType}`);
  console.log(`✨ New version: ${newVersion}\n`);

  // Update version files
  updateAppConfig(newVersion);
  console.log('✅ Updated app.config.ts');

  updatePackageJson(newVersion);
  console.log('✅ Updated package.json');

  // Output for GitHub Actions
  console.log(`\n::set-output name=new_version::${newVersion}`);
  console.log(`::set-output name=bump_type::${bumpType}`);

  // Also set as environment variable for newer GitHub Actions syntax
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    fs.appendFileSync(githubOutput, `new_version=${newVersion}\n`);
    fs.appendFileSync(githubOutput, `bump_type=${bumpType}\n`);
  }
}

main();
