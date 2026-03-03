import { NextResponse } from "next/server";
import * as fs from "fs/promises";
import { existsSync, mkdirSync, appendFileSync, statSync } from "fs";
import * as path from "path";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Sanitize filename: remove spaces/special chars, prefix with timestamp.
 */
function sanitizeFilename(name: string): string {
    const ext = path.extname(name);
    const base = path.basename(name, ext);
    const clean = base.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
    return `${Date.now()}-${clean}${ext}`;
}

export async function POST(req: Request) {
    try {
        const xFileName = req.headers.get("x-filename");
        const chunkIndex = req.headers.get("x-chunk-index");     // "0", "1", "2", ...
        const totalChunks = req.headers.get("x-total-chunks");   // e.g. "5"
        const uploadId = req.headers.get("x-upload-id");         // unique per upload session
        const totalSize = req.headers.get("x-total-size");       // total file size in bytes

        if (!xFileName) {
            return NextResponse.json(
                { success: false, error: "Missing x-filename header." },
                { status: 400 }
            );
        }

        // Ensure directories exist
        const tmpDir = path.join(process.cwd(), "tmp");
        const publicDir = path.join(process.cwd(), "public", "uploads");
        if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
        if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

        // Read this chunk as binary buffer
        const arrayBuffer = await req.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        logger.info("[Upload] Chunk received:", {
            filename: xFileName,
            chunkIndex,
            totalChunks,
            uploadId,
            chunkSize: buffer.length,
        });

        // --- CHUNKED UPLOAD MODE ---
        if (chunkIndex !== null && totalChunks !== null && uploadId !== null) {
            const idx = parseInt(chunkIndex);
            const total = parseInt(totalChunks);

            // Use uploadId as temp filename for assembly
            const tempFile = path.join(tmpDir, `upload-${uploadId}.part`);

            // Append this chunk to the temp file
            appendFileSync(tempFile, buffer);

            const currentSize = statSync(tempFile).size;
            logger.info("[Upload] Chunk appended:", {
                chunkIndex: idx,
                totalChunks: total,
                currentFileSize: currentSize,
            });

            // If this is NOT the last chunk, return progress
            if (idx < total - 1) {
                return NextResponse.json({
                    success: true,
                    complete: false,
                    chunksReceived: idx + 1,
                    totalChunks: total,
                });
            }

            // LAST CHUNK — file is complete
            const finalName = sanitizeFilename(xFileName);
            const finalTmpPath = path.join(tmpDir, finalName);
            const finalPublicPath = path.join(publicDir, finalName);

            // Rename temp file to final name
            await fs.rename(tempFile, finalTmpPath);

            // Copy to public for web serving
            await fs.copyFile(finalTmpPath, finalPublicPath);

            const finalStats = await fs.stat(finalTmpPath);
            logger.info("[Upload] COMPLETE:", {
                finalPath: finalTmpPath,
                finalSize: finalStats.size,
                sizeMB: (finalStats.size / 1024 / 1024).toFixed(2),
                expectedSize: totalSize,
            });

            return NextResponse.json({
                success: true,
                complete: true,
                filePath: finalTmpPath,
                publicUrl: `/uploads/${finalName}`,
            });
        }

        // --- SINGLE-SHOT UPLOAD MODE (small files, < 10MB) ---
        const filename = sanitizeFilename(xFileName);
        const tmpPath = path.resolve(tmpDir, filename);

        await fs.writeFile(tmpPath, buffer);

        // Copy to public
        const publicPath = path.join(publicDir, filename);
        await fs.copyFile(tmpPath, publicPath);

        const stats = await fs.stat(tmpPath);
        logger.info("[Upload] Single-shot complete:", {
            filename,
            size: stats.size,
            sizeMB: (stats.size / 1024 / 1024).toFixed(2),
        });

        return NextResponse.json({
            success: true,
            complete: true,
            filePath: tmpPath,
            publicUrl: `/uploads/${filename}`,
        });
    } catch (e: any) {
        logger.error("[Upload] Error:", e.message);
        return NextResponse.json(
            { success: false, error: e.message || "Upload failed." },
            { status: 500 }
        );
    }
}
