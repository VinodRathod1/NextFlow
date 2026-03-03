import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const unsavedWorkflows = await prisma.workflow.findMany({
            where: { userId, name: { in: ["Unsaved Workflow", "Untitled Workflow"] } },
            select: { id: true },
        });

        const ids = unsavedWorkflows.map((w) => w.id);

        if (ids.length === 0) {
            return NextResponse.json({ success: true, deleted: 0 });
        }

        // Delete related execution runs first (foreign key constraint)
        await prisma.executionRun.deleteMany({
            where: { workflowId: { in: ids } },
        });

        // Now delete the workflows
        const result = await prisma.workflow.deleteMany({
            where: { id: { in: ids } },
        });

        return NextResponse.json({ success: true, deleted: result.count });
    } catch (error: any) {
        console.error("Failed to delete unsaved workflows:", error?.message || error);
        return NextResponse.json(
            { error: error?.message || "Failed to delete" },
            { status: 500 }
        );
    }
}
