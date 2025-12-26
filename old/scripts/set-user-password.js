const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// User details
const EMAIL = 'thailand.sh00583@gmail.com'
const PASSWORD = 'risa@583'

async function main() {
    console.log(`🔐 Setting password for: ${EMAIL}`)
    
    try {
        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email: EMAIL.toLowerCase().trim() }
        })
        
        if (!user) {
            console.log(`❌ User not found: ${EMAIL}`)
            console.log(`\n💡 The user might not be registered yet. Please register first.`)
            return
        }
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(PASSWORD, 12)
        
        // Update user password
        await prisma.user.update({
            where: { email: EMAIL.toLowerCase().trim() },
            data: {
                password: hashedPassword,
                updatedAt: new Date()
            }
        })
        
        console.log(`✅ Password set successfully for: ${EMAIL}`)
        console.log(`\n📋 User can now login with:`)
        console.log(`   Email: ${EMAIL}`)
        console.log(`   Password: ${PASSWORD}`)
        
    } catch (error) {
        console.error(`❌ Error:`, error.message)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
