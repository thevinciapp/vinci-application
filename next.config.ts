/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SUPPORTED_MODELS: process.env.SUPPORTED_MODELS,
    NEXT_PUBLIC_MODEL_PROVIDERS: process.env.MODEL_PROVIDERS,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'unpkg.com',
        pathname: '/@lobehub/**',
      },
      {
        protocol: 'https',
        hostname: 'registry.npmmirror.com',
        pathname: '/@lobehub/**',
      }
    ],
  },
  transpilePackages: ['@lobehub/icons'],
};

export default nextConfig;
