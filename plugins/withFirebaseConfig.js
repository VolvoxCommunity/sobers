/* eslint-disable no-console */
/**
 * Expo config plugin to inject Firebase configuration files from EAS Secrets.
 *
 * This plugin reads Firebase config from EAS secrets and writes them to the
 * correct locations during prebuild.
 *
 * @remarks
 * For local development, place the files directly in the project root.
 *
 * For EAS builds, create file secrets (RECOMMENDED):
 *   eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
 *   eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist
 *
 * Alternative (base64 string secrets):
 *   eas secret:create --scope project --name GOOGLE_SERVICES_JSON --value "$(base64 -i google-services.json)"
 *   eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --value "$(base64 -i GoogleService-Info.plist)"
 *
 * @see {@link https://docs.expo.dev/build-reference/variables/#using-secrets-in-environment-variables EAS Secrets}
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const { Buffer } = require('buffer');
const path = require('path');

/**
 * Decodes content from base64 if it appears to be base64-encoded.
 * File secrets from EAS are raw content, string secrets may be base64.
 */
function decodeIfBase64(content) {
  // Check if content looks like JSON or XML (raw file content)
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('<?xml') || trimmed.startsWith('<')) {
    return content; // Already raw content (file secret)
  }

  // Try to decode as base64
  try {
    const decoded = Buffer.from(content, 'base64').toString('utf-8');
    // Verify it decoded to valid JSON or XML
    if (
      decoded.trim().startsWith('{') ||
      decoded.trim().startsWith('<?xml') ||
      decoded.trim().startsWith('<')
    ) {
      return decoded;
    }
  } catch {
    // Not valid base64, return original
  }

  return content;
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

      // Check for EAS secret first (file or base64 string)
      const secretConfig = process.env.GOOGLE_SERVICES_JSON;
      if (secretConfig) {
        const content = decodeIfBase64(secretConfig);
        const targetPath = path.join(androidAppDir, 'google-services.json');

        // Ensure directory exists
        if (!fs.existsSync(androidAppDir)) {
          fs.mkdirSync(androidAppDir, { recursive: true });
        }

        fs.writeFileSync(targetPath, content);
        console.log('✓ Wrote google-services.json from EAS secret');
        return config;
      }

      // Fall back to local file (development)
      const localFile = path.join(projectRoot, 'google-services.json');
      if (fs.existsSync(localFile)) {
        const targetPath = path.join(androidAppDir, 'google-services.json');

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

      // Check for EAS secret first (file or base64 string)
      const secretConfig = process.env.GOOGLE_SERVICE_INFO_PLIST;
      if (secretConfig) {
        const content = decodeIfBase64(secretConfig);
        const targetPath = path.join(iosAppDir, 'GoogleService-Info.plist');

        // Ensure directory exists
        if (!fs.existsSync(iosAppDir)) {
          fs.mkdirSync(iosAppDir, { recursive: true });
        }

        fs.writeFileSync(targetPath, content);
        console.log('✓ Wrote GoogleService-Info.plist from EAS secret');
        return config;
      }

      // Fall back to local file (development)
      const localFile = path.join(projectRoot, 'GoogleService-Info.plist');
      if (fs.existsSync(localFile)) {
        const targetPath = path.join(iosAppDir, 'GoogleService-Info.plist');

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
