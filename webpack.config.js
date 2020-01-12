/* Required packages */
require('dotenv').config({ path: __dirname + '/./../../.env' })

let path = require('path'),
    browserSyncPlugin = require('browser-sync-webpack-plugin'),
    miniCSSExtractPlugin = require('mini-css-extract-plugin'),
    HTMLWebpackPlugin = require('html-webpack-plugin'),
    { CleanWebpackPlugin } = require('clean-webpack-plugin'),
    purgecssPlugin = require('purgecss-webpack-plugin'),
    uglifyJsPlugin = require('uglifyjs-webpack-plugin'),
    optimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin'),
    fs = require('fs'),
    glob = require('glob'),

    /* Defining paths */
    from = path.resolve('./src/'),
    to = path.resolve('./'),
    themeAssetsUrl = process.env.APP_URL + '/' + path.join('themes', path.basename(__dirname), 'assets/'),

    /* Plugins to register */
    plugins = [
        new browserSyncPlugin({
            host: 'localhost',
            port: 3000,
            proxy: process.env.APP_URL+':80'
        }),
        new miniCSSExtractPlugin({
            filename: 'css/theme-[hash].css',
            chunkFilename: '[id]-[hash].css',
        }),
        new purgecssPlugin({
            paths: () => glob.sync(from+'/**/*', { nodir: true }),
            defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
        }),
        new CleanWebpackPlugin()
    ]

async function config() {

    await filewalker(from, ['htm', 'html', 'txt'], addHTMLWebpackObject);

    return {
        mode: 'development',
        entry: {
            javascript: from + '/index.js'
        },
        output: {
            filename: 'javascript/theme-[hash].js',
            path: to + '/assets/',
            publicPath: themeAssetsUrl
        },
        devServer: {
            contentBase: path.join(__dirname),
            compress: true,
            port: 9000,
            hot: true
        },
        plugins: plugins,
        optimization: {
            minimizer: [
                new uglifyJsPlugin({
                    test: /\.js(\?.*)?$/i,
                }),
                new optimizeCSSAssetsPlugin({
                    test: /\.css$/
                })
            ]
        },
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: [
                        {
                            loader: miniCSSExtractPlugin.loader,
                            options: {
                                publicPath: '../'
                            }
                        },
                        {
                            loader: 'css-loader',
                            options: {
                                importLoaders: 1
                            }
                        },
                        'postcss-loader'
                    ],
                },
                {
                    test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
                    loader: 'file-loader',
                    options: {
                        name: 'fonts/[name].[ext]'
                    }
                },
                {
                    test: /\.(png|jpe?g|gif|svg|ico)$/i,
                    loader: 'file-loader',
                    options: {
                        name: 'images/[name].[ext]',
                        esModule: false
                    }
                }
            ],
        },
    }
}

module.exports = config();


/**
 * Explores recursively a directory and returns all the filepaths and folderpaths in the callback.
 *
 * @base from  http://stackoverflow.com/a/5827895/4241030
 * @param {String} dir
 * @param {String} ext
 * @param {Function} done
 */
function filewalker(dir, ext, done) {
    return new Promise(resolve => {
        let results = [];

        fs.readdir(dir, function (err, list) {
            if (err) return done(err);

            var pending = list.length;

            if (!pending) return done(null, results);

            list.forEach(function (file) {
                file = path.resolve(dir, file);

                fs.stat(file, async function (err, stat) {
                    // If directory, execute a recursive call
                    if (stat && stat.isDirectory()) {
                        filewalker(file, ext, async function (err, res) {
                            results = results.concat(res);
                            if (!--pending) {
                                await done(null, results);
                                resolve();
                            }
                        });
                    } else {
                        // If extension matches
                        if (ext.includes(path.extname(file).substring(1))) {
                            results.push({
                                output_filename: path.relative(from, file),
                                template: file,
                                is_layout: path.basename(path.dirname(file)) === 'layouts'
                            });
                        }
                        // If last file to check
                        if (!--pending) {
                            await done(null, results);
                            resolve();
                        }
                    }
                });
            });
        });
    });
};

/**
 * Create new HTML Webpack Objects from an array of input/output path
 *
 * @param {String} err
 * @param {Object} data
 */
function addHTMLWebpackObject(err, data) {
    return new Promise((resolve, reject) => {
        if (err) {
            reject(err);
        }

        data.forEach((HTMLElement, key, data) => {
            plugins.push(
                new HTMLWebpackPlugin({
                    filename: to + "/" + HTMLElement.output_filename,
                    template: HTMLElement.template,
                    inject: HTMLElement.is_layout,
                    minify: true,
                    open: true,
                    inject:false
                })
            )
            if (Object.is(data.length - 1, key)) resolve();
        });
    });
}
