import { z } from "zod";

/**
 * Vernacular AI Strict Environment Schema (Zero-Leak Posture)
 * Validates process.env during build and runtime to prevent hardcoded secrets
 * or execution with unconfigured environments.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_URL is required.")
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL."),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(10, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required and must be a valid key."),
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .optional()
    .default("http://127.0.0.1:8000"),
  NEXT_PUBLIC_BACKEND_URL: z
    .string()
    .url()
    .optional()
    .default("http://127.0.0.1:8000"),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .optional()
    .default("https://vernacular-storefront.onrender.com"),
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: z
    .string()
    .optional()
    .default(""),
});

export type EnvSchema = z.infer<typeof envSchema>;

export const validateEnv = (rawEnv: Record<string, string | undefined> = process.env): EnvSchema => {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - [${issue.path.join(".")}] ${issue.message}`)
      .join("\n");

    const message = [
      "",
      "================================================================================",
      "CRITICAL DEVSECOPS SECURITY ERROR: MISSING REQUIRED ENVIRONMENT VARIABLES",
      "================================================================================",
      "Vernacular AI enforces strict fail-fast environment validation.",
      "The following variables are missing or invalid:",
      errorDetails,
      "",
      "Resolution:",
      "1. Ensure frontend/.env.local contains valid keys.",
      "2. Do NOT hardcode secrets into components or scripts.",
      "================================================================================",
      "",
    ].join("\n");

    console.error(message);
    throw new Error("Zero-Leak Policy: Environment validation failed.");
  }

  return result.data;
};

// Fail fast on module load
export const env = validateEnv();
