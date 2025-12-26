const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const emails = await prisma.allowedEmail.findMany()
    console.log('Allowed Emails:')
    emails.forEach(e => console.log(`  - ${e.email}`))
    console.log(`\nTotal: ${emails.length}`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
