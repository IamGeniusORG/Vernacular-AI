import { z } from "zod";

/**
 * DevSecOps Fail-Fast Environment Validation (Zero-Leak Policy)
 * Guarantees Next.js will refuse to compile or start in development/production
 * if essential environment variables are not supplied via .env.local.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_URL is required.")
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL."),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(10, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required and must be a valid key."),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("\n================================================================================");
  console.error("CRITICAL DEVSECOPS SECURITY ERROR: ENVIRONMENT VALIDATION FAILED (Next.js)");
  console.error("================================================================================");
  parsed.error.issues.forEach((issue) => {
    console.error(`  - [${issue.path.join(".")}] ${issue.message}`);
  });
  console.error("\nPlease configure frontend/.env.local before running 'next dev' or 'next build'.");
  console.error("Do NOT attempt to hardcode secrets into source files.");
  console.error("================================================================================\n");
  process.exit(1);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jkyghxkkhunmdwzbqtrz.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/shop',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/:path*`, // Proxy to FastAPI Backend
      },
    ];
  },
};

export default nextConfig;
