/**
 * Centralized environment variable configuration.
 *
 * Validates required environment variables lazily (on access)
 * and exports a strongly-typed config object.
 *
 * Usage:
 *   import { env } from '@/lib/env';
 *   const key = env.GEMINI_API_KEY;
 */

function getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function getOptionalEnv(name: string, fallback: string): string {
    return process.env[name] || fallback;
}

/** Typed environment config — all getters are lazy (only validated on access). */
export const env = {
    // ---------- Server-only ----------
    get DATABASE_URL() {
        return getRequiredEnv("DATABASE_URL");
    },
    get GEMINI_API_KEY() {
        return getRequiredEnv("GEMINI_API_KEY");
    },
    get CLERK_SECRET_KEY() {
        return getRequiredEnv("CLERK_SECRET_KEY");
    },
    get TRIGGER_SECRET_KEY() {
        return getRequiredEnv("TRIGGER_SECRET_KEY");
    },
    get TRIGGER_PROJECT_ID() {
        return getOptionalEnv("TRIGGER_PROJECT_ID", "proj_nwdktkxropfbbbgfpxdc");
    },

    // ---------- Public (available client + server) ----------
    get NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY() {
        return getRequiredEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    },

    // ---------- Helpers ----------
    get NODE_ENV() {
        return getOptionalEnv("NODE_ENV", "development");
    },
    get isProduction() {
        return process.env.NODE_ENV === "production";
    },
};

/**
 * Run a full validation of all required env vars.
 * Call this at app startup (e.g. in layout.tsx).
 * Throws in production, warns in development.
 */
export function validateAllEnv(): void {
    const required = [
        "DATABASE_URL",
        "GEMINI_API_KEY",
        "CLERK_SECRET_KEY",
        "TRIGGER_SECRET_KEY",
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    ] as const;

    const missing = required.filter((name) => !process.env[name]);

    if (missing.length > 0) {
        const msg = `Missing required environment variables:\n  ${missing.join("\n  ")}`;
        if (process.env.NODE_ENV === "production") {
            throw new Error(msg);
        } else {
            console.warn(`⚠️  ENV WARNING: ${msg}`);
        }
    }
}
