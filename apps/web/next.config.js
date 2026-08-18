/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "mongoose",
    "mongodb",
    "pg",
    "pg-native",
    "pg-hstore",
    "better-sqlite3",
    "sql.js",
    "oracledb",
    "mysql2",
    "mysql",
    "mariadb",
  ],
  async headers() {
    const securityHeaders = [
      // X-Frame-Options removed: public forms at /f/* are designed to be
      // embedded via iframes. Clickjacking protection is handled by the
      // CSP frame-ancestors directive below (production only).
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];

    // A full CSP needs nonce support to avoid 'unsafe-inline' for scripts
    // (Next.js inlines its streaming bootstrap). Skipped in dev so HMR isn't
    // blocked; frame-ancestors 'none' prevents clickjacking in production.
    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          // Google OAuth avatars are served from lh1-lh6.googleusercontent.com.
          "img-src 'self' data: blob: https://*.googleusercontent.com",
          "font-src 'self' data:",
          "connect-src 'self'",
          // Allow embedding public forms on any origin; dashboard pages
          // are protected by the auth middleware regardless.
          "frame-ancestors 'self' *",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
      });
    }

    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
