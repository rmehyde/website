withMDX = require('@next/mdx')();


/** @type {import('next').NextConfig} */
const nextConfig = {
    pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
    output: 'export',

    webpack(config) {

        // // fix for fail to resolve 'fs' from https://stackoverflow.com/a/70995196
        config.resolve.fallback = {

            // if you miss it, all the other options in fallback, specified
            // by next.js will be dropped.
            ...config.resolve.fallback,

            fs: false, // the solution
        };

        // bundle yaml files
        config.module.rules.push({
            test: /\.ya?ml$/,
            use: 'js-yaml-loader',
        });

        // wasem
        config.experiments = {
            asyncWebAssembly: true,
            layers: true,
        };

        // 1. Tell Webpack to treat .wasm files as async WebAssembly modules
        config.module.rules.push({
            test: /\.wasm$/,
            type: 'webassembly/async',
        });

        // 2. Force these wrapper & worker scripts to be parsed as JS,
        //    not as static assets exporting only URLs
        config.module.rules.push({
            test: /(?:XeTeXEngine|DvipdfmxEngine|swiftlatexxetex|dvipdfmx)\.js$/,
            type: 'javascript/auto',
        });

        // 3. Let you import .wasm without specifying the extension
        config.resolve.extensions.push('.wasm');

        return config;
    },
}

module.exports = withMDX(nextConfig);
