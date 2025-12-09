/* eslint-disable no-console */
/**
 * Expo config plugin to inject Firebase configuration files from EAS Secrets.
 *
 * This plugin decodes base64-encoded Firebase config files from environment
 * variables and writes them to the correct locations during prebuild.
 *
 * @remarks
 * For local development, place the files directly in the project root.
 * For EAS builds, set these secrets:
 *   - GOOGLE_SERVICES_JSON (base64 encoded)
 *   - GOOGLE_SERVICE_INFO_PLIST (base64 encoded)
 *
 * To encode files:
 *   base64 -i google-services.json > google-services.json.b64
 *   base64 -i GoogleService-Info.plist > GoogleService-Info.plist.b64
 *
 * To create EAS secrets:
 *   eas secret:create --scope project --name GOOGLE_SERVICES_JSON --value "$(cat google-services.json.b64)"
 *   eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --value "$(cat GoogleService-Info.plist.b64)"
 *
 * @see {@link https://docs.expo.dev/build-reference/variables/#using-secrets-in-environment-variables EAS Secrets}
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const { Buffer } = require('buffer');
const path = require('path');

/**
 * Writes Firebase config for Android (google-services.json).
 */
function withAndroidFirebaseConfig(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidAppDir = path.join(projectRoot, 'android', 'app');

      // Check for base64 encoded secret first (EAS builds)
      const base64Config = process.env.GOOGLE_SERVICES_JSON;
      if (base64Config) {
        const decoded = Buffer.from(base64Config, 'base64').toString('utf-8');
        const targetPath = path.join(androidAppDir, 'google-services.json');

        // Ensure directory exists
        if (!fs.existsSync(androidAppDir)) {
          fs.mkdirSync(androidAppDir, { recursive: true });
        }

        fs.writeFileSync(targetPath, decoded);
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

      // Check for base64 encoded secret first (EAS builds)
      const base64Config = process.env.GOOGLE_SERVICE_INFO_PLIST;
      if (base64Config) {
        const decoded = Buffer.from(base64Config, 'base64').toString('utf-8');
        const targetPath = path.join(iosAppDir, 'GoogleService-Info.plist');

        // Ensure directory exists
        if (!fs.existsSync(iosAppDir)) {
          fs.mkdirSync(iosAppDir, { recursive: true });
        }

        fs.writeFileSync(targetPath, decoded);
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
