/* Required packages */
require('dotenv').config({path: __dirname + '/./../../.env'})

let path = require('path'),
    webpack = require('webpack'),
    browserSyncPlugin = require('browser-sync-webpack-plugin'),
    miniCSSExtractPlugin = require('mini-css-extract-plugin'),
    {CleanWebpackPlugin} = require('clean-webpack-plugin'),
    copyPlugin = require('copy-webpack-plugin'),
    fs = require('fs'),
    yaml = require('js-yaml'),
    CssnanoPlugin = require('cssnano-webpack-plugin'),
    htmlParser = require('./modules/html-parser.js'),
    TerserPlugin = require('terser-webpack-plugin')

async function config()
{
    // Generate the new theme path folder form boilerplate.yaml
    let themeConfig = fs.readFileSync(path.join(__dirname, 'boilerplate.yaml'), 'utf8'),
        data = yaml.safeLoad(themeConfig),
        from = path.resolve(`../${data.themeName}-src`),
        to = path.resolve(`../${data.themeName}`),
        publicPath = path.join('themes', data.themeName),
        appPort = process.env.APP_PORT ?? '80',
        proxy = `${process.env.APP_URL}:${appPort}`

    let HTMLPlugins = await htmlParser(from, to, ['htm', 'html', 'txt'])

    let filesToCopy = [{from: path.join(from, 'new-theme.yaml'), to: path.join(to, 'theme.yaml')}, {from: path.join(from, 'version.yaml')}]
    let pathToThemePreviewFile = path.join(from, 'assets/images/theme-preview.png')
    if (fs.existsSync(pathToThemePreviewFile)) {
        filesToCopy.push({from: pathToThemePreviewFile})
    }
    let pathToThemeConfigDir = path.join(from, 'config')
    if (fs.existsSync(pathToThemeConfigDir)) {
        filesToCopy.push({from: pathToThemeConfigDir, to: 'config'})
    }

    return {
        stats: { children: false },
        entry: {
            context: from,
        },
        output: {
            filename: 'assets/javascript/theme.js',
            path: to,
            publicPath: publicPath
        },
        resolveLoader: {
            modules: ['node_modules', 'custom_loaders']
        },
        plugins: [
            new webpack.ProgressPlugin(),
            new browserSyncPlugin({
                host: 'localhost',
                port: 3000,
                proxy
            }),
            new miniCSSExtractPlugin({
                filename: 'assets/css/theme.css',
                chunkFilename: '[id]-[hash].css',
            }),
            ... process.env.NODE_ENV === 'production' ? [
                new CleanWebpackPlugin()
            ] : [],
            new copyPlugin(filesToCopy, {copyUnmodified: true})
        ].concat(HTMLPlugins),
        module: {
            rules: [{
                test: /\.p?css$/,
                use: [ miniCSSExtractPlugin.loader, 'css-loader', 'postcss-loader' ],
            },{
                test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
                loader: 'file-loader',
                options: {
                    name: '[name].[ext]',
                    outputPath: (url, resourcePath, context) => path.relative(from, resourcePath)
                }
            },{
                test: /\.(webp|png|jpe?g|gif|svg|ico)$/i,
                loader: 'file-loader',
                options: {
                    name: '[name].[ext]',
                    outputPath: (url, resourcePath, context) => path.relative(from, resourcePath)
                }
            },{
                test: /\.(html?|txt)$/i,
                loader: 'theme-filter-loader',
                options: {
                    from: from
                }
            }],
        },
        optimization: {
            minimizer: [
                new CssnanoPlugin(),
                new TerserPlugin()
            ]
        }
    }
}

module.exports = config();

