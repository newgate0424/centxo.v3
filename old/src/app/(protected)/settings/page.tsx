"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { User, Link2, Bell, Shield, Globe, Palette, Trash2, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { AccountForm } from "@/components/settings/AccountForm"
import { ConnectForm } from "@/components/settings/ConnectForm"
import { PasswordSetupForm } from "@/components/settings/PasswordSetupForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/contexts/LanguageContext"
import { useTheme } from "@/contexts/ThemeContext"
import { toast } from "sonner"
import Link from "next/link"



interface UserSettings {
    language: string
    timezone: string
    currency: string
    theme: string
    primaryColor: string
    compactMode: boolean
    showAnimations: boolean
    emailNotifications: boolean
    campaignAlerts: boolean
    weeklyReports: boolean
    budgetAlerts: boolean
    twoFactorEnabled: boolean
}

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

export default function SettingsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const activeSection = searchParams.get("tab") || "account"
    const { data: session } = useSession()
    const { language, setLanguage, timezone, setTimezone, t } = useLanguage()
    const { theme, setTheme, primaryColor, setPrimaryColor, primaryIntensity, setPrimaryIntensity, compactMode, setCompactMode, showAnimations, setShowAnimations } = useTheme()

    const settingsMenu = [
        { id: "account", name: t.settings.menu.account, icon: User, description: t.settings.menu.accountDesc },
        { id: "connect", name: t.settings.menu.connect, icon: Link2, description: t.settings.menu.connectDesc },
        { id: "notifications", name: t.settings.menu.notifications, icon: Bell, description: t.settings.menu.notificationsDesc },
        { id: "security", name: t.settings.menu.security, icon: Shield, description: t.settings.menu.securityDesc },
        { id: "language", name: t.settings.menu.language, icon: Globe, description: t.settings.menu.languageDesc },
        { id: "appearance", name: t.settings.menu.appearance, icon: Palette, description: t.settings.menu.appearanceDesc },
        { id: "danger", name: t.settings.menu.danger, icon: Trash2, description: t.settings.menu.dangerDesc },
    ]

    const [settings, setSettings] = useState<UserSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState("")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [facebookAccount, setFacebookAccount] = useState<FacebookAccount>({ isConnected: false })
    const [googleAccount, setGoogleAccount] = useState<GoogleAccount>({ isConnected: false })

    // Load settings and Facebook account from database
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch("/api/settings")
                if (res.ok) {
                    const data = await res.json()
                    setSettings(data)
                    // Sync with context
                    if (data.language) setLanguage(data.language as 'en' | 'th')
                    if (data.timezone) setTimezone(data.timezone)
                    if (data.theme) setTheme(data.theme as any)
                    if (data.primaryColor) setPrimaryColor(data.primaryColor as any)
                    if (data.compactMode !== undefined) setCompactMode(data.compactMode)
                    if (data.showAnimations !== undefined) setShowAnimations(data.showAnimations)
                }
            } catch (error) {
                console.error("Failed to load settings:", error)
            } finally {
                setLoading(false)
            }
        }

        const loadFacebookAccount = async () => {
            try {
                const res = await fetch("/api/settings/facebook-account")
                if (res.ok) {
                    const data = await res.json()
                    setFacebookAccount(data)
                }
            } catch (error) {
                console.error("Failed to load Facebook account:", error)
            }
        }

        const loadGoogleAccount = async () => {
            try {
                const res = await fetch("/api/settings/google-account")
                if (res.ok) {
                    const data = await res.json()
                    setGoogleAccount(data)
                }
            } catch (error) {
                console.error("Failed to load Google account:", error)
            }
        }

        loadSettings()
        loadFacebookAccount()
        loadGoogleAccount()
    }, [])

    // Save setting to database
    const saveSetting = async (key: string, value: any) => {
        setSaving(true)
        try {
            const res = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [key]: value })
            })
            if (res.ok) {
                const data = await res.json()
                setSettings(data)
                toast.success("Setting saved")
            } else {
                toast.error("Failed to save setting")
            }
        } catch (error) {
            toast.error("Failed to save setting")
        } finally {
            setSaving(false)
        }
    }

    // Handle setting change with save
    const handleSettingChange = (key: string, value: any) => {
        // Update context immediately for UX
        switch (key) {
            case 'language':
                setLanguage(value as 'en' | 'th')
                break
            case 'theme':
                setTheme(value)
                break
            case 'primaryColor':
                setPrimaryColor(value)
                break
            case 'compactMode':
                setCompactMode(value)
                break
            case 'showAnimations':
                setShowAnimations(value)
                break
        }
        // Save to database
        saveSetting(key, value)
    }

    // Delete account
    const handleDeleteAccount = async () => {
        if (deleteConfirm !== "DELETE") {
            toast.error("Please type DELETE to confirm")
            return
        }

        setDeleting(true)
        try {
            const res = await fetch("/api/account/delete", {
                method: "DELETE"
            })
            if (res.ok) {
                toast.success("Account deleted successfully")
                signOut({ callbackUrl: "/" })
            } else {
                toast.error("Failed to delete account")
            }
        } catch (error) {
            toast.error("Failed to delete account")
        } finally {
            setDeleting(false)
        }
    }

    const primaryColors = [
        { id: "sky", name: "Sky", color: "bg-sky-100" },
        { id: "violet", name: "Violet", color: "bg-violet-100" },
        { id: "blue", name: "Blue", color: "bg-blue-100" },
        { id: "indigo", name: "Indigo", color: "bg-indigo-100" },
        { id: "cyan", name: "Cyan", color: "bg-cyan-100" },
        { id: "teal", name: "Teal", color: "bg-teal-100" },
        { id: "green", name: "Green", color: "bg-green-100" },
        { id: "amber", name: "Amber", color: "bg-amber-100" },
        { id: "orange", name: "Orange", color: "bg-orange-100" },
        { id: "rose", name: "Rose", color: "bg-rose-100" },
        { id: "pink", name: "Pink", color: "bg-pink-100" },
        { id: "slate", name: "Slate", color: "bg-slate-200" },
        { id: "emerald", name: "Emerald", color: "bg-emerald-100" },
        { id: "lavender", name: "Lavender", color: "bg-purple-50" },
    ]

    return (
        <div className="h-full">
            <div className="bg-white rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
                <div className="flex gap-6 p-6 flex-1 overflow-auto">
                    {/* Settings Sidebar */}
                    <div className="w-64 flex-shrink-0">
                        <div className="bg-gray-50 rounded-xl p-4">
                            <h2 className="text-lg font-semibold mb-4 px-2">{t.common.settings}</h2>
                            <nav className="space-y-1">
                                {settingsMenu.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={`/settings?tab=${item.id}`}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                                            activeSection === item.id
                                                ? item.id === "danger"
                                                    ? "bg-red-50 text-red-600"
                                                    : "bg-primary/10 text-primary"
                                                : item.id === "danger"
                                                    ? "text-red-500 hover:bg-red-50"
                                                    : "text-gray-600 hover:bg-white"
                                        )}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <div>
                                            <div className="font-medium text-sm">{item.name}</div>
                                            <div className={cn(
                                                "text-xs",
                                                item.id === "danger" ? "text-red-400" : "text-muted-foreground"
                                            )}>{item.description}</div>
                                        </div>
                                    </Link>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Settings Content */}
                    <div className="flex-1 max-w-3xl">
                        <div className="bg-gray-50 rounded-xl p-6">
                            {activeSection === "account" && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold">{t.settings.account.title}</h3>
                                        <p className="text-muted-foreground text-sm mt-1">
                                            {t.settings.account.description}
                                        </p>
                                    </div>
                                    <div className="border-t pt-6">
                                        <AccountForm />
                                    </div>
                                </div>
                            )}

                            {activeSection === "connect" && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold">{t.settings.connect.title}</h3>
                                        <p className="text-muted-foreground text-sm mt-1">
                                            {t.settings.connect.description}
                                        </p>
                                    </div>
                                    <div className="border-t pt-6">
                                        <ConnectForm
                                            facebookAccount={facebookAccount}
                                            googleAccount={googleAccount}
                                            onDisconnect={() => setFacebookAccount({ isConnected: false })}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeSection === "notifications" && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold">{t.settings.notifications.title}</h3>
                                        <p className="text-muted-foreground text-sm mt-1">
                                            {t.settings.notifications.description}
                                        </p>
                                    </div>
                                    <div className="border-t pt-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="font-medium">{t.settings.notifications.email}</Label>
                                                <p className="text-sm text-muted-foreground">{t.settings.notifications.emailDesc}</p>
                                            </div>
                                            <Switch
                                                checked={settings?.emailNotifications ?? true}
                                                onCheckedChange={(v) => handleSettingChange('emailNotifications', v)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="font-medium">{t.settings.notifications.campaign}</Label>
                                                <p className="text-sm text-muted-foreground">{t.settings.notifications.campaignDesc}</p>
                                            </div>
                                            <Switch
                                                checked={settings?.campaignAlerts ?? true}
                                                onCheckedChange={(v) => handleSettingChange('campaignAlerts', v)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="font-medium">{t.settings.notifications.weekly}</Label>
                                                <p className="text-sm text-muted-foreground">{t.settings.notifications.weeklyDesc}</p>
                                            </div>
                                            <Switch
                                                checked={settings?.weeklyReports ?? false}
                                                onCheckedChange={(v) => handleSettingChange('weeklyReports', v)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="font-medium">{t.settings.notifications.budget}</Label>
                                                <p className="text-sm text-muted-foreground">{t.settings.notifications.budgetDesc}</p>
                                            </div>
                                            <Switch
                                                checked={settings?.budgetAlerts ?? true}
                                                onCheckedChange={(v) => handleSettingChange('budgetAlerts', v)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === "security" && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold">{t.settings.security.title}</h3>
                                        <p className="text-muted-foreground text-sm mt-1">
                                            {t.settings.security.description}
                                        </p>
                                    </div>
                                    <div className="border-t pt-6 space-y-4">
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-base">{t.settings.security.mfa}</CardTitle>
                                                <CardDescription>{t.settings.security.mfaDesc}</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground">
                                                        {t.settings.security.status}: {settings?.twoFactorEnabled ? t.settings.security.enabled : t.settings.security.disabled}
                                                    </span>
                                                    <Switch
                                                        checked={settings?.twoFactorEnabled ?? false}
                                                        onCheckedChange={(v) => handleSettingChange('twoFactorEnabled', v)}
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <PasswordSetupForm />

                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-base">{t.settings.security.session}</CardTitle>
                                                <CardDescription>{t.settings.security.sessionDesc}</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-sm text-muted-foreground">
                                                    {t.settings.security.currentSession}: {session?.user?.email || t.settings.security.unknown}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            )}

                            {activeSection === "language" && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold">{t.settings.language.title}</h3>
                                        <p className="text-muted-foreground text-sm mt-1">
                                            {t.settings.language.description}
                                        </p>
                                    </div>
                                    <div className="border-t pt-6 space-y-4">
                                        <div className="space-y-2">
                                            <Label className="font-medium">{t.settings.language.display}</Label>
                                            <Select
                                                value={settings?.language || language}
                                                onValueChange={(value) => handleSettingChange('language', value)}
                                            >
                                                <SelectTrigger className="w-[200px]">
                                                    <SelectValue placeholder={t.settings.language.selectLang} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="en">English</SelectItem>
                                                    <SelectItem value="th">ไทย (Thai)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-medium">{t.settings.language.timezone}</Label>
                                            <Select
                                                value={settings?.timezone || "auto"}
                                                onValueChange={(value) => handleSettingChange('timezone', value)}
                                            >
                                                <SelectTrigger className="w-[280px]">
                                                    <SelectValue placeholder={t.settings.language.selectTz} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="auto">🌐 {t.settings.language.auto}</SelectItem>
                                                    <SelectItem value="asia-bangkok">Asia/Bangkok (GMT+7)</SelectItem>
                                                    <SelectItem value="asia-singapore">Asia/Singapore (GMT+8)</SelectItem>
                                                    <SelectItem value="asia-tokyo">Asia/Tokyo (GMT+9)</SelectItem>
                                                    <SelectItem value="europe-london">Europe/London (GMT+0)</SelectItem>
                                                    <SelectItem value="utc">UTC (GMT+0)</SelectItem>
                                                    <SelectItem value="america-newyork">America/New York (GMT-5)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-medium">{t.settings.language.currency}</Label>
                                            <Select
                                                value={settings?.currency || "usd"}
                                                onValueChange={(value) => handleSettingChange('currency', value)}
                                            >
                                                <SelectTrigger className="w-[200px]">
                                                    <SelectValue placeholder={t.settings.language.selectCurr} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="usd">USD ($)</SelectItem>
                                                    <SelectItem value="thb">THB (฿)</SelectItem>
                                                    <SelectItem value="eur">EUR (€)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === "appearance" && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold">{t.settings.appearance.title}</h3>
                                        <p className="text-muted-foreground text-sm mt-1">
                                            {t.settings.appearance.description}
                                        </p>
                                    </div>
                                    <div className="border-t pt-6 space-y-6">
                                        <div className="space-y-3">
                                            <Label className="font-medium">{t.settings.appearance.theme}</Label>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleSettingChange('theme', 'light')}
                                                    className={cn(
                                                        "flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all",
                                                        (settings?.theme || theme) === "light" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                                                    )}
                                                >
                                                    <div className="w-16 h-10 bg-white border rounded shadow-sm"></div>
                                                    <span className={cn("text-sm", (settings?.theme || theme) === "light" ? "font-medium text-primary" : "")}>{t.settings.appearance.light}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleSettingChange('theme', 'dark')}
                                                    className={cn(
                                                        "flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all",
                                                        (settings?.theme || theme) === "dark" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                                                    )}
                                                >
                                                    <div className="w-16 h-10 bg-gray-900 rounded shadow-sm"></div>
                                                    <span className={cn("text-sm", (settings?.theme || theme) === "dark" ? "font-medium text-primary" : "")}>{t.settings.appearance.dark}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleSettingChange('theme', 'system')}
                                                    className={cn(
                                                        "flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all",
                                                        (settings?.theme || theme) === "system" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                                                    )}
                                                >
                                                    <div className="w-16 h-10 bg-gradient-to-b from-white to-gray-900 rounded shadow-sm"></div>
                                                    <span className={cn("text-sm", (settings?.theme || theme) === "system" ? "font-medium text-primary" : "")}>{t.settings.appearance.system}</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <Label className="font-medium">{t.settings.appearance.primaryColor}</Label>
                                            <div className="flex flex-wrap gap-3">
                                                {primaryColors.map((color) => (
                                                    <button
                                                        key={color.id}
                                                        onClick={() => handleSettingChange('primaryColor', color.id)}
                                                        className={cn(
                                                            "flex flex-col items-center gap-2 p-3 border-2 rounded-lg transition-all min-w-[80px]",
                                                            (settings?.primaryColor || primaryColor) === color.id ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                                                        )}
                                                    >
                                                        <div className={cn("w-8 h-8 rounded-full shadow-sm", color.color)}></div>
                                                        <span className={cn("text-xs", (settings?.primaryColor || primaryColor) === color.id ? "font-medium text-primary" : "")}>{t.settings.appearance.colors[color.id as keyof typeof t.settings.appearance.colors] || color.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="pt-4 space-y-2">
                                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                    <span>{t.settings.appearance.intensity}</span>
                                                    <span className="font-medium text-foreground">{primaryIntensity}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={60}
                                                    max={140}
                                                    step={1}
                                                    value={primaryIntensity}
                                                    onChange={(e) => setPrimaryIntensity(Number(e.target.value))}
                                                    className="w-full"
                                                    style={{ accentColor: "var(--primary)" }}
                                                />
                                                <p className="text-xs text-muted-foreground">{t.settings.appearance.intensityDesc}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between py-2">
                                            <div>
                                                <Label className="font-medium">{t.settings.appearance.compact}</Label>
                                                <p className="text-sm text-muted-foreground">{t.settings.appearance.compactDesc}</p>
                                            </div>
                                            <Switch
                                                checked={settings?.compactMode ?? compactMode}
                                                onCheckedChange={(v) => handleSettingChange('compactMode', v)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between py-2">
                                            <div>
                                                <Label className="font-medium">{t.settings.appearance.animations}</Label>
                                                <p className="text-sm text-muted-foreground">{t.settings.appearance.animationsDesc}</p>
                                            </div>
                                            <Switch
                                                checked={settings?.showAnimations ?? showAnimations}
                                                onCheckedChange={(v) => handleSettingChange('showAnimations', v)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === "danger" && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold text-red-600">{t.settings.danger.title}</h3>
                                        <p className="text-muted-foreground text-sm mt-1">
                                            {t.settings.danger.description}
                                        </p>
                                    </div>
                                    <div className="border-t pt-6">
                                        <Card className="border-red-200 bg-red-50">
                                            <CardHeader>
                                                <CardTitle className="text-red-600 flex items-center gap-2">
                                                    <Trash2 className="w-5 h-5" />
                                                    {t.settings.danger.zone}
                                                </CardTitle>
                                                <CardDescription className="text-red-500">
                                                    {t.settings.danger.warning}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="text-sm text-gray-700">
                                                    <p className="font-medium mb-2">{t.settings.danger.impact}</p>
                                                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                                                        <li>{t.settings.danger.impact1}</li>
                                                        <li>{t.settings.danger.impact2}</li>
                                                        <li>{t.settings.danger.impact3}</li>
                                                        <li>{t.settings.danger.impact4}</li>
                                                    </ul>
                                                </div>

                                                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="destructive" className="w-full">
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            {t.settings.danger.button}
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle className="text-red-600">{t.settings.danger.confirmTitle}</DialogTitle>
                                                            <DialogDescription>
                                                                {t.settings.danger.confirmDesc} <strong>{t.settings.danger.confirmKeyword}</strong> {t.settings.danger.confirmSuffix}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="py-4">
                                                            <Input
                                                                placeholder={`${t.settings.danger.confirmDesc} ${t.settings.danger.confirmKeyword}`}
                                                                value={deleteConfirm}
                                                                onChange={(e) => setDeleteConfirm(e.target.value)}
                                                                className="border-red-200 focus:border-red-500"
                                                            />
                                                        </div>
                                                        <DialogFooter>
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setDeleteDialogOpen(false)
                                                                    setDeleteConfirm("")
                                                                }}
                                                            >
                                                                {t.common.cancel}
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                onClick={handleDeleteAccount}
                                                                disabled={deleteConfirm !== "DELETE" || deleting}
                                                            >
                                                                {deleting ? "Deleting..." : t.settings.danger.button}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
