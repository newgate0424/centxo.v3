import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function removeAdminPermission() {
  try {
    const email = 'thailand.sh0424@gmail.com'
    
    // Get current user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, permissions: true }
    })

    if (!user) {
      console.log('User not found')
      return
    }

    console.log('Current permissions:', user.permissions)

    // Remove view_admin from permissions
    const currentPerms = user.permissions as string[] || []
    const newPerms = currentPerms.filter(p => p !== 'view_admin')

    // Update user
    await prisma.user.update({
      where: { email },
      data: { permissions: newPerms }
    })

    console.log('Updated permissions:', newPerms)
    console.log('✅ Successfully removed view_admin permission')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

removeAdminPermission()
