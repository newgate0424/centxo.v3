"use client"

import { useMemo } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Settings, LogOut, Menu, Megaphone, Receipt, FileSpreadsheet, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"
import { useLanguage } from "@/contexts/LanguageContext"
import { canAccessRoute, type Role } from "@/lib/permissions"



interface SidebarProps {
    isCollapsed: boolean
    toggleSidebar: () => void
    userRole?: Role | null
    onMobileClose?: () => void
    isMobile?: boolean
}

export function Sidebar({ isCollapsed, toggleSidebar, userRole = null, onMobileClose, isMobile = false }: SidebarProps) {
    const pathname = usePathname()
    const { t } = useLanguage()

    const navigation = useMemo(() => {
        const allRoutes = [
            { name: t.common.dashboard, href: "/dashboard", icon: LayoutDashboard },
            { name: t.common.adManager, href: "/admanager", icon: Megaphone },
            { name: t.common.googleSheets, href: "/google-sheets", icon: FileSpreadsheet },
            { name: t.common.settings, href: "/settings", icon: Settings },
        ]

        // Filter based on user role
        return allRoutes.filter(route =>
            canAccessRoute(userRole, route.href)
        )
    }, [t, userRole])

    return (
        <div className={cn(
            "flex flex-col bg-white shadow-sm h-full",
            "transition-all duration-300 ease-in-out",
            // Remove rounded corners on mobile
            isMobile ? "" : "rounded-xl",
            isCollapsed ? "w-16" : "w-64"
        )}>
            <div className={cn(
                "flex items-center h-12 px-2 transition-all duration-300 ease-in-out",
                isCollapsed ? "justify-center" : "justify-end"
            )}>
                <button
                    onClick={toggleSidebar}
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors duration-200"
                >
                    <Menu size={18} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="px-2 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch={true}
                                onClick={onMobileClose}
                                className={cn(
                                    "flex items-center px-2 py-2 text-sm font-medium rounded-md group relative",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                                    isCollapsed ? "justify-center" : "px-4"
                                )}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <item.icon
                                    className={cn(
                                        "h-5 w-5 flex-shrink-0",
                                        isActive ? "text-primary" : "text-gray-400 group-hover:text-gray-500",
                                        !isCollapsed && "mr-3"
                                    )}
                                />
                                {!isCollapsed && <span>{item.name}</span>}
                            </Link>
                        )
                    })}
                </nav>
            </div>
            <div className="p-4 mt-auto">
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className={cn(
                        "flex items-center w-full py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50",
                        isCollapsed ? "justify-center px-0" : "px-4"
                    )}
                    title={isCollapsed ? t.common.signOut : undefined}
                >
                    <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                    {!isCollapsed && t.common.signOut}
                </button>
            </div>
        </div>
    )
}

export default Sidebar
