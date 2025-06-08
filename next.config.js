
/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // typescript: {
  //   ignoreBuildErrors: true, // Removed to enable TS error checking
  // },
  // eslint: {
  //   ignoreDuringBuilds: true, // Removed to enable ESLint error checking
  // },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
