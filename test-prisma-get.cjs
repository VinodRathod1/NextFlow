const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const workflows = await prisma.workflow.findMany({
            where: { userId: 'demo-user' },
            orderBy: { createdAt: 'desc' }
        });
        console.log('Success! Workflows fetched successfully:', workflows.length);
    } catch (error) {
        console.error('Prisma Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
