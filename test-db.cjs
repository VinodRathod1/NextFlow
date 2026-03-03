const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ log: ['error', 'warn', 'info'] });

async function main() {
    console.log('Attempting to connect to database...');
    await prisma.$connect();
    console.log('Connected successfully!');

    console.log('Testing workflow query...');
    const workflows = await prisma.workflow.findMany({ take: 3 });
    console.log('Workflows found:', workflows.length);
    if (workflows.length > 0) {
        console.log('First workflow keys:', Object.keys(workflows[0]));
        console.log('Has userId?', 'userId' in workflows[0]);
    }

    console.log('Testing executionRun query...');
    const runs = await prisma.executionRun.findMany({
        take: 3,
        include: { workflow: { select: { name: true } } }
    });
    console.log('Runs found:', runs.length);
}

main()
    .catch(e => {
        console.error('FAILED:', e.message);
        console.error('Full error:', e);
    })
    .finally(() => prisma.$disconnect());
