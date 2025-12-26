const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const EMAIL = 'thailand.sh00583@gmail.com'

async function main() {
    console.log(`🔍 Debugging user: ${EMAIL}\n`)

    // Check User
    const user = await prisma.user.findUnique({
        where: { email: EMAIL.toLowerCase() },
        include: { accounts: true, sessions: true }
    })

    if (!user) {
        console.log(`❌ User not found in database`)

        // Check if email is in whitelist
        const allowed = await prisma.allowedEmail.findUnique({
            where: { email: EMAIL.toLowerCase() }
        })
        console.log(`\n📋 Email in whitelist: ${allowed ? '✅ Yes' : '❌ No'}`)
        return
    }

    console.log(`✅ User found:`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.name || '(not set)'}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`)
    console.log(`   Email Verified: ${user.emailVerified || 'No'}`)
    console.log(`   Created: ${user.createdAt}`)

    console.log(`\n📱 Linked Accounts (${user.accounts.length}):`)
    if (user.accounts.length === 0) {
        console.log(`   (No OAuth accounts linked)`)
    }
    user.accounts.forEach(acc => {
        console.log(`   - Provider: ${acc.provider}`)
        console.log(`     Provider Account ID: ${acc.providerAccountId}`)
        console.log(`     Has Access Token: ${acc.access_token ? 'Yes' : 'No'}`)
    })

    console.log(`\n🔐 Active Sessions: ${user.sessions.length}`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
