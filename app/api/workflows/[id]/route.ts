import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;

        const workflow = await prisma.workflow.findFirst({
            where: {
                id: resolvedParams.id,
                userId,
            },
        });

        if (!workflow) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json(workflow);
    } catch (error) {
        console.error("Failed to fetch workflow:", error);
        return NextResponse.json(
            { error: "Failed to fetch workflow. Please try again later." },
            { status: 500 }
        );
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const body = await req.json();

        const workflow = await prisma.workflow.updateMany({
            where: { id: resolvedParams.id, userId },
            data: {
                ...(body.name && { name: body.name }),
                ...(body.nodes && { nodes: body.nodes }),
                ...(body.edges && { edges: body.edges }),
            },
        });

        if (workflow.count === 0) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update workflow:", error);
        return NextResponse.json(
            { error: "Failed to update workflow." },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;

        // Delete related execution runs first (foreign key constraint)
        await prisma.executionRun.deleteMany({
            where: { workflowId: resolvedParams.id },
        });

        await prisma.workflow.deleteMany({
            where: { id: resolvedParams.id, userId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete workflow:", error);
        return NextResponse.json(
            { error: "Failed to delete workflow." },
            { status: 500 }
        );
    }
}
