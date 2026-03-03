import { task, logger } from "@trigger.dev/sdk/v3";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import * as fs from "fs";
import * as path from "path";

// Point fluent-ffmpeg at the static binary
if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
    logger.info("[FFmpeg] Binary path set:", { ffmpegStatic });
}

interface ProcessMediaPayload {
    type: "crop-image" | "extract-frame";
    inputPath: string;
    outputPath: string;
    crop?: { x: number; y: number; width: number; height: number };
    timestamp?: number;
}

export const processMedia = task({
    id: "process-media",
    run: async (payload: ProcessMediaPayload) => {
        const { type, inputPath, outputPath, crop, timestamp } = payload;

        // 1. Normalize to absolute path
        const absInput = path.resolve(inputPath);
        const absOutput = path.resolve(outputPath);

        logger.info("[processMedia] Start", { type, absInput, absOutput });

        // 2. Validate file existence and readability
        if (!fs.existsSync(absInput)) {
            const errMsg = `[processMedia] Input file does NOT exist: ${absInput}`;
            logger.error(errMsg);
            throw new Error(errMsg);
        }

        const stats = fs.statSync(absInput);
        logger.info("[processMedia] File verified", {
            path: absInput,
            sizeBytes: stats.size,
            sizeMB: (stats.size / 1024 / 1024).toFixed(2),
        });

        if (stats.size === 0) {
            throw new Error(`[processMedia] Input file is empty (0 bytes): ${absInput}`);
        }

        // 3. Ensure output directory exists
        const outDir = path.dirname(absOutput);
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }

        // 4. Run FFmpeg
        return new Promise((resolve, reject) => {
            const command = ffmpeg(absInput);

            if (type === "crop-image") {
                if (!crop) return reject(new Error("Crop dimensions are required."));
                command
                    .videoFilters([
                        `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`,
                        `scale='min(1200,iw)':'min(1200,iw)*ih/iw'`,
                    ])
                    .outputOptions(["-q:v 2"]);
            } else if (type === "extract-frame") {
                if (timestamp === undefined)
                    return reject(new Error("Timestamp is required for extract-frame."));
                command
                    .seekInput(timestamp)
                    .frames(1)
                    .outputOptions(["-q:v 2", "-update 1"]);
            } else {
                return reject(new Error(`Unknown process type: ${type}`));
            }

            command
                .on("start", (cmdLine) => {
                    logger.info("[processMedia] FFmpeg command:", { cmdLine });
                })
                .on("end", () => {
                    // Verify output was created
                    if (fs.existsSync(absOutput)) {
                        const outStats = fs.statSync(absOutput);
                        logger.info("[processMedia] Success", {
                            outputPath: absOutput,
                            outputSize: outStats.size,
                        });
                        resolve({ success: true, outputPath: absOutput });
                    } else {
                        reject(new Error("FFmpeg completed but output file was not created."));
                    }
                })
                .on("error", (err) => {
                    logger.error("[processMedia] FFmpeg FAILED", {
                        error: err.message,
                        inputPath: absInput,
                        inputSize: stats.size,
                    });
                    reject(new Error(`FFmpeg failed: ${err.message}`));
                })
                .save(absOutput);
        });
    },
});
