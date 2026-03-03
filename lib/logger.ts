/**
 * Centralized logger to control console output across the application.
 * Suppresses info and warn logs in production to keep logs clean and secure.
 *
 * Uses process.env.NODE_ENV directly (safe for both client and server).
 */

const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
    info: (message: string, ...args: any[]) => {
        if (!isProduction) {
            console.log(`[INFO] ${message}`, ...args);
        }
    },
    warn: (message: string, ...args: any[]) => {
        if (!isProduction) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    },
    error: (message: string, ...args: any[]) => {
        // Errors are always logged
        console.error(`[ERROR] ${message}`, ...args);
    },
    debug: (message: string, ...args: any[]) => {
        if (!isProduction) {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    }
};
