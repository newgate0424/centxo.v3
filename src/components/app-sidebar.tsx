"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Settings,
    LogOut,
    Menu,
    Megaphone,
    Rocket,
    Sparkles,
    ChevronRight,
    ChevronDown,
    Layers,
    Target,
    FileSpreadsheet,
} from 'lucide-react';
import {
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useState, useEffect } from "react"

import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"
import { useLanguage } from "@/contexts/LanguageContext"

interface AppSidebarProps {
    isCollapsed: boolean
    toggleSidebar: () => void
    onMobileClose?: () => void
    isMobile?: boolean
}

// Define Navigation Structure
type NavItem = {
    name: string
    href: string
    icon?: any
    translationKey?: string
    isChild?: boolean
}

type NavGroup = {
    label?: string
    items: (NavItem | {
        name: string
        icon: any
        translationKey?: string
        children: NavItem[]
    })[]
}

const navStructure: NavGroup[] = [
    {
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, translationKey: 'nav.dashboard' },
            {
                name: "Campaigns",
                icon: Layers,
                translationKey: 'nav.campaigns',
                children: [
                    { name: "Automation (V2)", href: "/automation-campaignsv2", icon: Sparkles, translationKey: 'nav.automationV2', isChild: true },
                    { name: "Launch Wizard", href: "/launch-new", icon: Rocket, translationKey: 'nav.launchNew', isChild: true },
                ]
            },
            {
                name: "Ads Manager",
                icon: Megaphone,
                translationKey: 'nav.adsManager',
                children: [
                    { name: "Accounts", href: "/ads-manager/accounts", icon: Megaphone, translationKey: 'adsManager.accounts', isChild: true },
                    { name: "Campaigns", href: "/ads-manager/campaigns", icon: LayoutDashboard, translationKey: 'adsManager.campaigns', isChild: true },
                    { name: "Super Target", href: "/ads-manager/super-target", icon: Target, translationKey: 'adsManager.superTarget', isChild: true },
                ]
            },
            { name: "Settings", href: "/settings", icon: Settings, translationKey: 'nav.settings' },
        ]
    }
]

export default function AppSidebar({ isCollapsed, toggleSidebar, onMobileClose, isMobile = false }: AppSidebarProps) {
    const pathname = usePathname()
    const { t } = useLanguage()
    // Strip locale prefix for navigation comparison
    const pathnameWithoutLocale = pathname.replace(/^\/(en|th)/, '') || '/'

    // State for Collapsed Groups
    // Default open: "Campaigns"
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        "Campaigns": true
    })

    // Load state from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem('sidebarOpenGroups')
        if (saved) {
            try {
                setOpenGroups(JSON.parse(saved))
            } catch (e) {
                console.error("Failed to parse sidebar state", e)
            }
        }
    }, [])

    const toggleGroup = (groupName: string) => {
        if (isCollapsed) return // Don't toggle in collapsed mode
        setOpenGroups(prev => {
            const newState = {
                ...prev,
                [groupName]: !prev[groupName]
            }
            try {
                localStorage.setItem('sidebarOpenGroups', JSON.stringify(newState))
            } catch (e) {
                // Ignore write errors
            }
            return newState
        })
    }

    return (
        <div className={cn(
            "flex flex-col h-full overflow-x-hidden",
            "transition-all duration-300 ease-out",
            isCollapsed ? "w-[54px]" : "w-[230px]",
            isMobile ? "bg-background/95 backdrop-blur-xl border-r w-[230px]" : "bg-transparent"
        )}>
            {/* Logo Area */}
            <div
                suppressHydrationWarning
                className={cn(
                    "flex items-center h-12 transition-all duration-300",
                    isCollapsed ? "justify-center px-0" : "px-6"
                )}>
                {/* Logo - Text hidden on collapse */}
                <Link href="/dashboard" className={cn(
                    "flex items-center gap-3 transition-opacity duration-200",
                    isCollapsed ? "hidden" : "opacity-100"
                )}>
                    <img src="/centxo-logo.png" alt="Centxo" className="w-8 h-8 rounded-xl" />
                    <span className="font-outfit font-bold text-xl tracking-tight">Centxo</span>
                </Link>

                {/* Logo Icon Only for Collapsed */}
                {isCollapsed && (
                    <Link href="/dashboard" className="flex items-center justify-center w-full">
                        <img src="/centxo-logo.png" alt="Centxo" className="w-8 h-8 rounded-xl" />
                    </Link>
                )}
            </div>

            {/* Navigation */}
            <div className={cn(
                "flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-6",
                isCollapsed ? "px-0 pl-3.5" : "px-3"
            )}>
                {navStructure.map((group, groupIndex) => (
                    <div key={groupIndex} className={cn(
                        "space-y-1",
                        groupIndex > 0 && "pt-6 border-t border-border/30"
                    )}>
                        {/* Group Label */}
                        {!isCollapsed && group.label && (
                            <h4 className="px-3 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">
                                {group.label}
                            </h4>
                        )}

                        <nav className="space-y-1">
                            {group.items.map((item: any, itemIndex) => {
                                // 1. Parent Item with Children
                                if (item.children) {
                                    const isOpen = openGroups[item.name] || false
                                    const isAnyChildActive = item.children.some((child: any) =>
                                        pathnameWithoutLocale === child.href || pathnameWithoutLocale.startsWith(child.href + '/')
                                    )

                                    return (
                                        <div key={item.name}>
                                            <button
                                                onClick={() => toggleGroup(item.name)}
                                                className={cn(
                                                    "w-full flex items-center justify-between py-2 px-3 text-sm font-medium rounded-lg transition-colors group select-none",
                                                    isAnyChildActive ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                                    isCollapsed && "justify-center px-0"
                                                )}
                                                title={isCollapsed ? item.name : undefined}
                                            >
                                                <div className={cn(
                                                    "flex items-center",
                                                    isCollapsed ? "justify-center" : "gap-3"
                                                )}>
                                                    <item.icon className={cn("h-4 w-4", isAnyChildActive ? "text-primary" : "text-muted-foreground")} />
                                                    {!isCollapsed && <span className="whitespace-nowrap">{t(item.translationKey, item.name)}</span>}
                                                </div>
                                                {!isCollapsed && (
                                                    <ChevronRight className={cn(
                                                        "h-3 w-3 text-muted-foreground/50 transition-transform duration-200",
                                                        isOpen && "rotate-90"
                                                    )} />
                                                )}
                                            </button>

                                            {/* Nested Items */}
                                            {!isCollapsed && isOpen && (
                                                <div className="mt-1 ml-4 pl-3 border-l border-border/40 space-y-1">
                                                    {item.children.map((child: any) => {
                                                        const isActive = pathnameWithoutLocale === child.href || pathnameWithoutLocale.startsWith(child.href + '/')
                                                        return (
                                                            <Link
                                                                key={child.href}
                                                                href={child.href}
                                                                onClick={onMobileClose}
                                                                className={cn(
                                                                    "block py-1.5 px-3 text-sm rounded-md transition-colors whitespace-nowrap",
                                                                    isActive
                                                                        ? "text-primary font-medium bg-primary/5"
                                                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                                                )}
                                                            >
                                                                {t(child.translationKey, child.name)}
                                                            </Link>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                }

                                // 2. Single Link Item
                                const isActive = pathnameWithoutLocale === item.href || pathnameWithoutLocale.startsWith(item.href + '/')

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={onMobileClose}
                                        className={cn(
                                            "flex items-center py-2 px-3 text-sm font-medium rounded-lg transition-colors group relative",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                            isCollapsed && "justify-center px-0"
                                        )}
                                        title={isCollapsed ? item.name : undefined}
                                    >
                                        <div className={cn(
                                            "flex items-center",
                                            isCollapsed ? "justify-center" : "gap-3"
                                        )}>
                                            <item.icon className="h-4 w-4" />
                                            {!isCollapsed && <span className="whitespace-nowrap">{t(item.translationKey ?? item.name, item.name)}</span>}
                                        </div>
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>
                ))}
            </div>

            {/* Footer / User / Collapse Toggle */}
            <div
                suppressHydrationWarning
                className={cn(
                    "mt-auto border-t border-border/30 mb-6",
                    isCollapsed ? "pb-2 pl-3.5 pr-0" : "p-3"
                )}>
                {!isMobile && (
                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            "flex items-center justify-center w-full py-2 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors mb-1",
                            isCollapsed ? "px-0" : "px-3"
                        )}
                        title={isCollapsed ? "Expand" : "Collapse"}
                    >
                        <Menu size={18} />
                    </button>
                )}

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <button
                            className={cn(
                                "flex items-center w-full py-2 text-sm font-medium text-destructive/80 hover:text-destructive rounded-lg hover:bg-destructive/10 transition-all",
                                isCollapsed ? "justify-center px-0" : "px-3 gap-3"
                            )}
                            title={isCollapsed ? t('header.logout', 'Log out') : undefined}
                        >
                            <LogOut className="h-4 w-4" />
                            {!isCollapsed && <span className="whitespace-nowrap">{t('header.logout', 'Log out')}</span>}
                        </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                            <AlertDialogDescription>
                                You will be redirected to the login page.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => signOut({ callbackUrl: "/login" })}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Log out
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div >
    )
}
