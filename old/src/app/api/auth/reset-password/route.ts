import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
    try {
        const { token, password } = await request.json()

        if (!token || !password) {
            return NextResponse.json(
                { message: "Token and password are required" },
                { status: 400 }
            )
        }

        if (password.length < 6) {
            return NextResponse.json(
                { message: "Password must be at least 6 characters" },
                { status: 400 }
            )
        }

        // Find the token
        const resetToken = await db.passwordResetToken.findUnique({
            where: { token }
        })

        if (!resetToken) {
            return NextResponse.json(
                { message: "Invalid or expired reset link" },
                { status: 400 }
            )
        }

        // Check if token is expired
        if (new Date() > resetToken.expires) {
            // Delete expired token
            await db.passwordResetToken.delete({
                where: { id: resetToken.id }
            })
            return NextResponse.json(
                { message: "Reset link has expired. Please request a new one." },
                { status: 400 }
            )
        }

        // Find user
        const user = await db.user.findUnique({
            where: { email: resetToken.email }
        })

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 400 }
            )
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12)

        // Update user password
        await db.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        })

        // Delete the used token
        await db.passwordResetToken.delete({
            where: { id: resetToken.id }
        })

        return NextResponse.json({ 
            message: "Password reset successfully" 
        })

    } catch (error) {
        console.error("Reset password error:", error)
        return NextResponse.json(
            { message: "Something went wrong" },
            { status: 500 }
        )
    }
}
