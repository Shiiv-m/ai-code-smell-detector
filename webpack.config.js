const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    'src/popup/popup': './src/popup/popup.js',
    'src/background/background': './src/background/background.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },

  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/popup/popup.html', to: 'src/popup/popup.html' },
        { from: 'src/popup/popup.css', to: 'src/popup/popup.css' },
        { from: 'src/icons', to: 'src/icons', noErrorOnMissing: true },
      ],
    }),
  ],
};
