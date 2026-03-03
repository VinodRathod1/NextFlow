/**
 * Chunked file upload utility.
 *
 * Splits files into chunks that fall under Next.js's ~10MB body limit
 * and uploads them sequentially. The server reassembles the chunks.
 *
 * For files ≤ CHUNK_SIZE, a single request is made (no chunking overhead).
 */

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB per chunk (well under 10MB limit)

interface UploadResult {
    success: boolean;
    filePath: string;   // Absolute disk path (for FFmpeg)
    publicUrl: string;  // Web-accessible URL
    error?: string;
}

export async function uploadFile(
    file: File,
    onProgress?: (percent: number) => void
): Promise<UploadResult> {
    const totalSize = file.size;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.log(`[uploadFile] Starting: ${file.name} (${(totalSize / 1024 / 1024).toFixed(2)} MB, ${totalChunks} chunk(s))`);

    // Single-shot for small files
    if (totalChunks <= 1) {
        const buffer = await file.arrayBuffer();
        const res = await fetch("/api/upload", {
            method: "POST",
            body: buffer,
            headers: {
                "x-filename": file.name,
                "content-type": file.type || "application/octet-stream",
            },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Upload failed");
        onProgress?.(100);
        return data;
    }

    // Chunked upload for large files
    let lastResult: any = null;

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalSize);
        const chunk = file.slice(start, end);
        const buffer = await chunk.arrayBuffer();

        console.log(`[uploadFile] Sending chunk ${i + 1}/${totalChunks} (${buffer.byteLength} bytes)`);

        const res = await fetch("/api/upload", {
            method: "POST",
            body: buffer,
            headers: {
                "x-filename": file.name,
                "content-type": file.type || "application/octet-stream",
                "x-chunk-index": i.toString(),
                "x-total-chunks": totalChunks.toString(),
                "x-upload-id": uploadId,
                "x-total-size": totalSize.toString(),
            },
        });

        const data = await res.json();
        if (!data.success) {
            throw new Error(data.error || `Chunk ${i + 1} upload failed`);
        }

        lastResult = data;
        onProgress?.(Math.round(((i + 1) / totalChunks) * 100));
    }

    if (!lastResult?.complete) {
        throw new Error("Upload incomplete — final chunk not acknowledged.");
    }

    console.log(`[uploadFile] Complete: ${lastResult.publicUrl}`);
    return lastResult;
}
