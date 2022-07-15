/* eslint-disable import/no-extraneous-dependencies */
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: path.join(
    __dirname,
    'src',
    'javascripts',
    'crosswords',
    'crossword.js',
  ),
  externals: {
    react: 'react',
    'react-dom': 'react-dom',
  },
  output: {
    filename: 'index.js',
    path: path.join(__dirname, 'lib'),
    libraryTarget: 'commonjs2',
  },
  resolve: {
    modules: [
      path.join(__dirname, 'src', 'javascripts'),
      path.join(__dirname, 'src', 'stylesheets'),
      'node_modules', // default location, but we're overiding above, so it needs to be explicit
    ],
    alias: {
      svgs: path.join(__dirname, 'src', 'svgs'),
    },
  },
  resolveLoader: {
    modules: [
      'node_modules',
    ],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
      {
        test: /\.svg$/,
        exclude: /node_modules/,
        loader: 'svg-inline-loader',
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader', // creates style nodes from JS strings
          'css-loader', // translates CSS into CommonJS
          'sass-loader', // compiles Sass to CSS, using Node Sass by default
        ],
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
};
