const path = require('path');
const webpack = require('webpack');
const autoprefixer = require('autoprefixer');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env) => {
  const debug = env === 'debug';
  return {
    name: 'Client',
    target: 'web',
    mode: debug ? 'development' : 'production',
    context: path.resolve(__dirname, 'src'),
    entry: {
      app: [
        path.resolve(__dirname, 'src', 'app.tsx')
      ]
    },
    devtool: debug ? 'source-map' : false,
    resolve: {
      extensions: ['.ts', '.tsx','.js','.jsx'],
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: debug ? 'js/[name].js' : 'js/[name]-[hash].min.js'
    },
    module: {
      rules: [{
        exclude: /(node_modules|bower_components)/,
        test: /\.tsx?$/,
        use: [{
          loader: 'babel-loader',
        },
        {
          loader: 'ts-loader',
        }
        ]
      }, {
        test: /\.css$/,
        use: [{
          loader: 'style-loader'
        }, {
          loader: 'css-loader',
          options: {
            modules: true,
            localIdentName: debug ? '[name]_[local]_[hash:base64:5]' : '[hash]'
          }
        }, {
          loader: 'postcss-loader',
          options: {
            plugins: () => [autoprefixer]
          }
        }]
      }, {
        test: /\.(png|gif|jpg|svg)$/,
        use: [{
          loader: 'url-loader',
          options: {
            limit: 10000,
            name: './images/[hash].[ext]'
          }
        }]
      }, {
        test: /\.(ttf|eot|woff(2)?)(\?[a-z0-9=&.]+)?$/,
        use: [{
          loader: 'file-loader',
          options: {
            name: './fonts/[hash].[ext]'
          }
        }]
      }
      ] // rules
    },
    optimization: {
      minimize: !debug,
      minimizer: debug ? [] : [new TerserPlugin({
        terserOptions: {
          warnings: !debug,
          compress: {
            drop_console: true,
            drop_debugger: true,
          }
        }
      })],
      runtimeChunk: 'single',
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendor",
            chunks: "all",
            priority: -10
          }
        }
      }
    },
    plugins: [
      new webpack.NoEmitOnErrorsPlugin(),
    ],
    devServer: {
      host: '0.0.0.0',
      port: 3100,
      disableHostCheck: true
    },

  };
};
