const path = require("path");
const publicPath = "";
const webpack = require("webpack")
const CopyWebpackPlugin = require("copy-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const { TsConfigPathsPlugin } = require('awesome-typescript-loader');

module.exports = env => {

  const outputDir = "build";
  let config = {
    entry: ["./src/App.tsx"],
    mode: env,
    devtool: "source-map",
    output: {
      filename: "./bundle.js",
      path: path.resolve(__dirname, outputDir),
      publicPath: "/"
    },
    optimization: {
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false
      /*
      minimizer: [
        // we specify a custom UglifyJsPlugin here to get source maps in production
        new UglifyJsPlugin({
          cache: true,

          parallel: true,
          uglifyOptions: {
            compress: true,
            ecma: 6,
            mangle: { reserved: ["Discriminator"] },
            keep_fnames: true
          },
          sourceMap: false
        })
      ]
      */
    },
    resolve: {
      plugins: [new TsConfigPathsPlugin({ configFile: "./tsconfig.json" })],
      extensions: [".js", ".jsx", ".json", ".ts", ".tsx"],
      mainFields: ['module', 'browser', 'main'],
      

    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          loader: "ts-loader",
          options: {
            transpileOnly: true,
            experimentalWatchApi: true,
          },
        },
        {
          test: /\.scss$/,
          use: [
            {
              loader: "style-loader"
            },
            {
              loader: "css-loader"
            },
            {
              loader: "sass-loader"
            }
          ]
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: "style-loader"
            },
            {
              loader: "css-loader"
            }
          ]
        },
        {
          test: /\.ttf$/,
          use: ['file-loader']
        },
        {
          test: /\.svg$/,
          loader: 'svg-inline-loader'
        },
        {
          test: /\.(png|jpe?g|gif|mp3)$/i,
          loader: 'file-loader'
        }
      ]
    },
    plugins: [
      new MonacoWebpackPlugin({
        languages: ['python']
        }),
      new CopyWebpackPlugin([{ from: "deploy", to: path.join(__dirname, outputDir) }]),
      new ForkTsCheckerWebpackPlugin({tsconfig: "./tsconfig.json", silent: false})
    ]
  }

  if (env != "production") {
    config.devServer = {
      compress: false,
      host: "localhost",
      hot: true,
      port: 1111,
      https: false,
      historyApiFallback: true,
      watchContentBase: false,
      overlay: {
        warnings: true,
        errors: true
      },
    }
  }
  return config;
};