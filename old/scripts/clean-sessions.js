const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    // ลบ orphan sessions (sessions ที่ไม่มี user)
    const orphanSessions = await prisma.session.findMany({
        include: { user: true }
    })

    console.log('Sessions ทั้งหมด:', orphanSessions.length)

    // หา sessions ที่ไม่มี user
    const orphans = orphanSessions.filter(s => !s.user)
    console.log('Orphan sessions (ไม่มี user):', orphans.length)

    if (orphans.length > 0) {
        // ลบ orphan sessions
        for (const s of orphans) {
            await prisma.session.delete({ where: { id: s.id } })
            console.log(`ลบ session: ${s.id}`)
        }
        console.log('✅ ลบ orphan sessions เรียบร้อย!')
    }

    // แสดง sessions ที่เหลือ
    const remaining = await prisma.session.findMany({
        include: { user: { select: { email: true, name: true } } }
    })
    console.log('\nSessions ที่เหลืออยู่:')
    remaining.forEach(s => {
        console.log(`- User: ${s.user?.email || 'N/A'} (${s.user?.name || 'N/A'})`)
        console.log(`  Expires: ${s.expires}`)
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
