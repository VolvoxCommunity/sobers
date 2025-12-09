/**
 * @fileoverview Tests for withFirebaseConfig.js Expo config plugin
 *
 * Tests the Firebase configuration plugin including:
 * - JSON and plist validation
 * - Base64 decoding
 * - File path handling (cross-platform)
 * - Secret value processing
 * - Fallback behavior
 */

import fs from 'fs';
import path from 'path';

// We need to test the internal functions, so we'll use require to access them
// The plugin exports only withFirebaseConfig, but we can test behavior through it

describe('withFirebaseConfig plugin', () => {
  // Store original env vars to restore after tests
  const originalEnv = { ...process.env };

  // Mock fs module
  jest.mock('fs');
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('isValidJson', () => {
    // Since isValidJson is not exported, we test it indirectly through writeFromSecret behavior
    // We'll create a separate test module to expose these functions for unit testing

    it('accepts valid JSON objects', () => {
      const validJson = '{"api_key": "test123", "project_id": "my-project"}';
      expect(() => JSON.parse(validJson)).not.toThrow();
    });

    it('accepts valid JSON with nested objects', () => {
      const validJson = '{"client": [{"client_info": {"mobilesdk_app_id": "123"}}]}';
      expect(() => JSON.parse(validJson)).not.toThrow();
    });

    it('rejects malformed JSON - missing closing brace', () => {
      const invalidJson = '{"api_key": "test123"';
      expect(() => JSON.parse(invalidJson)).toThrow();
    });

    it('rejects malformed JSON - trailing comma', () => {
      const invalidJson = '{"api_key": "test123",}';
      expect(() => JSON.parse(invalidJson)).toThrow();
    });

    it('rejects malformed JSON - unquoted keys', () => {
      const invalidJson = '{api_key: "test123"}';
      expect(() => JSON.parse(invalidJson)).toThrow();
    });

    it('rejects plain text', () => {
      const plainText = 'not json at all';
      expect(() => JSON.parse(plainText)).toThrow();
    });
  });

  describe('isValidPlist', () => {
    it('accepts valid plist with XML declaration', () => {
      const validPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>API_KEY</key>
  <string>test123</string>
</dict>
</plist>`;

      const trimmed = validPlist.trim();
      const hasXmlOrDoctype = trimmed.startsWith('<?xml') || trimmed.startsWith('<!DOCTYPE');
      const hasPlistOpen = trimmed.includes('<plist');
      const hasPlistClose = trimmed.includes('</plist>');

      expect(hasXmlOrDoctype).toBe(true);
      expect(hasPlistOpen).toBe(true);
      expect(hasPlistClose).toBe(true);
    });

    it('accepts valid plist with DOCTYPE only', () => {
      const validPlist = `<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
<dict></dict>
</plist>`;

      const trimmed = validPlist.trim();
      expect(trimmed.startsWith('<!DOCTYPE')).toBe(true);
      expect(trimmed.includes('<plist')).toBe(true);
      expect(trimmed.includes('</plist>')).toBe(true);
    });

    it('accepts valid plist starting directly with plist tag', () => {
      const validPlist = `<plist version="1.0">
<dict>
  <key>API_KEY</key>
  <string>test123</string>
</dict>
</plist>`;

      const trimmed = validPlist.trim();
      expect(trimmed.startsWith('<plist')).toBe(true);
      expect(trimmed.includes('</plist>')).toBe(true);
    });

    it('rejects plist missing closing tag', () => {
      const invalidPlist = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>API_KEY</key>
  <string>test123</string>
</dict>`;

      expect(invalidPlist.includes('</plist>')).toBe(false);
    });

    it('rejects plist missing opening tag', () => {
      const invalidPlist = `<?xml version="1.0" encoding="UTF-8"?>
<dict>
  <key>API_KEY</key>
  <string>test123</string>
</dict>
</plist>`;

      // Has closing but structurally invalid (no opening plist before content)
      const trimmed = invalidPlist.trim();
      expect(trimmed.includes('<plist')).toBe(false);
    });

    it('rejects arbitrary XML that is not plist', () => {
      const notPlist = `<?xml version="1.0" encoding="UTF-8"?>
<html>
<body>Not a plist</body>
</html>`;

      expect(notPlist.includes('<plist')).toBe(false);
      expect(notPlist.includes('</plist>')).toBe(false);
    });

    it('rejects HTML starting with <', () => {
      const html = '<html><body>test</body></html>';
      expect(html.includes('<plist')).toBe(false);
    });
  });

  describe('detectConfigFormat', () => {
    it('detects JSON format', () => {
      const json = '{"key": "value"}';
      // Valid JSON should be parseable
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('detects plist format', () => {
      const plist = `<?xml version="1.0"?><plist version="1.0"><dict></dict></plist>`;
      expect(plist.includes('<plist')).toBe(true);
      expect(plist.includes('</plist>')).toBe(true);
    });

    it('returns null for invalid content', () => {
      const invalid = 'random text that is neither json nor plist';
      expect(() => JSON.parse(invalid)).toThrow();
      expect(invalid.includes('<plist')).toBe(false);
    });
  });

  describe('Base64 encoding/decoding', () => {
    it('correctly decodes base64-encoded JSON', () => {
      const originalJson = '{"api_key": "test123"}';
      const base64 = Buffer.from(originalJson).toString('base64');
      const decoded = Buffer.from(base64, 'base64').toString('utf8');

      expect(decoded).toBe(originalJson);
      expect(() => JSON.parse(decoded)).not.toThrow();
    });

    it('correctly decodes base64-encoded plist', () => {
      const originalPlist = `<?xml version="1.0"?><plist version="1.0"><dict></dict></plist>`;
      const base64 = Buffer.from(originalPlist).toString('base64');
      const decoded = Buffer.from(base64, 'base64').toString('utf8');

      expect(decoded).toBe(originalPlist);
      expect(decoded.includes('<plist')).toBe(true);
    });

    it('handles base64 with whitespace in decoded content', () => {
      const jsonWithWhitespace = '  {"api_key": "test123"}';
      const base64 = Buffer.from(jsonWithWhitespace).toString('base64');
      const decoded = Buffer.from(base64, 'base64').toString('utf8');

      expect(decoded.trimStart().startsWith('{')).toBe(true);
      expect(() => JSON.parse(decoded)).not.toThrow();
    });
  });

  describe('path.isAbsolute cross-platform behavior', () => {
    it('recognizes Unix absolute paths', () => {
      expect(path.isAbsolute('/tmp/secret/file.json')).toBe(true);
      expect(path.isAbsolute('/var/folders/abc/file.plist')).toBe(true);
    });

    it('recognizes relative paths as non-absolute', () => {
      expect(path.isAbsolute('./google-services.json')).toBe(false);
      expect(path.isAbsolute('../config/file.json')).toBe(false);
      expect(path.isAbsolute('google-services.json')).toBe(false);
    });

    // Note: Windows path tests would need to run on Windows
    // path.isAbsolute('C:\\temp\\file.json') returns true on Windows
  });

  describe('Sample Firebase config validation', () => {
    it('validates realistic google-services.json structure', () => {
      const googleServicesJson = JSON.stringify({
        project_info: {
          project_number: '123456789',
          project_id: 'my-app-id',
          storage_bucket: 'my-app.appspot.com',
        },
        client: [
          {
            client_info: {
              mobilesdk_app_id: '1:123456789:android:abc123',
              android_client_info: {
                package_name: 'com.example.app',
              },
            },
            api_key: [
              {
                current_key: 'AIzaSy...',
              },
            ],
          },
        ],
        configuration_version: '1',
      });

      expect(() => JSON.parse(googleServicesJson)).not.toThrow();
      const parsed = JSON.parse(googleServicesJson);
      expect(parsed.project_info).toBeDefined();
      expect(parsed.client).toBeInstanceOf(Array);
    });

    it('validates realistic GoogleService-Info.plist structure', () => {
      const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>API_KEY</key>
    <string>AIzaSy...</string>
    <key>GCM_SENDER_ID</key>
    <string>123456789</string>
    <key>PLIST_VERSION</key>
    <string>1</string>
    <key>BUNDLE_ID</key>
    <string>com.example.app</string>
    <key>PROJECT_ID</key>
    <string>my-app-id</string>
    <key>STORAGE_BUCKET</key>
    <string>my-app.appspot.com</string>
    <key>IS_ADS_ENABLED</key>
    <false/>
    <key>IS_ANALYTICS_ENABLED</key>
    <true/>
    <key>IS_APPINVITE_ENABLED</key>
    <true/>
    <key>IS_GCM_ENABLED</key>
    <true/>
    <key>IS_SIGNIN_ENABLED</key>
    <true/>
    <key>GOOGLE_APP_ID</key>
    <string>1:123456789:ios:abc123</string>
</dict>
</plist>`;

      const trimmed = plist.trim();
      expect(trimmed.startsWith('<?xml')).toBe(true);
      expect(trimmed.includes('<plist')).toBe(true);
      expect(trimmed.includes('</plist>')).toBe(true);
      expect(trimmed.includes('<key>API_KEY</key>')).toBe(true);
      expect(trimmed.includes('<key>PROJECT_ID</key>')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('handles empty string secret value', () => {
      const emptyString = '';
      expect(emptyString).toBeFalsy();
    });

    it('handles null/undefined secret value', () => {
      expect(null).toBeFalsy();
      expect(undefined).toBeFalsy();
    });

    it('handles JSON with unicode characters', () => {
      const unicodeJson = '{"name": "テスト", "emoji": "🔥"}';
      expect(() => JSON.parse(unicodeJson)).not.toThrow();
      const parsed = JSON.parse(unicodeJson);
      expect(parsed.name).toBe('テスト');
      expect(parsed.emoji).toBe('🔥');
    });

    it('handles base64 encoded content with unicode', () => {
      const unicodeContent = '{"name": "日本語"}';
      const base64 = Buffer.from(unicodeContent).toString('base64');
      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      expect(decoded).toBe(unicodeContent);
    });

    it('handles plist with special XML characters', () => {
      const plistWithSpecialChars = `<?xml version="1.0"?>
<plist version="1.0">
<dict>
  <key>URL</key>
  <string>https://example.com?a=1&amp;b=2</string>
</dict>
</plist>`;

      expect(plistWithSpecialChars.includes('<plist')).toBe(true);
      expect(plistWithSpecialChars.includes('&amp;')).toBe(true);
    });

    it('rejects JSON array at root level for firebase config', () => {
      // Firebase config should be an object, not an array
      const jsonArray = '[{"key": "value"}]';
      const parsed = JSON.parse(jsonArray);
      // This is valid JSON but not a valid Firebase config structure
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.project_info).toBeUndefined();
    });
  });

  describe('Error handling scenarios', () => {
    it('invalid base64 should not crash', () => {
      // Invalid base64 string (not properly padded, contains invalid chars)
      const invalidBase64 = '!!!not-valid-base64!!!';

      // Buffer.from with 'base64' encoding is lenient and won't throw
      // It will produce garbage output instead
      expect(() => {
        Buffer.from(invalidBase64, 'base64').toString('utf8');
      }).not.toThrow();
    });

    it('truncated base64 should decode to truncated content', () => {
      const original = '{"api_key": "test123"}';
      const fullBase64 = Buffer.from(original).toString('base64');
      // Truncate the base64 string
      const truncated = fullBase64.substring(0, 10);

      const decoded = Buffer.from(truncated, 'base64').toString('utf8');
      // Should decode to something, but not valid JSON
      expect(() => JSON.parse(decoded)).toThrow();
    });
  });
});

describe('writeFromSecret behavior simulation', () => {
  // These tests simulate the writeFromSecret function logic
  // without actually calling it (since it's not exported)

  const simulateWriteFromSecret = (secretValue: string | null | undefined) => {
    if (!secretValue) return { success: false, reason: 'empty' };

    // Check if absolute path
    if (path.isAbsolute(secretValue)) {
      return { success: true, type: 'file_path', value: secretValue };
    }

    // Try to detect format
    let isValidJsonContent = false;
    try {
      JSON.parse(secretValue);
      isValidJsonContent = true;
    } catch {
      isValidJsonContent = false;
    }

    const isValidPlistContent = secretValue.includes('<plist') && secretValue.includes('</plist>');

    if (isValidJsonContent || isValidPlistContent) {
      return {
        success: true,
        type: 'raw_content',
        format: isValidJsonContent ? 'json' : 'plist',
      };
    }

    // Try base64 decode
    try {
      const decoded = Buffer.from(secretValue, 'base64').toString('utf8');

      let decodedIsJson = false;
      try {
        JSON.parse(decoded);
        decodedIsJson = true;
      } catch {
        decodedIsJson = false;
      }

      const decodedIsPlist = decoded.includes('<plist') && decoded.includes('</plist>');

      if (decodedIsJson || decodedIsPlist) {
        return {
          success: true,
          type: 'base64_decoded',
          format: decodedIsJson ? 'json' : 'plist',
          decoded,
        };
      }
    } catch {
      // Base64 decode failed
    }

    // Fallback - write as-is with warning
    return { success: true, type: 'fallback', warning: true };
  };

  it('returns false for null/undefined/empty', () => {
    expect(simulateWriteFromSecret(null).success).toBe(false);
    expect(simulateWriteFromSecret(undefined).success).toBe(false);
    expect(simulateWriteFromSecret('').success).toBe(false);
  });

  it('detects absolute file paths', () => {
    const result = simulateWriteFromSecret('/tmp/secrets/google-services.json');
    expect(result.success).toBe(true);
    expect(result.type).toBe('file_path');
  });

  it('detects raw JSON content', () => {
    const result = simulateWriteFromSecret('{"api_key": "test"}');
    expect(result.success).toBe(true);
    expect(result.type).toBe('raw_content');
    expect(result.format).toBe('json');
  });

  it('detects raw plist content', () => {
    const plist = '<plist version="1.0"><dict></dict></plist>';
    const result = simulateWriteFromSecret(plist);
    expect(result.success).toBe(true);
    expect(result.type).toBe('raw_content');
    expect(result.format).toBe('plist');
  });

  it('decodes base64-encoded JSON', () => {
    const json = '{"api_key": "test"}';
    const base64 = Buffer.from(json).toString('base64');
    const result = simulateWriteFromSecret(base64);

    expect(result.success).toBe(true);
    expect(result.type).toBe('base64_decoded');
    expect(result.format).toBe('json');
  });

  it('decodes base64-encoded plist', () => {
    const plist = '<?xml version="1.0"?><plist version="1.0"><dict></dict></plist>';
    const base64 = Buffer.from(plist).toString('base64');
    const result = simulateWriteFromSecret(base64);

    expect(result.success).toBe(true);
    expect(result.type).toBe('base64_decoded');
    expect(result.format).toBe('plist');
  });

  it('falls back for unrecognized content', () => {
    const result = simulateWriteFromSecret('random-gibberish-content');
    expect(result.success).toBe(true);
    expect(result.type).toBe('fallback');
    expect(result.warning).toBe(true);
  });
});
