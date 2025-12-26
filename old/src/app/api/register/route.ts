import { db } from "@/lib/db"
import { hash } from "bcryptjs"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { withRateLimit } from "@/lib/rate-limit-middleware"

const userSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email"),
    password: z.string().min(1, "Password is required").min(8, "Password must be at least 8 characters"),
})

export async function POST(req: NextRequest) {
    return withRateLimit(req, async () => {
        try {
            const body = await req.json()
            const { email, name, password } = userSchema.parse(body)

            const existingUser = await db.user.findUnique({
                where: { email },
            })

            if (existingUser) {
                return NextResponse.json(
                    { user: null, message: "User with this email already exists" },
                    { status: 409 }
                )
            }

            const hashedPassword = await hash(password, 10)

            const newUser = await db.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: 'host', // New users who register are always host
                    permissions: ['view_admanager', 'view_google_sheets'], // Default permissions
                },
            })

            const { password: newUserPassword, ...rest } = newUser

            return NextResponse.json(
                { user: rest, message: "User created successfully" },
                { status: 201 }
            )
        } catch (error) {
            console.error("Registration error:", error)

            if (error instanceof z.ZodError) {
                const message = error.issues[0]?.message || "Invalid input"
                return NextResponse.json({ message }, { status: 400 })
            }

            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                return NextResponse.json(
                    { message: "User with this email already exists" },
                    { status: 409 }
                )
            }

            return NextResponse.json(
                { message: "Something went wrong" },
                { status: 500 }
            )
        }
    }, { limit: 5, window: 60 }) // 5 requests per minute
}
