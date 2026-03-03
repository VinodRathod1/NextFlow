import { NextResponse } from "next/server";
import { tasks, runs } from "@trigger.dev/sdk/v3";
import * as path from "path";
import * as fs from "fs";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, inputPath, crop, timestamp } = body;

        if (!type || !inputPath) {
            return NextResponse.json(
                { success: false, error: "Missing required fields: type, inputPath" },
                { status: 400 }
            );
        }

        // Resolve to absolute path
        const absInput = path.resolve(inputPath);

        // Pre-flight: verify the input file exists on this machine
        if (!fs.existsSync(absInput)) {
            logger.error("[process-media] Input file not found:", { absInput });
            return NextResponse.json(
                { success: false, error: `Input file not found: ${absInput}` },
                { status: 400 }
            );
        }

        const inputStats = fs.statSync(absInput);
        logger.info("[process-media] Input verified:", {
            path: absInput,
            sizeBytes: inputStats.size,
            sizeMB: (inputStats.size / 1024 / 1024).toFixed(2),
        });

        // Output goes to tmp/ directory (same as upload)
        const outputFilename = `processed-${Date.now()}.png`;
        const outputDir = path.join(process.cwd(), "tmp");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const outputPath = path.resolve(outputDir, outputFilename);

        // Build payload for the Trigger task
        const payload = {
            type,
            inputPath: absInput,
            outputPath,
            crop,
            timestamp,
        };

        logger.info("[process-media] Triggering task:", payload);

        const handle = await tasks.trigger("process-media", payload);
        logger.info("[process-media] Task triggered:", { id: handle.id });

        // Poll with timeout
        const pollPromise = runs.poll(handle);
        const timeoutPromise = new Promise<any>((_, reject) =>
            setTimeout(
                () =>
                    reject(
                        new Error(
                            "Task polling timed out. Is the Trigger.dev worker running? (Run: npx trigger dev)"
                        )
                    ),
                30000
            )
        );

        const run = await Promise.race([pollPromise, timeoutPromise]);
        logger.info("[process-media] Task result:", { status: run.status });

        if (run.status === "COMPLETED") {
            const result = run.output as { success: boolean; outputPath: string };
            if (result?.success) {
                // Copy the processed file to public/uploads so it's web-accessible
                const publicDir = path.join(process.cwd(), "public", "uploads");
                if (!fs.existsSync(publicDir)) {
                    fs.mkdirSync(publicDir, { recursive: true });
                }
                const publicPath = path.join(publicDir, outputFilename);
                fs.copyFileSync(result.outputPath, publicPath);

                return NextResponse.json({
                    success: true,
                    publicUrl: `/uploads/${outputFilename}`,
                });
            } else {
                return NextResponse.json(
                    { success: false, error: "Task completed but returned failure." },
                    { status: 500 }
                );
            }
        } else {
            return NextResponse.json(
                {
                    success: false,
                    error: run.error?.message || `Task failed with status: ${run.status}`,
                },
                { status: 500 }
            );
        }
    } catch (error: any) {
        logger.error("[process-media] Error:", error.message);
        return NextResponse.json(
            { success: false, error: error.message || "Internal server error." },
            { status: 500 }
        );
    }
}
