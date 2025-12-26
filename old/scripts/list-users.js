const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    // ดู user ทั้งหมด
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true
        },
        orderBy: { createdAt: 'desc' }
    })

    console.log('รายชื่อ Users ทั้งหมด:')
    console.log('========================')
    users.forEach((u, i) => {
        console.log(`${i + 1}. ${u.email}`)
        console.log(`   Name: ${u.name}, Role: ${u.role}`)
        console.log(`   Created: ${u.createdAt}`)
        console.log('')
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
