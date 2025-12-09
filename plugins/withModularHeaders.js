/**
 * Expo config plugin to add `use_modular_headers!` to the iOS Podfile.
 *
 * @remarks
 * This is required for Firebase SDK compatibility. Firebase Swift pods (like FirebaseCoreInternal)
 * depend on GoogleUtilities, which needs modular headers to be imported from Swift.
 *
 * Using `use_modular_headers!` instead of `use_frameworks! :linkage => :static` because:
 * - `use_frameworks!` converts all pods to frameworks, which breaks React Native Firebase
 *   (RNFBApp can't import non-modular React Native headers like RCTConvert.h)
 * - `use_modular_headers!` enables modular headers globally without converting pods to frameworks
 *
 * @see {@link https://github.com/invertase/react-native-firebase/issues/6332 RNFBApp modular headers issue}
 * @see {@link https://docs.expo.dev/config-plugins/introduction/ Expo Config Plugins}
 */
const { withPodfile } = require('@expo/config-plugins');

/**
 * Adds `use_modular_headers!` to the Podfile after the platform declaration.
 *
 * @param {import('@expo/config-plugins').ExpoConfig} config - The Expo config object
 * @returns {import('@expo/config-plugins').ExpoConfig} Modified config
 */
function withModularHeaders(config) {
  return withPodfile(config, (podfileConfig) => {
    const podfile = podfileConfig.modResults.contents;

    // Check if use_modular_headers! is already present
    if (podfile.includes('use_modular_headers!')) {
      return podfileConfig;
    }

    // Add use_modular_headers! after the platform declaration
    // This ensures it's at the top level, before any targets
    // Allow optional leading whitespace for indented Podfiles
    const platformRegex = /^(\s*platform :ios.*$)/m;
    const match = podfile.match(platformRegex);

    if (match) {
      podfileConfig.modResults.contents = podfile.replace(
        platformRegex,
        `$1\n\n# Enable modular headers globally for Firebase Swift compatibility\nuse_modular_headers!`
      );
    }

    return podfileConfig;
  });
}

module.exports = withModularHeaders;
