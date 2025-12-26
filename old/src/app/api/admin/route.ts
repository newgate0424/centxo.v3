import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { verifyAdminToken } from "@/lib/admin-auth"

// Check if admin is authenticated
async function isAdminAuthenticated() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")?.value
  if (!token) return false
  return await verifyAdminToken(token)
}

export async function GET(request: Request) {
  const isAdmin = await isAdminAuthenticated()
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "overview"

  try {
    if (type === "overview") {
      const [totalUsers, recentUsers, usersByRole] = await Promise.all([
        prisma.user.count(),
        prisma.user.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            createdAt: true,
          },
        }),
        prisma.user.groupBy({
          by: ["role"],
          _count: { role: true },
        }),
      ])

      // Get today's activity
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayActivity = await prisma.activityLog.count({
        where: { createdAt: { gte: today } },
      })

      return NextResponse.json({
        stats: {
          totalUsers,
          totalTeams: 0,
          totalConversations: 0,
          totalMessages: 0,
          todayActivity,
        },
        recentUsers,
        usersByRole: usersByRole.map((r) => ({
          role: r.role,
          count: r._count.role,
        })),
      })
    }

    if (type === "users") {
      const page = parseInt(searchParams.get("page") || "1")
      const limit = parseInt(searchParams.get("limit") || "20")
      const search = searchParams.get("search") || ""
      const role = searchParams.get("role") || ""

      const where = {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search } },
                  { email: { contains: search } },
                ],
              }
            : {},
          role ? { role } : {},
        ],
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            facebookName: true,
          },
        }),
        prisma.user.count({ where }),
      ])

      return NextResponse.json({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    }

    if (type === "activities") {
      const page = parseInt(searchParams.get("page") || "1")
      const limit = parseInt(searchParams.get("limit") || "50")
      const action = searchParams.get("action") || ""
      const userId = searchParams.get("userId") || ""

      const where = {
        AND: [action ? { action } : {}, userId ? { userId } : {}],
      }

      const [activities, total] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.activityLog.count({ where }),
      ])

      return NextResponse.json({
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    }

    if (type === "teams") {
      // Teams table has been removed
      return NextResponse.json({ teams: [] })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error) {
    console.error("[Admin API Error]", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// POST - Admin actions (change role, delete user, etc.)
export async function POST(request: Request) {
  const isAdmin = await isAdminAuthenticated()
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action } = body

    if (action === "changeRole") {
      const { userId, newRole } = body

      if (!["host", "admin", "staff"].includes(newRole)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 })
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
        select: { id: true, name: true, email: true, role: true },
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: "admin",
          userEmail: "admin",
          userName: "Admin",
          action: "change_role",
          details: JSON.stringify({
            targetUserId: userId,
            targetEmail: updated.email,
            newRole,
          }),
        },
      })

      return NextResponse.json({ success: true, user: updated })
    }

    if (action === "deleteUser") {
      const { userId } = body

      const deletedUser = await prisma.user.delete({
        where: { id: userId },
        select: { email: true, name: true },
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: "admin",
          userEmail: "admin",
          userName: "Admin",
          action: "delete_user",
          details: JSON.stringify({
            deletedEmail: deletedUser.email,
            deletedName: deletedUser.name,
          }),
        },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[Admin API Error]", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
