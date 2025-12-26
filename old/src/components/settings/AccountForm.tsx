"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Loader2, Camera, Trash2 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

// Schema for type inference
const accountFormSchemaBase = z.object({
    name: z.string().min(2).max(50),
})

type AccountFormValues = z.infer<typeof accountFormSchemaBase>

interface UserProfile {
    id: string
    name: string | null
    email: string
    image: string | null
    facebookName: string | null
    role: string
}

export function AccountForm() {
    const { t } = useLanguage()
    const { update: updateSession } = useSession()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const accountFormSchema = z.object({
        name: z
            .string()
            .min(2, {
                message: t.settings.account.validation.nameMin,
            })
            .max(50, {
                message: t.settings.account.validation.nameMax,
            }),
    })

    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        defaultValues: {
            name: "",
        },
    })

    // Load profile on mount
    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/account/profile")
            if (res.ok) {
                const data = await res.json()
                setProfile(data)
                form.reset({
                    name: data.name || "",
                })
            }
        } catch (error) {
            console.error("Failed to load profile:", error)
            toast.error(t.settings.account.toast.loadError)
        } finally {
            setLoading(false)
        }
    }

    const onSubmit = async (data: AccountFormValues) => {
        try {
            setSaving(true)
            const res = await fetch("/api/account/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: data.name }),
            })

            if (res.ok) {
                const result = await res.json()
                setProfile(prev => prev ? { ...prev, name: result.user.name } : null)
                // Update session to reflect new name across the app
                await updateSession({ name: result.user.name })
                toast.success(t.settings.account.toast.saveSuccess)
            } else {
                const error = await res.json()
                toast.error(error.error || t.settings.account.toast.saveError)
            }
        } catch (error) {
            console.error("Failed to save profile:", error)
            toast.error(t.settings.account.toast.error)
        } finally {
            setSaving(false)
        }
    }

    const handleImageClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if (!allowedTypes.includes(file.type)) {
            toast.error(t.settings.account.validation.fileType)
            return
        }

        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
            toast.error(t.settings.account.validation.fileSize)
            return
        }

        try {
            setUploading(true)
            const formData = new FormData()
            formData.append("file", file)

            const res = await fetch("/api/account/profile", {
                method: "POST",
                body: formData,
            })

            if (res.ok) {
                const result = await res.json()
                setProfile(prev => prev ? { ...prev, image: result.imageUrl } : null)
                // Update session to reflect new image across the app
                await updateSession({ image: result.imageUrl })
                toast.success(t.settings.account.toast.uploadSuccess)
            } else {
                const error = await res.json()
                toast.error(error.error || t.settings.account.toast.uploadError)
            }
        } catch (error) {
            console.error("Failed to upload image:", error)
            toast.error(t.settings.account.toast.error)
        } finally {
            setUploading(false)
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    const handleRemoveImage = async () => {
        if (!confirm(t.settings.account.toast.deleteConfirm)) return

        try {
            setUploading(true)
            const res = await fetch("/api/account/profile", {
                method: "DELETE",
            })

            if (res.ok) {
                setProfile(prev => prev ? { ...prev, image: null } : null)
                // Update session to reflect removed image across the app
                await updateSession({ image: null })
                toast.success(t.settings.account.toast.deleteSuccess)
            } else {
                toast.error(t.settings.account.toast.deleteError)
            }
        } catch (error) {
            console.error("Failed to remove image:", error)
            toast.error(t.settings.account.toast.error)
        } finally {
            setUploading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const displayName = profile?.name || profile?.facebookName || profile?.email || "User"
    const initial = displayName.charAt(0).toUpperCase()

    return (
        <div className="space-y-8">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-6">
                <div className="relative group">
                    <Avatar className="h-24 w-24 cursor-pointer border-2 border-muted" onClick={handleImageClick}>
                        <AvatarImage src={profile?.image || undefined} alt={displayName} />
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                            {initial}
                        </AvatarFallback>
                    </Avatar>

                    {/* Overlay on hover */}
                    <div
                        className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={handleImageClick}
                    >
                        {uploading ? (
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                        ) : (
                            <Camera className="h-6 w-6 text-white" />
                        )}
                    </div>

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                <div className="text-center sm:text-left">
                    <h3 className="text-lg font-medium">{displayName}</h3>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    <div className="flex gap-2 mt-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleImageClick}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Camera className="h-4 w-4 mr-2" />
                            )}
                            {t.settings.account.changePhoto}
                        </Button>
                        {profile?.image && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleRemoveImage}
                                disabled={uploading}
                                className="text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t.settings.account.removePhoto}
                            </Button>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        {t.settings.account.photoRequirements}
                    </p>
                </div>
            </div>

            {/* Name Form */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t.settings.account.displayName}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t.settings.account.displayNamePlaceholder} {...field} />
                                </FormControl>
                                <FormDescription>
                                    {t.settings.account.displayNameDesc}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Email (read-only) */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t.settings.account.email}</label>
                        <Input value={profile?.email || ""} disabled className="bg-muted" />
                        <p className="text-xs text-muted-foreground">
                            {t.settings.account.emailDesc}
                        </p>
                    </div>

                    {/* Role (read-only) */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t.settings.account.role}</label>
                        <Input
                            value={
                                profile?.role === 'host' ? t.settings.account.roleHost :
                                    profile?.role === 'admin' ? t.settings.account.roleAdmin :
                                        t.settings.account.roleStaff
                            }
                            disabled
                            className="bg-muted"
                        />
                    </div>

                    {/* Facebook Name (if connected) */}
                    {profile?.facebookName && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t.settings.account.facebookName}</label>
                            <Input value={profile.facebookName} disabled className="bg-muted" />
                            <p className="text-xs text-muted-foreground">
                                {t.settings.account.facebookNameDesc}
                            </p>
                        </div>
                    )}

                    <Button type="submit" disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t.settings.account.saving}
                            </>
                        ) : (
                            t.settings.account.save
                        )}
                    </Button>
                </form>
            </Form>
        </div>
    )
}
