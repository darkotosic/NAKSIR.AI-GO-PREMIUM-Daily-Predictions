module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@navigation': './src/navigation',
            '@screens': './src/screens',
            '@components': './src/components',
            '@api': './src/api',
            '@hooks': './src/hooks',
            '@lib': './src/lib',
            '@types': './src/types',
            '@billing': './src/billing',
            '@ads': './src/ads',
            '@state': './src/state',
            '@shared': '../shared',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
