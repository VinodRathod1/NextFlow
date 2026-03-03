import { NextResponse } from "next/server";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { env } from "@/lib/env";

const llmRequestSchema = z.object({
    prompt: z.string().min(1, "Prompt is required"),
    systemPrompt: z.string().optional(),
    images: z.array(z.object({
        base64: z.string(),
        mimeType: z.string()
    })).optional()
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const body = await req.json();
    const validation = llmRequestSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: validation.error.issues }, { status: 400 });
    }

    const { prompt, systemPrompt, images } = validation.data;
    const apiKey = env.GEMINI_API_KEY;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt || undefined,
        });

        // Prepare parts: text + images
        const parts: (string | Part)[] = [prompt];

        if (images && Array.isArray(images)) {
            images.forEach((img: any) => {
                if (img.base64 && img.mimeType) {
                    parts.push({
                        inlineData: {
                            data: img.base64,
                            mimeType: img.mimeType
                        }
                    });
                }
            });
        }

        const result = await model.generateContentStream(parts);

        // Create a ReadableStream to stream the response
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        if (chunkText) {
                            controller.enqueue(encoder.encode(chunkText));
                        }
                    }
                    controller.close();
                } catch (err: any) {
                    logger.error("Streaming error:", err);
                    controller.error(err);
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
            },
        });

    } catch (error: any) {
        logger.error("Gemini API Error:", error);
        return NextResponse.json({
            error: error?.message || 'Internal server error during LLM generation'
        }, { status: 500 });
    }
}
