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
 * Injects `use_modular_headers!` into the iOS Podfile immediately after the `platform :ios` line if it's not already present.
 * @param {import('@expo/config-plugins').ExpoConfig} config - Expo config whose `modResults.contents` holds the Podfile; `modResults.contents` will be updated when insertion occurs.
 * @returns {import('@expo/config-plugins').ExpoConfig} The same config object, potentially with `modResults.contents` modified to include `use_modular_headers!`.
 */
function withModularHeaders(config) {
  return withPodfile(config, (config) => {
    const podfile = config.modResults.contents;

    // Check if use_modular_headers! is already present
    if (podfile.includes('use_modular_headers!')) {
      return config;
    }

    // Add use_modular_headers! after the platform declaration
    // This ensures it's at the top level, before any targets
    const platformRegex = /^(platform :ios.*$)/m;
    const match = podfile.match(platformRegex);

    if (match) {
      config.modResults.contents = podfile.replace(
        platformRegex,
        `$1\n\n# Enable modular headers globally for Firebase Swift compatibility\nuse_modular_headers!`
      );
    }

    return config;
  });
}

module.exports = withModularHeaders;