const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const runs = await prisma.executionRun.findMany({
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
        console.log('Success!', runs.length, 'runs fetched.');
    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
