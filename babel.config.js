module.exports = (api) => {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          web: {
            // Disable react-native-worklets Babel plugin for web builds.
            // The plugin resolves native-only modules that don't exist in
            // Vercel's web build environment, causing Metro compilation to fail.
            worklets: false,
          },
        },
      ],
    ],
  };
};
