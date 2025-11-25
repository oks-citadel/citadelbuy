const path = require('path');
const nodeExternals = require('webpack-node-externals');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = function (options, webpack) {
  return {
    ...options,
    entry: './src/main.ts',
    externals: [
      nodeExternals({
        allowlist: ['webpack/hot/poll?100'],
      }),
    ],
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    mode: 'production',
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      plugins: [
        new TsconfigPathsPlugin({
          configFile: './tsconfig.json',
        }),
      ],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@/common': path.resolve(__dirname, 'src/common'),
        '@/modules': path.resolve(__dirname, 'src/modules'),
        '@/config': path.resolve(__dirname, 'src/config'),
      },
    },
    plugins: [
      ...options.plugins,
      new webpack.IgnorePlugin({
        checkResource(resource) {
          const lazyImports = [
            '@nestjs/microservices',
            '@nestjs/microservices/microservices-module',
            '@nestjs/websockets/socket-module',
            'cache-manager',
            'class-validator',
            'class-transformer',
            'mock-aws-s3',
            'aws-sdk',
            'nock',
          ];
          if (!lazyImports.includes(resource)) {
            return false;
          }
          try {
            require.resolve(resource);
          } catch (err) {
            return true;
          }
          return false;
        },
      }),
    ],
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'dist'),
    },
  };
};
