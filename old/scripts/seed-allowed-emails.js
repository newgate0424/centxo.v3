const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    // ดึง email ทั้งหมดจาก users ที่มีอยู่
    const users = await prisma.user.findMany({
        select: { email: true, name: true, role: true }
    })

    console.log(`พบ ${users.length} users ที่มีอยู่`)

    // เพิ่มแต่ละ email เข้า AllowedEmail
    for (const user of users) {
        try {
            await prisma.allowedEmail.upsert({
                where: { email: user.email },
                update: {}, // ไม่ต้อง update อะไรถ้ามีอยู่แล้ว
                create: {
                    email: user.email,
                    note: `${user.name || 'N/A'} (${user.role}) - Existing user`,
                    createdBy: 'system'
                }
            })
            console.log(`✅ เพิ่ม: ${user.email}`)
        } catch (error) {
            console.log(`⚠️ ข้าม: ${user.email} (มีอยู่แล้ว)`)
        }
    }

    // แสดงรายการ AllowedEmail ทั้งหมด
    const allowed = await prisma.allowedEmail.findMany()
    console.log(`\n📋 AllowedEmail ทั้งหมด: ${allowed.length} รายการ`)
    allowed.forEach(a => console.log(`  - ${a.email} | ${a.note}`))
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
