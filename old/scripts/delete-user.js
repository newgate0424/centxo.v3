const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const emailToDelete = 'epidifocu608@gmail.com'

    // ค้นหา user ก่อน
    const user = await prisma.user.findUnique({
        where: { email: emailToDelete }
    })

    if (!user) {
        console.log(`ไม่พบ user: ${emailToDelete}`)
        return
    }

    console.log('พบ user:', user)

    // ลบ sessions ของ user ก่อน
    await prisma.session.deleteMany({
        where: { userId: user.id }
    })
    console.log('ลบ sessions เรียบร้อย')

    // ลบ accounts (OAuth connections)
    await prisma.account.deleteMany({
        where: { userId: user.id }
    })
    console.log('ลบ accounts เรียบร้อย')

    // ลบ user
    await prisma.user.delete({
        where: { email: emailToDelete }
    })

    console.log(`✅ ลบ user ${emailToDelete} เรียบร้อยแล้ว!`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
