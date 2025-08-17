const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node', // vscode extensions run in a Node.js-context
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'out' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    clean: true // Clean the output directory before emit
  },
  externals: {
    vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: process.env.NODE_ENV === 'production'
            }
          }
        ]
      }
    ]
  },
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'nosources-source-map',
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  },
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
    usedExports: true,
    sideEffects: false
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.EXTENSION_VERSION': JSON.stringify(require('./package.json').version)
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'media',
          to: 'media',
          noErrorOnMissing: true
        }
      ]
    })
  ]
};

// Configuration for webview UI
const webviewConfig = {
  target: 'web',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: {
    'configuration-webview': './webview-ui/configuration/index.ts',
    'preview-webview': './webview-ui/preview/index.ts',
    'template-management': './webview-ui/template-management/index.ts',
    'performance-monitoring': './webview-ui/performance-monitoring/index.ts'
  },
  output: {
    path: path.resolve(__dirname, 'out', 'webview-ui'),
    filename: '[name].js',
    libraryTarget: 'umd',
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'webview-ui')
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, 'webview-ui/tsconfig.json'),
              transpileOnly: process.env.NODE_ENV === 'production'
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource'
      }
    ]
  },
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'nosources-source-map',
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
    usedExports: true,
    sideEffects: false,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    })
  ]
};

module.exports = [config, webviewConfig];