import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
    // Use environment variable for project ID — set TRIGGER_PROJECT_ID in your hosting provider
    project: process.env.TRIGGER_PROJECT_ID ?? "proj_nwdktkxropfbbbgfpxdc",
    runtime: "node",

    // Use "log" in production to reduce noise, "debug" for local dev
    logLevel: process.env.NODE_ENV === "production" ? "log" : "debug",

    // Max task execution duration in seconds (must be >= 5)
    maxDuration: 60,

    // Directory containing task definitions
    dirs: ["./trigger/tasks"],

    build: {
        // These native packages must be excluded from bundling
        external: ["ffmpeg-static", "fluent-ffmpeg"],
    },
});