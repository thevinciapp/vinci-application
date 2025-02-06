/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SUPPORTED_MODELS: process.env.SUPPORTED_MODELS,
    NEXT_PUBLIC_MODEL_PROVIDERS: process.env.MODEL_PROVIDERS,
  },
};

export default nextConfig;
