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

        return config;
    },
}


module.exports = withMDX(nextConfig);
