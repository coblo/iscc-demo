var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
var CompressionPlugin = require('compression-webpack-plugin');

module.exports = function (env) {

	env = env || {}

	return [
		{
			entry: './resources/js/main.js',
			devServer: {
				inline: true,
				hot: true,
				hotOnly: true,
				headers: {
					"Access-Control-Allow-Origin": "*"
				}
			},
			output: {
				// maybe there's a better way to define this but I didn't experiment
				path: __dirname,
				filename: 'build/js/build.js', // this is what is printed in the log, so whole path here
				publicPath: env.server ? 'http://localhost:8080/' : ''
			},
			module: {
				rules: [
					{
						test: /\.vue$/,
						use: {
							loader: 'vue-loader',
							options: {
								loaders: {
									// This is where loaders for '<script lang="...">' and '<style lang="...">' blocks are configured. We
									// currently don't have any styles in .vue components, so the only configuration is 'js' because the
									// default 'lang' for <script> blocks is 'js'. The default for this is 'babel-loader' without any
									// preset by the way - a questionable choice.

									// It seems only the query-string syntax is supported, so only options that can be given as a
									// query-string can be given to loaders here. Fortunately the query-string can at least be JSON.
									js: 'babel-loader?{presets:[["es2015", {modules: false}]], plugins:["transform-runtime"]}'
								},
								// There is specific support for PostCSS in vue-loader, so we don't just feed css through postcss-loader
								postcss: [require('postcss-cssnext')()]
							}
						}
					},
					{
						// This is for the javascript directly in main.js (i.e. not from a .vue component)
						test: /\.js$/,
						use: { loader: 'babel-loader', options: { presets: [['es2015', { modules: false }]], plugins: ['transform-runtime'] } },
						exclude: /node_modules/ // there are .js in node_modules too, but they are(?) already precompiled
					},
					{
						// for images used in .vue components
						test: /\.(jpg|png|gif|svg)/,
						use: {
							loader: 'file-loader',
							options: {
								name: 'images/[hash].[ext]', // this is what will be appended to __webpack_public_path__ set in main.js
								outputPath: 'build/',
								publicPath:
								env.server ?
								'http://localhost:8080/build/' :
								'' // Note: this works in file-loader 0.10.1, while in file-loader 0.11.1 the outputPath is
								// also appended. It might work again in later versions, as it is a known bug in 0.11.1.
							}
						}
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

				// Pikaday has a dependency on Moment.js (even though the documentation says otherwise) and Moment.js in turn
				// has `require('./locale/'+name)` in its code. Webpack understands this and derives two variables from this:
				// the "context" `.../moment/locale` and the regex `^.*$`, which means that every file from
				// `node_modules/moment/locale` should be bundled.
				// The following line tells Webpack: whenever you are about to bundle files from a context (directory) matching
				// `/moment[\/\\]locale$/` don't use your derived regex but instead use the regex `/de.js$/` to find files to
				// bundle:
				new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /de.js$/)
			].concat(env.live ? [
				// only on live build:

				// This performs a string replacement from `process.env.NODE_ENV` to `'production'` which will lead to
				// conditions like `if ('production' != 'production')` for debug code, which will then be detected and removed
				// by the minifier:
				new webpack.DefinePlugin({
					'process.env.NODE_ENV': JSON.stringify('production')
				}),

				// This does the actual minification:
				new webpack.optimize.UglifyJsPlugin({}),

				// This provides a .gz file for serving with "gzip_static on;"
				new CompressionPlugin({}),
			] : []).concat(env.server ? [
				// only when dev-server is enabled:

				new webpack.HotModuleReplacementPlugin()
			] : []),
			devtool: env.live ? false : 'cheap-module-source-map' // the only one that works: https://github.com/webpack/webpack/issues/2145#issuecomment-294361203
		}
	];
};
