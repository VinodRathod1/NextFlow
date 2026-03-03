"use server";

import { prisma } from "./prisma";

export async function createRun(workflowId: string) {
    try {
        return await prisma.executionRun.create({
            data: {
                workflowId,
                status: "running",
            },
        });
    } catch (err: any) {
        // If workflow was deleted or doesn't exist, return a mock run
        console.warn("[executionLogger] Could not create DB run:", err.message);
        return { id: `local-${Date.now()}`, workflowId, status: "running" };
    }
}

export async function completeRun(runId: string, output: any) {
    if (runId.startsWith("local-")) return { id: runId, status: "success" };

    return await prisma.executionRun.update({
        where: { id: runId },
        data: {
            status: "success",
            finishedAt: new Date(),
            output: typeof output === "object" ? output : { result: output },
        },
    });
}

export async function failRun(runId: string, error: unknown) {
    if (runId.startsWith("local-")) return { id: runId, status: "failed" };

    const errorMessage = error instanceof Error ? error.message : String(error);

    return await prisma.executionRun.update({
        where: { id: runId },
        data: {
            status: "failed",
            finishedAt: new Date(),
            output: { error: errorMessage },
        },
    });
}
