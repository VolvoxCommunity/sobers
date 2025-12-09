/* eslint-disable no-console */
/**
 * Expo config plugin to inject Firebase configuration files from EAS Secrets.
 *
 * This plugin reads Firebase config from EAS file secrets and writes them to
 * the correct locations during prebuild.
 *
 * @remarks
 * For local development, place the files directly in the project root.
 *
 * For EAS builds, create file secrets:
 *   eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
 *   eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist
 *
 * @see {@link https://docs.expo.dev/build-reference/variables/#using-secrets-in-environment-variables EAS Secrets}
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');

/**
 * Writes content from an EAS secret to a target file.
 * EAS FILE_BASE64 secrets provide base64-encoded content directly in the env var.
 *
 * @param {string} secretValue - The secret value (base64 content or file path)
 * @param {string} targetPath - Where to write the file
 * @returns {boolean} True if file was written successfully
 */
function writeFromSecret(secretValue, targetPath) {
  if (!secretValue) return false;

  // Ensure target directory exists
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Check if it's a file path (EAS may write to temp file in some cases)
  if (secretValue.startsWith('/') && fs.existsSync(secretValue)) {
    fs.copyFileSync(secretValue, targetPath);
    return true;
  }

  // Otherwise, treat as base64-encoded content (FILE_BASE64 format)
  try {
    const content = Buffer.from(secretValue, 'base64').toString('utf8');
    // Verify it's valid JSON/plist by checking first character
    if (content.startsWith('{') || content.startsWith('<')) {
      fs.writeFileSync(targetPath, content);
      return true;
    }
    // If not valid decoded content, it might be raw content (for backward compat)
    fs.writeFileSync(targetPath, secretValue);
    return true;
  } catch {
    // If base64 decode fails, write as-is
    fs.writeFileSync(targetPath, secretValue);
    return true;
  }
}

/**
 * Writes Firebase config for Android (google-services.json).
 */
function withAndroidFirebaseConfig(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidAppDir = path.join(projectRoot, 'android', 'app');
      const targetPath = path.join(androidAppDir, 'google-services.json');

      // Check for EAS secret first
      const secretValue = process.env.GOOGLE_SERVICES_JSON;
      if (secretValue && writeFromSecret(secretValue, targetPath)) {
        console.log('✓ Wrote google-services.json from EAS secret');
        return config;
      }

      // Fall back to local file (development)
      const localFile = path.join(projectRoot, 'google-services.json');
      if (fs.existsSync(localFile)) {
        if (!fs.existsSync(androidAppDir)) {
          fs.mkdirSync(androidAppDir, { recursive: true });
        }
        fs.copyFileSync(localFile, targetPath);
        console.log('✓ Copied google-services.json from project root');
        return config;
      }

      console.warn(
        '⚠ No google-services.json found. Set GOOGLE_SERVICES_JSON secret or place file in project root.'
      );
      return config;
    },
  ]);
}

/**
 * Writes Firebase config for iOS (GoogleService-Info.plist).
 */
function withIosFirebaseConfig(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const projectName = config.modRequest.projectName || config.name;
      const iosAppDir = path.join(projectRoot, 'ios', projectName);
      const targetPath = path.join(iosAppDir, 'GoogleService-Info.plist');

      // Check for EAS secret first
      const secretValue = process.env.GOOGLE_SERVICE_INFO_PLIST;
      if (secretValue && writeFromSecret(secretValue, targetPath)) {
        console.log('✓ Wrote GoogleService-Info.plist from EAS secret');
        return config;
      }

      // Fall back to local file (development)
      const localFile = path.join(projectRoot, 'GoogleService-Info.plist');
      if (fs.existsSync(localFile)) {
        if (!fs.existsSync(iosAppDir)) {
          fs.mkdirSync(iosAppDir, { recursive: true });
        }
        fs.copyFileSync(localFile, targetPath);
        console.log('✓ Copied GoogleService-Info.plist from project root');
        return config;
      }

      console.warn(
        '⚠ No GoogleService-Info.plist found. Set GOOGLE_SERVICE_INFO_PLIST secret or place file in project root.'
      );
      return config;
    },
  ]);
}

/**
 * Combined plugin that handles both platforms.
 */
function withFirebaseConfig(config) {
  config = withAndroidFirebaseConfig(config);
  config = withIosFirebaseConfig(config);
  return config;
}

module.exports = withFirebaseConfig;
