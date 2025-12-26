import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

// GET - Get user profile
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                facebookName: true,
                role: true,
            }
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        return NextResponse.json(user)
    } catch (error) {
        console.error("Error loading profile:", error)
        return NextResponse.json({ error: "Failed to load profile" }, { status: 500 })
    }
}

// PUT - Update user profile (name)
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { name } = body

        if (!name || name.length < 2 || name.length > 50) {
            return NextResponse.json({ error: "Name must be between 2 and 50 characters" }, { status: 400 })
        }

        const user = await db.user.update({
            where: { id: session.user.id },
            data: { name },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
            }
        })

        return NextResponse.json({ success: true, user })
    } catch (error) {
        console.error("Error updating profile:", error)
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }
}

// POST - Upload profile picture
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get("file") as File | null

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed" }, { status: 400 })
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024
        if (file.size > maxSize) {
            return NextResponse.json({ error: "File too large. Maximum size is 5MB" }, { status: 400 })
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "profiles")
        await mkdir(uploadsDir, { recursive: true })

        // Generate unique filename
        const ext = file.name.split(".").pop()
        const filename = `${session.user.id}-${Date.now()}.${ext}`
        const filepath = path.join(uploadsDir, filename)

        // Write file to disk
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filepath, buffer)

        // Update user image in database
        const imageUrl = `/uploads/profiles/${filename}`
        const user = await db.user.update({
            where: { id: session.user.id },
            data: { image: imageUrl },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
            }
        })

        return NextResponse.json({ success: true, user, imageUrl })
    } catch (error) {
        console.error("Error uploading profile picture:", error)
        return NextResponse.json({ error: "Failed to upload profile picture" }, { status: 500 })
    }
}

// DELETE - Remove profile picture
export async function DELETE() {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = await db.user.update({
            where: { id: session.user.id },
            data: { image: null },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
            }
        })

        return NextResponse.json({ success: true, user })
    } catch (error) {
        console.error("Error removing profile picture:", error)
        return NextResponse.json({ error: "Failed to remove profile picture" }, { status: 500 })
    }
}
