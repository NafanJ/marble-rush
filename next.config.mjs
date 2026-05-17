/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Phaser uses browser APIs — exclude from server bundle
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('phaser');
      }
    }
    return config;
  },
};

export default nextConfig;
