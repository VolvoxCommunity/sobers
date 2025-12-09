/**
 * @fileoverview Tests for withModularHeaders.js Expo config plugin
 *
 * Tests the modular headers plugin including:
 * - Podfile modification behavior
 * - Idempotency (not adding duplicate entries)
 * - Platform line detection and regex matching
 * - Error handling for invalid configs
 */

// Mock @expo/config-plugins before importing
import { withPodfile } from '@expo/config-plugins';

jest.mock('@expo/config-plugins', () => ({
  withPodfile: jest.fn((config, callback) => {
    // Simulate what withPodfile does - call the callback with config
    return callback(config);
  }),
}));

// Import the plugin after mocking
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withModularHeaders = require('../../plugins/withModularHeaders');

describe('withModularHeaders plugin', () => {
  const mockWithPodfile = withPodfile as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Podfile modification', () => {
    it('adds use_modular_headers! after platform declaration', () => {
      const podfileContents = `platform :ios, '13.4'

target 'MyApp' do
  use_react_native!
end`;

      const config = {
        modResults: {
          contents: podfileContents,
        },
      };

      const result = withModularHeaders(config);

      expect(result.modResults.contents).toContain('use_modular_headers!');
      expect(result.modResults.contents).toContain(
        '# Enable modular headers globally for Firebase Swift compatibility'
      );
    });

    it('places use_modular_headers! immediately after platform line', () => {
      const podfileContents = `platform :ios, '13.4'

target 'MyApp' do
  use_react_native!
end`;

      const config = {
        modResults: {
          contents: podfileContents,
        },
      };

      const result = withModularHeaders(config);

      // Verify the order: platform line, then comment, then use_modular_headers!
      const lines = result.modResults.contents.split('\n');
      const platformIndex = lines.findIndex((line: string) => line.includes('platform :ios'));
      const commentIndex = lines.findIndex((line: string) =>
        line.includes('# Enable modular headers')
      );
      const modularHeadersIndex = lines.findIndex((line: string) =>
        line.includes('use_modular_headers!')
      );

      expect(platformIndex).toBeLessThan(commentIndex);
      expect(commentIndex).toBeLessThan(modularHeadersIndex);
      expect(modularHeadersIndex).toBe(commentIndex + 1);
    });

    it('handles platform line with different iOS versions', () => {
      const versions = ["'12.0'", "'13.0'", "'14.0'", "'15.0'", "'13.4'"];

      versions.forEach((version) => {
        const podfileContents = `platform :ios, ${version}

target 'MyApp' do
end`;

        const config = {
          modResults: {
            contents: podfileContents,
          },
        };

        mockWithPodfile.mockImplementationOnce((cfg, callback) => callback(cfg));
        const result = withModularHeaders(config);

        expect(result.modResults.contents).toContain('use_modular_headers!');
      });
    });

    it('handles platform line without version', () => {
      const podfileContents = `platform :ios

target 'MyApp' do
end`;

      const config = {
        modResults: {
          contents: podfileContents,
        },
      };

      const result = withModularHeaders(config);

      expect(result.modResults.contents).toContain('use_modular_headers!');
    });
  });

  describe('Idempotency', () => {
    it('does not add use_modular_headers! if already present', () => {
      const podfileContents = `platform :ios, '13.4'

# Enable modular headers globally for Firebase Swift compatibility
use_modular_headers!

target 'MyApp' do
  use_react_native!
end`;

      const config = {
        modResults: {
          contents: podfileContents,
        },
      };

      const result = withModularHeaders(config);

      // Count occurrences of use_modular_headers!
      const matches = result.modResults.contents.match(/use_modular_headers!/g);
      expect(matches).toHaveLength(1);
    });

    it('detects use_modular_headers! anywhere in file', () => {
      const podfileContents = `platform :ios, '13.4'

target 'MyApp' do
  use_modular_headers!
  use_react_native!
end`;

      const config = {
        modResults: {
          contents: podfileContents,
        },
      };

      const result = withModularHeaders(config);

      // Should not modify if already present (even in wrong location)
      const matches = result.modResults.contents.match(/use_modular_headers!/g);
      expect(matches).toHaveLength(1);
    });

    it('running plugin twice produces same result', () => {
      const podfileContents = `platform :ios, '13.4'

target 'MyApp' do
end`;

      const config1 = {
        modResults: {
          contents: podfileContents,
        },
      };

      // First run
      const result1 = withModularHeaders(config1);
      const afterFirstRun = result1.modResults.contents;

      // Second run with result from first
      const config2 = {
        modResults: {
          contents: afterFirstRun,
        },
      };

      mockWithPodfile.mockImplementationOnce((cfg, callback) => callback(cfg));
      const result2 = withModularHeaders(config2);

      expect(result2.modResults.contents).toBe(afterFirstRun);
    });
  });

  describe('Platform line regex matching', () => {
    it('matches platform line at start of file', () => {
      const podfileContents = `platform :ios, '13.4'
target 'MyApp' do
end`;

      const config = {
        modResults: {
          contents: podfileContents,
        },
      };

      const result = withModularHeaders(config);
      expect(result.modResults.contents).toContain('use_modular_headers!');
    });

    it('matches platform line with leading whitespace', () => {
      const podfileContents = `  platform :ios, '13.4'

target 'MyApp' do
end`;

      const config = {
        modResults: {
          contents: podfileContents,
        },
      };

      const result = withModularHeaders(config);
      expect(result.modResults.contents).toContain('use_modular_headers!');
    });

    it('matches platform line with tab indentation', () => {
      const podfileContents = `\tplatform :ios, '13.4'

target 'MyApp' do
end`;

      const config = {
        modResults: {
          contents: podfileContents,
        },
      };

      const result = withModularHeaders(config);
      expect(result.modResults.contents).toContain('use_modular_headers!');
    });

    it('does not modify if no platform line found', () => {
      const podfileContents = `target 'MyApp' do
  use_react_native!
end`;

      const config = {
        modResults: {
          contents: podfileContents,
        },
      };

      const result = withModularHeaders(config);

      // Should not add use_modular_headers! if no platform line
      expect(result.modResults.contents).not.toContain('use_modular_headers!');
      expect(result.modResults.contents).toBe(podfileContents);
    });
  });

  describe('Error handling', () => {
    it('throws error if modResults is undefined', () => {
      const config = {};

      expect(() => withModularHeaders(config)).toThrow(
        'Invalid Podfile config: modResults.contents must be a string'
      );
    });

    it('throws error if modResults.contents is undefined', () => {
      const config = {
        modResults: {},
      };

      expect(() => withModularHeaders(config)).toThrow(
        'Invalid Podfile config: modResults.contents must be a string'
      );
    });

    it('throws error if modResults.contents is not a string', () => {
      const config = {
        modResults: {
          contents: 12345,
        },
      };

      expect(() => withModularHeaders(config)).toThrow(
        'Invalid Podfile config: modResults.contents must be a string'
      );
    });

    it('throws error if modResults.contents is null', () => {
      const config = {
        modResults: {
          contents: null,
        },
      };

      expect(() => withModularHeaders(config)).toThrow(
        'Invalid Podfile config: modResults.contents must be a string'
      );
    });
  });

  describe('Realistic Podfile scenarios', () => {
    it('handles typical Expo-generated Podfile', () => {
      const podfileContents = `require File.join(File.dirname(\`node --print "require.resolve('expo/package.json')"\`), "scripts/autolinking")
require File.join(File.dirname(\`node --print "require.resolve('react-native/package.json')"\`), "scripts/react_native_pods")

require 'json'
podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}

ENV['RCT_NEW_ARCH_ENABLED'] = podfile_properties['newArchEnabled'] == 'true' ? '1' : '0'
ENV['EX_DEV_CLIENT_NETWORK_INSPECTOR'] = podfile_properties['EX_DEV_CLIENT_NETWORK_INSPECTOR']

platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'

install! 'cocoapods', :deterministic_uuids => false

target 'SobrietyWaypoint' do
  use_expo_modules!
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => true,
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  post_install do |installer|
    react_native_post_install(installer)
  end
end`;

      const config = {
        modResults: {
          contents: podfileContents,
        },
      };

      const result = withModularHeaders(config);

      expect(result.modResults.contents).toContain('use_modular_headers!');
      expect(result.modResults.contents).toContain(
        '# Enable modular headers globally for Firebase Swift compatibility'
      );

      // Verify it's placed after platform line
      const platformIndex = result.modResults.contents.indexOf('platform :ios');
      const modularIndex = result.modResults.contents.indexOf('use_modular_headers!');
      expect(modularIndex).toBeGreaterThan(platformIndex);

      // Verify it's before targets
      const targetIndex = result.modResults.contents.indexOf("target 'SobrietyWaypoint'");
      expect(modularIndex).toBeLessThan(targetIndex);
    });

    it('handles Podfile with existing Firebase pods', () => {
      const podfileContents = `platform :ios, '13.4'

target 'MyApp' do
  pod 'Firebase/Analytics'
  pod 'Firebase/Crashlytics'
  use_react_native!
end`;

      const config = {
        modResults: {
          contents: podfileContents,
        },
      };

      const result = withModularHeaders(config);

      expect(result.modResults.contents).toContain('use_modular_headers!');
      // Firebase pods should still be there
      expect(result.modResults.contents).toContain("pod 'Firebase/Analytics'");
      expect(result.modResults.contents).toContain("pod 'Firebase/Crashlytics'");
    });

    it('preserves existing comments and formatting', () => {
      const podfileContents = `# This is a comment at the top
platform :ios, '13.4'

# Another comment
target 'MyApp' do
  # Pod comment
  pod 'SomePod'
end`;

      const config = {
        modResults: {
          contents: podfileContents,
        },
      };

      const result = withModularHeaders(config);

      // Original comments should be preserved
      expect(result.modResults.contents).toContain('# This is a comment at the top');
      expect(result.modResults.contents).toContain('# Another comment');
      expect(result.modResults.contents).toContain('# Pod comment');
      expect(result.modResults.contents).toContain('use_modular_headers!');
    });
  });

  describe('Edge cases', () => {
    it('handles empty Podfile', () => {
      const config = {
        modResults: {
          contents: '',
        },
      };

      const result = withModularHeaders(config);

      // No platform line, so no modification
      expect(result.modResults.contents).toBe('');
    });

    it('handles Podfile with only whitespace', () => {
      const config = {
        modResults: {
          contents: '   \n\n   \t\t\n',
        },
      };

      const result = withModularHeaders(config);

      // No platform line, so no modification
      expect(result.modResults.contents).not.toContain('use_modular_headers!');
    });

    it('handles platform line as last line without newline', () => {
      const podfileContents = `platform :ios, '13.4'`;

      const config = {
        modResults: {
          contents: podfileContents,
        },
      };

      const result = withModularHeaders(config);

      expect(result.modResults.contents).toContain('use_modular_headers!');
    });

    it('does not match platform :android or other platforms', () => {
      const podfileContents = `platform :android, '21'

target 'MyApp' do
end`;

      const config = {
        modResults: {
          contents: podfileContents,
        },
      };

      const result = withModularHeaders(config);

      // Should not add use_modular_headers! for non-iOS platform
      expect(result.modResults.contents).not.toContain('use_modular_headers!');
    });

    it('handles multiple platform lines (uses first match)', () => {
      const podfileContents = `platform :ios, '13.4'
platform :ios, '14.0'

target 'MyApp' do
end`;

      const config = {
        modResults: {
          contents: podfileContents,
        },
      };

      const result = withModularHeaders(config);

      // Should add after first platform line only
      const matches = result.modResults.contents.match(/use_modular_headers!/g);
      expect(matches).toHaveLength(1);
    });
  });

  describe('withPodfile integration', () => {
    it('calls withPodfile with correct arguments', () => {
      const config = {
        modResults: {
          contents: `platform :ios, '13.4'`,
        },
      };

      withModularHeaders(config);

      expect(mockWithPodfile).toHaveBeenCalledTimes(1);
      expect(mockWithPodfile).toHaveBeenCalledWith(config, expect.any(Function));
    });

    it('returns the modified config from withPodfile', () => {
      const config = {
        name: 'TestApp',
        modResults: {
          contents: `platform :ios, '13.4'`,
        },
      };

      const result = withModularHeaders(config);

      // Should return config with modified contents
      expect(result.name).toBe('TestApp');
      expect(result.modResults.contents).toContain('use_modular_headers!');
    });
  });
});
