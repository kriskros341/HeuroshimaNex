/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  experimental: {
    externalDir: true
  },
  transpileModules: [
    "../common.ts",
    "../hex_toolkit.ts"
  ]
}

module.exports = nextConfig;
