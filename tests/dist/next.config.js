"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nextConfig = {
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()',
                    }
                ],
            },
        ];
    },
    async rewrites() {
        return [
            {
                source: '/app/:path*',
                destination: '/:path*',
            },
        ];
    },
};
exports.default = nextConfig;
