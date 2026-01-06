import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== Checking Current State ===\n');

    // Check all users
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true
        }
    });

    console.log('All Users:');
    users.forEach(u => {
        console.log(`  - ${u.email} (${u.name}) - Role: ${u.role}, ID: ${u.id}`);
    });

    console.log('\n=== TeamMembers by User ===\n');

    for (const user of users) {
        const members = await (prisma as any).teamMember.findMany({
            where: { userId: user.id }
        });

        console.log(`User: ${user.email}`);
        console.log(`  ID: ${user.id}`);
        console.log(`  TeamMembers: ${members.length}`);

        if (members.length > 0) {
            members.forEach((m: any) => {
                console.log(`    - ${m.facebookName} (FB ID: ${m.facebookUserId})`);
                console.log(`      Token: ${m.accessToken ? 'EXISTS (length: ' + m.accessToken.length + ')' : 'MISSING'}`);
            });
        }
        console.log('');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
