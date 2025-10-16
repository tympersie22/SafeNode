module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['nativewind/babel'],
      [
        'module-resolver',
        {
          extensions: ['.ts', '.tsx', '.js', '.json'],
          alias: {
            '@mobile': './src',
            '@shared/crypto': '../frontend/src/crypto/crypto',
            '@shared/types': '../frontend/src/types/vault'
          }
        }
      ],
      'react-native-reanimated/plugin'
    ]
  };
};

