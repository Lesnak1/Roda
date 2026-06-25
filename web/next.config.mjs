/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Security: Remove X-Powered-By header to prevent fingerprinting
  compress: true, // Performance: Enable gzip/brotli compression for assets

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };
    return config;
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY", // Security: Prevent Clickjacking attacks
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff", // Security: Prevent MIME sniffing
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin", // Security: Protect referrer leakage
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()", // Security: Restrict browser hardware API usage
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload", // Security: Enforce HTTPS connections
          },
        ],
      },
    ];
  },
};

export default nextConfig;
