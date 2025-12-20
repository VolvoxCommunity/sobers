const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add SVG to asset extensions for react-native-bottom-tabs tabBarIcon support
// This allows using require('./icon.svg') in tabBarIcon options
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'svg'];

module.exports = config;
