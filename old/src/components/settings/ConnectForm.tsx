"use client"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { Facebook, CheckCircle2, AlertCircle, ExternalLink, Shield, ChevronDown, ChevronUp } from "lucide-react"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/contexts/LanguageContext"

interface FacebookAccount {
    isConnected: boolean
    providerAccountId?: string
    scope?: string
    tokenExpires?: Date | null
}

interface GoogleAccount {
    isConnected: boolean
    providerAccountId?: string
    scope?: string
    tokenExpires?: Date | null
}

interface ConnectFormProps {
    facebookAccount?: FacebookAccount
    googleAccount?: GoogleAccount
    onDisconnect?: () => void
}

export function ConnectForm({ facebookAccount, googleAccount, onDisconnect }: ConnectFormProps) {
    const { t, language } = useLanguage()
    const [isLoading, setIsLoading] = useState(false)
    const [showFbDetails, setShowFbDetails] = useState(false)
    const [showGoogleDetails, setShowGoogleDetails] = useState(false)
    const router = useRouter()

    // Support both old and new props format
    const fbAccount: FacebookAccount = facebookAccount || { isConnected: false }
    const isFbConnected = fbAccount.isConnected

    const gAccount: GoogleAccount = googleAccount || { isConnected: false }
    const isGoogleConnected = gAccount.isConnected

    const handleConnect = async () => {
        setIsLoading(true)
        try {
            await signIn("facebook", { callbackUrl: "/settings?tab=connect" })
        } catch (error) {
            toast.error(t.settings.connect.messages.connectError)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDisconnect = async () => {
        setIsLoading(true)
        try {
            const response = await fetch("/api/auth/disconnect-facebook", {
                method: "POST",
            })

            if (!response.ok) throw new Error("Failed to disconnect")

            toast.success(t.settings.connect.messages.disconnectConfirm)
            // Call onDisconnect callback if provided to update parent state
            if (onDisconnect) {
                onDisconnect()
            }
            router.refresh()
        } catch (error) {
            toast.error(t.settings.connect.messages.disconnectError)
        } finally {
            setIsLoading(false)
        }
    }

    // Parse scopes for display - Facebook
    const getFbPermissions = () => {
        // If scope is stored in DB, use it
        if (fbAccount.scope) {
            return fbAccount.scope.split(',').map((s: string) => s.trim())
        }
        // Fallback to configured permissions if not stored
        return ['email', 'public_profile', 'ads_read', 'ads_management', 'pages_read_engagement', 'pages_show_list', 'pages_messaging', 'pages_manage_metadata']
    }

    // Check if Facebook token is expired
    const isFbTokenExpired = () => {
        if (!fbAccount.tokenExpires) return false
        return new Date() > new Date(fbAccount.tokenExpires)
    }

    // Format Facebook expiry date
    const formatFbExpiry = () => {
        if (!fbAccount.tokenExpires) {
            return language === 'th' ? 'Long-lived Token (ไม่หมดอายุ)' : 'Long-lived Token (No Expiry)'
        }
        const date = new Date(fbAccount.tokenExpires)
        return date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Parse scopes for display - Google
    const getGooglePermissions = () => {
        if (!gAccount.scope) return []
        return gAccount.scope.split(' ').map((s: string) => s.split('/').pop() || s)
    }

    return (
        <div className="space-y-6">
            {/* Facebook Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Facebook className="h-5 w-5 text-blue-600" />
                        {t.settings.connect.facebookAds}
                    </CardTitle>
                    <CardDescription>
                        {t.settings.connect.facebookAdsDesc}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Connection Status Card */}
                    <div className={`flex items-start space-x-4 rounded-xl border p-4 ${isFbConnected
                        ? isFbTokenExpired()
                            ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30'
                            : 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/30'
                        }`}>
                        {isFbConnected ? (
                            isFbTokenExpired() ? (
                                <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
                            ) : (
                                <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5" />
                            )
                        ) : (
                            <Facebook className="h-6 w-6 text-gray-400 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium leading-none">
                                    {t.settings.connect.marketingApi}
                                </p>
                                {isFbConnected && (
                                    <Badge variant={isFbTokenExpired() ? "destructive" : "default"} className="text-xs">
                                        {isFbTokenExpired() ? t.settings.connect.status.tokenExpired : t.settings.connect.status.connected}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {isFbConnected
                                    ? isFbTokenExpired()
                                        ? t.settings.connect.messages.tokenExpired
                                        : t.settings.connect.messages.connectedReady
                                    : t.settings.connect.messages.notConnected}
                            </p>
                        </div>
                        <Button
                            variant={isFbConnected ? "outline" : "default"}
                            onClick={isFbConnected ? handleDisconnect : handleConnect}
                            disabled={isLoading}
                            className={isFbConnected ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" : ""}
                        >
                            {isLoading ? t.settings.connect.buttons.loading : isFbConnected ? t.settings.connect.buttons.disconnect : t.settings.connect.buttons.connect}
                        </Button>
                    </div>

                    {/* Account Details - Collapsible */}
                    {isFbConnected && (
                        <div className="space-y-2 pt-2">
                            {/* Toggle Button */}
                            <button
                                onClick={() => setShowFbDetails(!showFbDetails)}
                                className="w-full flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                            >
                                <span className="text-sm font-medium flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    {t.settings.connect.accountDetails} & {t.settings.connect.grantedPermissions}
                                </span>
                                {showFbDetails ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                            </button>

                            {/* Collapsible Content */}
                            {showFbDetails && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Account Info */}
                                    <div className="rounded-xl border bg-background p-4 space-y-3">
                                        <h4 className="text-sm font-medium flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-muted-foreground" />
                                            {t.settings.connect.accountDetails}
                                        </h4>

                                        <div className="grid gap-2 text-sm">
                                            <div className="flex justify-between items-center py-1.5 border-b border-dashed">
                                                <span className="text-muted-foreground">{t.settings.connect.facebookId}</span>
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                                                        {fbAccount.providerAccountId}
                                                    </code>
                                                    <a
                                                        href={`https://facebook.com/${fbAccount.providerAccountId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-700"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center py-1.5 border-b border-dashed">
                                                <span className="text-muted-foreground">{t.settings.connect.tokenExpires}</span>
                                                <span className={isFbTokenExpired() ? "text-red-600 font-medium" : "text-foreground"}>
                                                    {formatFbExpiry()}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center py-1.5">
                                                <span className="text-muted-foreground">{t.common.status}</span>
                                                <Badge variant={isFbTokenExpired() ? "destructive" : "secondary"}>
                                                    {isFbTokenExpired() ? t.settings.connect.status.expired : t.settings.connect.status.active}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Permissions */}
                                    <div className="rounded-xl border bg-background p-4 space-y-3">
                                        <h4 className="text-sm font-medium">{t.settings.connect.grantedPermissions}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {getFbPermissions().map((permission: string, index: number) => (
                                                <Badge key={index} variant="outline" className="text-xs">
                                                    {permission.replace(/_/g, ' ')}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Reconnect hint if expired */}
                            {isFbTokenExpired() && (
                                <div className="rounded-xl border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30 p-4">
                                    <div className="flex gap-3">
                                        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                                {t.settings.connect.reconnectTitle}
                                            </p>
                                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                                {t.settings.connect.reconnectDesc}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Google Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google Account
                    </CardTitle>
                    <CardDescription>
                        เชื่อมต่อบัญชี Google สำหรับเข้าสู่ระบบ
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Connection Status Card */}
                    <div className={`flex items-start space-x-4 rounded-xl border p-4 ${isGoogleConnected
                        ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/30'
                        }`}>
                        {isGoogleConnected ? (
                            <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5" />
                        ) : (
                            <svg className="h-6 w-6 text-gray-400 mt-0.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#9CA3AF" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#9CA3AF" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#9CA3AF" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#9CA3AF" />
                            </svg>
                        )}
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium leading-none">
                                    Google OAuth
                                </p>
                                {isGoogleConnected && (
                                    <Badge variant="default" className="text-xs">
                                        {t.settings.connect.status.connected}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {isGoogleConnected
                                    ? 'บัญชี Google เชื่อมต่อแล้ว - สามารถใช้เข้าสู่ระบบได้'
                                    : 'ยังไม่ได้เชื่อมต่อบัญชี Google'}
                            </p>
                        </div>
                        {!isGoogleConnected && (
                            <Button
                                variant="default"
                                onClick={() => signIn("google", { callbackUrl: "/settings?tab=connect" })}
                            >
                                เชื่อมต่อ
                            </Button>
                        )}
                    </div>

                    {/* Account Details - Collapsible */}
                    {isGoogleConnected && (
                        <div className="space-y-2 pt-2">
                            {/* Toggle Button */}
                            <button
                                onClick={() => setShowGoogleDetails(!showGoogleDetails)}
                                className="w-full flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                            >
                                <span className="text-sm font-medium flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    {t.settings.connect.accountDetails} & {t.settings.connect.grantedPermissions}
                                </span>
                                {showGoogleDetails ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                            </button>

                            {/* Collapsible Content */}
                            {showGoogleDetails && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Account Info */}
                                    <div className="rounded-xl border bg-background p-4 space-y-3">
                                        <h4 className="text-sm font-medium flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-muted-foreground" />
                                            {t.settings.connect.accountDetails}
                                        </h4>

                                        <div className="grid gap-2 text-sm">
                                            <div className="flex justify-between items-center py-1.5 border-b border-dashed">
                                                <span className="text-muted-foreground">Google ID</span>
                                                <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                                                    {gAccount.providerAccountId}
                                                </code>
                                            </div>

                                            <div className="flex justify-between items-center py-1.5">
                                                <span className="text-muted-foreground">{t.common.status}</span>
                                                <Badge variant="secondary">
                                                    {t.settings.connect.status.active}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Permissions */}
                                    {gAccount.scope && (
                                        <div className="rounded-xl border bg-background p-4 space-y-3">
                                            <h4 className="text-sm font-medium">{t.settings.connect.grantedPermissions}</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {getGooglePermissions().map((permission: string, index: number) => (
                                                    <Badge key={index} variant="outline" className="text-xs">
                                                        {permission}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
