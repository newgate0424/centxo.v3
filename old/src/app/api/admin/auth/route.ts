import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminToken } from "@/lib/admin-auth"
import { withRateLimit } from "@/lib/rate-limit-middleware"

export async function POST(req: NextRequest) {
  return withRateLimit(req, async () => {
    try {
      const { username, password } = await req.json()

      const adminUsername = process.env.ADMIN_USERNAME
      const adminPassword = process.env.ADMIN_PASSWORD

      if (!adminUsername || !adminPassword) {
        return NextResponse.json(
          { error: "Admin credentials not configured" },
          { status: 500 }
        )
      }

      if (username === adminUsername && password === adminPassword) {
        const token = await createAdminToken()

        const cookieStore = await cookies()
        cookieStore.set("admin_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24, // 24 hours
          path: "/",
        })

        return NextResponse.json({ success: true })
      }

      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      )
    } catch (error) {
      console.error("[Admin Auth Error]", error)
      return NextResponse.json(
        { error: "Server error" },
        { status: 500 }
      )
    }
  }, { limit: 5, window: 900 }) // 5 requests per 15 minutes
}

// Logout
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete("admin_token")
  return NextResponse.json({ success: true })
}
