const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const path = require('path');


module.exports = (env, argv) => {

	env = env || {}
	const currentMode = argv.mode !== undefined ? argv.mode : 'development';

	return [
		{
			mode: currentMode,
			entry: './resources/js/main.js',
			devServer: {
				inline: true,
				hot: true,
				hotOnly: true,
				headers: {
					"Access-Control-Allow-Origin": "*"
				},
				port: 8080
			},
			output: {
				// maybe there's a better way to define this but I didn't experiment
				path: __dirname,
				filename: 'build/js/build.js', // this is what is printed in the log, so whole path here
				publicPath: env.server ? 'http://localhost:8080/' : ''
			},
			stats: {
				children: false,
				hash: false,
				modules: false,
			},
			optimization: {
				minimizer: [
					new TerserPlugin({
						parallel: true,
						cache: true,
					})
				]
			},
			module: {
				rules: [
					{
						test: /\.vue$/,
						use: {
							loader: 'vue-loader',
							options: {
								prettify: false,
								postcss: {
									useConfigFile: false,
									plugins: [
										require('postcss-preset-env')({ stage: 0 }),
									]
								}
							}
						}
					},
					{
						// This is for the javascript directly in main.js (i.e. not from a .vue component)
						test: /\.js$/,
						use: {
							loader: 'babel-loader',
							options: {
								presets: [
									['@babel/env', { modules: false }],
								],
								plugins: [
									'@babel/plugin-transform-runtime',
								]
							}
						},
						include: [
							path.resolve(__dirname, 'resources'),
						],
					},
					{
						// for images used in .vue components
						test: /\.(jpg|png|gif|svg)/,
						use: {
							loader: 'file-loader',
							options: {
								name: 'images/[hash].[ext]', // this is what will be appended to __webpack_public_path__ set in main.js
								outputPath: 'build/',
								publicPath: env.server ? 'http://localhost:8080/build/' : './',
								esModule: false, // https://github.com/webpack/webpack/issues/4742
							}
						}
					},
					{
						test: /\.css$/,
						use: [
							'vue-style-loader',
							{
								loader: 'css-loader',
								options: {
									importLoaders: 2,
								}
							},
							{
								loader: 'postcss-loader',
								options: {
									ident: 'postcss',
									// Note that contrary to postcss-loader documentation, this has to be an array, not a function,
									// otherwise the browserslist cache has no effect, which leads to bad performance:
									plugins: [
										require('postcss-preset-env')({ stage: 0 }),
									]
								}
							}
						],
					}

				]
			},
			resolve: {
				alias: {
					// This is the default (package.module)
					// vue$: 'vue/dist/vue.runtime.esm.js'
				}
			},

			// Plugins are loaded with "new" because we need an instance to hold the configuration
			plugins: [
				// always:

				new VueLoaderPlugin(),
				new MiniCssExtractPlugin({
					filename: 'build/css/[name].css',
				}),
			].concat(currentMode === 'production' ? [
				// only on live build:

				// This provides a .gz file for serving with "gzip_static on;"
				new CompressionPlugin({}),
			] : []).concat(env.server ? [
				// only when dev-server is enabled:

				new webpack.HotModuleReplacementPlugin()
			] : []),
			devtool: currentMode === 'production' ? false : 'cheap-module-source-map' // the only one that works: https://github.com/webpack/webpack/issues/2145#issuecomment-294361203
		}
	];
};
