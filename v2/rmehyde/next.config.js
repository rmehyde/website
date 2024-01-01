// /** @type {import('next').NextConfig} */
// const nextConfig = {}

// module.exports = nextConfig

// const withMDX = require('@next/mdx')();
// module.exports = withMDX({
//     pageExtensions: ['js', 'jsx', 'mdx']
// })



withMDX = require('@next/mdx')();


/** @type {import('next').NextConfig} */
const nextConfig = {
    pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],

    webpack(config) {

        // fix for fail to resolve 'fs' from https://stackoverflow.com/a/70995196
        config.resolve.fallback = {

            // if you miss it, all the other options in fallback, specified
            // by next.js will be dropped.
            ...config.resolve.fallback,

            fs: false, // the solution
        };

        // MDX loader
        // config.module.rules.push({
        //     test: /\.mdx$/,
        //     use: [
        //         {
        //             loader: '@mdx-js/loader',
        //             options: {
        //                 remarkPlugins: [],
        //                 rehypePlugins: [],
        //             },
        //         },
        //     ],
        // });

        return config;
    },
}


module.exports = withMDX(nextConfig);