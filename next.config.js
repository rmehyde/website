const withMDX = require('@next/mdx')();

/** @type {import('next').NextConfig} */
const nextConfig = {
    pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
    output: 'standalone',
    typescript: {
        ignoreBuildErrors: true,
    },

    webpack(config, { isServer }) {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
        };

        config.module.rules.push({
            test: /\.ya?ml$/,
            use: 'js-yaml-loader',
        });

        return config;
    },
}

module.exports = withMDX(nextConfig);
