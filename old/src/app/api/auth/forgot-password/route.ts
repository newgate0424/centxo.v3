import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(request: Request) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json(
                { message: "Email is required" },
                { status: 400 }
            )
        }

        // Check if user exists
        const user = await db.user.findUnique({
            where: { email }
        })

        // Always return success to prevent email enumeration
        if (!user) {
            return NextResponse.json({ 
                message: "If an account exists with this email, you will receive a password reset link." 
            })
        }

        // Check if user registered with OAuth (no password)
        if (!user.password) {
            return NextResponse.json({ 
                message: "If an account exists with this email, you will receive a password reset link." 
            })
        }

        // Delete any existing tokens for this email
        await db.passwordResetToken.deleteMany({
            where: { email }
        })

        // Generate token
        const token = crypto.randomBytes(32).toString("hex")
        const expires = new Date(Date.now() + 3600000) // 1 hour from now

        // Save token to database
        await db.passwordResetToken.create({
            data: {
                email,
                token,
                expires
            }
        })

        // Send email
        const result = await sendPasswordResetEmail({ email, token })

        if (!result.success) {
            console.error("Failed to send email:", result.error)
            return NextResponse.json(
                { message: "Failed to send reset email. Please try again." },
                { status: 500 }
            )
        }

        return NextResponse.json({ 
            message: "If an account exists with this email, you will receive a password reset link." 
        })

    } catch (error) {
        console.error("Forgot password error:", error)
        return NextResponse.json(
            { message: "Something went wrong" },
            { status: 500 }
        )
    }
}
