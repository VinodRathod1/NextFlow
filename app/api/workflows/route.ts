import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const workflowSchema = z.object({
    name: z.string().min(1, "Name is required"),
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
});

export async function POST(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        logger.info("POST userId:", userId);

        const body = await req.json();
        const result = workflowSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }

        const { name, nodes, edges } = result.data;

        const workflow = await prisma.workflow.create({
            data: {
                name,
                nodes,
                edges,
                userId,
            },
        });

        return NextResponse.json(workflow);
    } catch (error) {
        logger.error("Failed to save workflow:", error);
        return NextResponse.json(
            { error: "Failed to save workflow" },
            { status: 500 }
        );
    }
}

export async function GET() {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("GET userId:", userId);

    const workflows = await prisma.workflow.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(workflows);
}

export async function DELETE() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = await prisma.workflow.deleteMany({
            where: { userId, name: "Unsaved Workflow" },
        });

        logger.info(`Deleted ${result.count} unsaved workflows for user ${userId}`);
        return NextResponse.json({ success: true, deleted: result.count });
    } catch (error) {
        logger.error("Failed to delete unsaved workflows:", error);
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
