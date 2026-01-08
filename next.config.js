/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker production output
  output: 'standalone',
  
  // Production optimizations
  swcMinify: true,
  compress: true,
  
  // Image optimization
  images: {
    domains: ['images.unsplash.com', 'avatars.githubusercontent.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Experimental features
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
  },

  // Performance optimizations
  poweredByHeader: false,
  generateEtags: true,
  reactStrictMode: true,
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Enterprise-grade security headers
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
    
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Disable legacy XSS protection (use CSP instead)
          {
            key: 'X-XSS-Protection',
            value: '0',
          },
          // Referrer policy
          {
            key: 'Referrer-Policy',
            value: 'no-referrer',
          },
          // Permissions policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Strict Transport Security (HSTS) - only in production
          ...(isDev ? [] : [{
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          }]),
          // Content Security Policy (relaxed for dev, strict with nonce for prod)
          {
            key: 'Content-Security-Policy',
            value: isDev ? [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              `connect-src 'self' ${apiUrl} ${wsUrl} ws: wss: http: https: https://urlhaus-api.abuse.ch https://www.cisa.gov http://ip-api.com`,
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; ') : [
              "default-src 'self'",
              "script-src 'self' 'strict-dynamic' 'nonce-NONCE_PLACEHOLDER'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              `connect-src 'self' ${apiUrl} ${wsUrl} ws: wss: https: https://urlhaus-api.abuse.ch https://www.cisa.gov http://ip-api.com`,
              "frame-src 'self' https://calendly.com",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
              "block-all-mixed-content",
            ].join('; '),
          },
        ],
      },
    ];
  },
  
  // Webpack configuration for bundle analysis
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: './bundle-analysis.html',
          openAnalyzer: false,
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;
