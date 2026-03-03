import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        logger.info("GET runs for userId:", userId);

        const runs = await prisma.executionRun.findMany({
            where: {
                workflow: {
                    userId,
                },
            },
            take: 20,
            orderBy: {
                startedAt: 'desc',
            },
            include: {
                workflow: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // Flatten the data slightly for easier consumption on the frontend
        const formattedRuns = runs.map(run => ({
            ...run,
            workflowName: run.workflow?.name || 'Unknown Workflow',
        }));

        return NextResponse.json(formattedRuns);
    } catch (error) {
        logger.error('Failed to fetch runs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch runs' },
            { status: 500 }
        );
    }
}

export async function DELETE() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Delete all runs belonging to this user's workflows
        const deleted = await prisma.executionRun.deleteMany({
            where: {
                workflow: {
                    userId,
                },
            },
        });

        return NextResponse.json({ success: true, deletedCount: deleted.count });
    } catch (error) {
        logger.error('Failed to clear runs:', error);
        return NextResponse.json(
            { error: 'Failed to clear runs' },
            { status: 500 }
        );
    }
}
