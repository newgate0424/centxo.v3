import { PrismaClient, User, Prisma } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// Legacy export for compatibility
export const db = prisma

// ===== User Functions =====
export async function updateUser(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({ where: { id }, data })
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } })
}
