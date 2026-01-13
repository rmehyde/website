withMDX = require('@next/mdx')();


/** @type {import('next').NextConfig} */
const nextConfig = {
    pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
    // flag for static vs server
    output: 'export',
    typescript: {
        ignoreBuildErrors: true,
    },

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

        return config;
    },
}


module.exports = withMDX(nextConfig);
