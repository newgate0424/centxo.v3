const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const emailsToAdd = [
    'thailand.sh0138@gmail.com',
    'thailand.sh0530@gmail.com',
    'thailand.sh0209@gmail.com',
    'thailand.sh00268@gmail.com',
    'thailand.sh00583@gmail.com',
    'thailand.sh0517@gmail.com',
    'thailand.sh00200@gmail.com',
    'thailand.sh0726@gmail.com',
    'thailand.sh0208@gmail.com',
    'thailand.sh0600@gmail.com',
    'thailand.sh0818@gmail.com',
    'thailand.sh0445@gmail.com',
    'thailand.sh00535@gmail.com',
    'thailand.sh0251@gmail.com',
    'thailand.sh0781@gmail.com',
    'thailand.sh0440@gmail.com',
]

async function main() {
    console.log(`เพิ่ม ${emailsToAdd.length} emails...`)

    for (const email of emailsToAdd) {
        try {
            await prisma.allowedEmail.upsert({
                where: { email: email.toLowerCase().trim() },
                update: {},
                create: {
                    email: email.toLowerCase().trim(),
                    note: 'Added by admin',
                    createdBy: 'admin'
                }
            })
            console.log(`✅ ${email}`)
        } catch (error) {
            console.log(`⚠️ ${email} - ${error.message}`)
        }
    }

    const total = await prisma.allowedEmail.count()
    console.log(`\n📋 Total allowed emails: ${total}`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
