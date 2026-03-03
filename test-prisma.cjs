const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const result = await prisma.executionRun.create({
        data: {
            workflowId: 'test1234',
            status: 'pending'
        }
    });
    console.log('Success:', result);
}
main().catch(console.error).finally(() => prisma.$disconnect());
