module.exports = (api) => {
  const isWeb = process.env.EXPO_OS === 'web';
  api.cache.using(() => isWeb);

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Disable react-native-worklets and react-native-reanimated Babel
          // plugins for web builds. Both resolve native-only modules that
          // don't exist in Vercel's build environment. Reanimated v4 delegates
          // to the worklets plugin internally, so both must be disabled.
          // Set at top level because Metro worker processes on Vercel may
          // not forward caller.platform to babel-preset-expo's web: {} options.
          ...(isWeb && { worklets: false, reanimated: false }),
          web: {
            worklets: false,
            reanimated: false,
          },
        },
      ],
    ],
  };
};
