const path = require('path');
const baseConfig = require('./webpack.config');

module.exports = {
  mode: 'development',
  entry: {
    jhu: path.join(
      __dirname,
      'jhu',
      'crossword.js',
    ),
  },
  devServer: {
    contentBase: path.join(__dirname, './jhu/'),
    port: 3000,
  },
  output: {
    filename: 'main.js',
    path: path.join(__dirname, 'jhu', 'lib'),
  },
  resolve: baseConfig.resolve,
  resolveLoader: baseConfig.resolveLoader,
  module: baseConfig.module,
};
