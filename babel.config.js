module.exports = (api) => {
  const isWeb = process.env.EXPO_OS === 'web';
  api.cache.using(() => isWeb);

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Disable react-native-worklets Babel plugin for web builds.
          // The plugin resolves native-only modules that don't exist in
          // Vercel's build environment, causing Metro compilation to fail.
          // Set at top level because Metro worker processes on Vercel may
          // not forward caller.platform to babel-preset-expo's web: {} options.
          ...(isWeb && { worklets: false }),
          web: {
            worklets: false,
          },
        },
      ],
    ],
  };
};
