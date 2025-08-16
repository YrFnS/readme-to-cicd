const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

/**@type {import('webpack').Configuration}*/
const extensionConfig = {
  target: 'node', // VS Code extensions run in a Node.js-context
  mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'out' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  },
};

/**@type {import('webpack').Configuration}*/
const webviewConfig = {
  target: ['web', 'es2020'],
  mode: 'none',
  entry: {
    configuration: './webview-ui/configuration/index.tsx',
    preview: './webview-ui/preview/index.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'out', 'webview'),
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: [/node_modules/, /test/, /\.test\./],
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                jsx: 'react-jsx'
              },
              transpileOnly: true
            }
          }
        ]
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-react']
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'webview-ui/**/*.html',
          to: '[name][ext]',
          context: '.',
          noErrorOnMissing: true
        },
        {
          from: 'webview-ui/**/*.css',
          to: '[name][ext]',
          context: '.',
          noErrorOnMissing: true
        },
        {
          from: 'media/**/*',
          to: '../media/[name][ext]',
          context: '.'
        }
      ]
    })
  ],
  devtool: 'nosources-source-map'
};

module.exports = [extensionConfig, webviewConfig];