const { getDefaultConfig } = require('expo/metro-config');

// Use standard Expo Metro config instead of Sentry's getSentryExpoConfig
// because Sentry's Metro serializer is incompatible with Metro 0.83+
// (Expo SDK 54). The Sentry SDK still works for error tracking - this
// only affects source map upload which can be done separately.
const config = getDefaultConfig(__dirname);

// Add SVG to asset extensions for react-native-bottom-tabs tabBarIcon support
// This allows using require('./icon.svg') in tabBarIcon options
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'svg'];

module.exports = config;
