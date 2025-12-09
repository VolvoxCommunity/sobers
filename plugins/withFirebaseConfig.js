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
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');

/**
 * Validates if a string is valid JSON.
 *
 * @param {string} content - The content to validate
 * @returns {boolean} True if valid JSON
 */
function isValidJson(content) {
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a string is valid plist XML.
 * Checks for proper plist structure with opening and closing tags.
 *
 * @param {string} content - The content to validate
 * @returns {boolean} True if valid plist structure
 */
function isValidPlist(content) {
  const trimmed = content.trim();
  // Check for XML declaration or plist DOCTYPE, and proper plist tags
  const hasXmlOrDoctype = trimmed.startsWith('<?xml') || trimmed.startsWith('<!DOCTYPE');
  const hasPlistOpen = trimmed.includes('<plist');
  const hasPlistClose = trimmed.includes('</plist>');

  // Must have plist tags and either start with XML declaration/DOCTYPE or <plist directly
  return hasPlistOpen && hasPlistClose && (hasXmlOrDoctype || trimmed.startsWith('<plist'));
}

/**
 * Determines if content is valid Firebase config (JSON or plist).
 *
 * @param {string} content - The content to validate
 * @returns {'json' | 'plist' | null} The detected format, or null if invalid
 */
function detectConfigFormat(content) {
  if (isValidJson(content)) {
    return 'json';
  }
  if (isValidPlist(content)) {
    return 'plist';
  }
  return null;
}

/**
 * Ensure a file at targetPath is created from an EAS secret value.
 *
 * If secretValue is falsy, the function does nothing and returns `false`.
 *
 * The function handles three input formats:
 * 1. **Absolute file path**: If secretValue is an existing absolute filesystem path,
 *    that file is copied to targetPath.
 * 2. **Raw JSON/plist content**: If secretValue is already valid JSON (starts with `{`)
 *    or plist XML (starts with `<?xml` or `<!DOCTYPE`), it is written directly.
 * 3. **Base64-encoded content**: If secretValue doesn't match the above formats,
 *    it is decoded from base64. If the decoded content is valid JSON/plist,
 *    the decoded content is written. Otherwise, the original secretValue is written as-is
 *    with a warning logged.
 *
 * The target directory is created if it does not exist.
 *
 * @param {string} secretValue - The secret value to write: either an absolute file path,
 *   raw JSON/plist content, or base64-encoded JSON/plist content.
 * @param {string} targetPath - Filesystem path where the secret content should be written.
 * @returns {boolean} `true` if a file was written to targetPath, `false` if secretValue was falsy.
 */
function writeFromSecret(secretValue, targetPath) {
  if (!secretValue) return false;

  const fileName = path.basename(targetPath);

  // Ensure target directory exists
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Check if it's a file path (EAS may write to temp file in some cases)
  if (path.isAbsolute(secretValue) && fs.existsSync(secretValue)) {
    fs.copyFileSync(secretValue, targetPath);
    return true;
  }

  // Determine what content to write:
  // 1. If secretValue is already valid JSON/plist, use it directly (raw content)
  // 2. If secretValue is base64-encoded, decode it first (FILE_BASE64 format)
  let contentToWrite = secretValue;
  let contentFormat = detectConfigFormat(secretValue);

  if (contentFormat) {
    // Content is already valid, use as-is
    contentToWrite = secretValue;
  } else {
    // Not valid raw content, try to decode as base64
    try {
      const decoded = Buffer.from(secretValue, 'base64').toString('utf8');
      const decodedFormat = detectConfigFormat(decoded);

      if (decodedFormat) {
        contentToWrite = decoded;
        contentFormat = decodedFormat;
      } else {
        console.warn(
          `Warning: Content for ${fileName} is neither valid JSON/plist nor valid base64-encoded JSON/plist. Writing as-is.`
        );
      }
    } catch (error) {
      console.warn(
        `Warning: Failed to decode base64 content for ${fileName}: ${error.message}. Writing as-is.`
      );
    }
  }

  // Write the determined content
  try {
    fs.writeFileSync(targetPath, contentToWrite);
    return true;
  } catch (writeError) {
    console.error(`Error: Failed to write ${fileName}: ${writeError.message}`);
    return false;
  }
}

/**
 * Ensure google-services.json is present in the Android app directory during prebuild.
 *
 * Attempts to write the Android Firebase configuration to android/app/google-services.json
 * using the EAS secret GOOGLE_SERVICES_JSON (treated as either an absolute file path or
 * base64-encoded content). If the secret is not provided or cannot be used, falls back to
 * copying google-services.json from the project root if it exists. If neither source is available,
 * the function leaves the project unchanged.
 *
 * @param {import('expo/config-plugins').ExpoConfig & { modRequest?: { projectRoot: string } }} config - Expo config passed to the plugin.
 * @returns {import('expo/config-plugins').ExpoConfig} The config object after applying the Android Firebase config handler.
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
 * Ensures an iOS Firebase config file (GoogleService-Info.plist) is present in the app project.
 *
 * Attempts to write the plist into ios/<projectName>/GoogleService-Info.plist from the
 * EAS secret `GOOGLE_SERVICE_INFO_PLIST`, falling back to copying a local
 * GoogleService-Info.plist from the project root if the secret is not provided.
 *
 * @param {import('expo/config-plugins').ConfigPlugin} config - Expo config to modify.
 * @returns {import('expo/config-plugins').ConfigPlugin} The updated Expo config.
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
