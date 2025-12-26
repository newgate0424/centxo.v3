"use client"

import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { Menu, Settings, LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/contexts/LanguageContext"

interface AppHeaderProps {
    onMobileMenuToggle?: () => void
}

export default function AppHeader({ onMobileMenuToggle }: AppHeaderProps) {
    const { data: session } = useSession()
    const { t, language } = useLanguage()
    const user = session?.user

    return (
        <header className="flex items-center justify-between h-16 px-4 md:px-8 z-20 relative">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                {onMobileMenuToggle && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden text-foreground hover:bg-accent"
                        onClick={onMobileMenuToggle}
                    >
                        <Menu className="h-6 w-6" />
                    </Button>
                )}

                {/* Mobile Logo */}
                <Link href="/dashboard" className="flex md:hidden items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <span className="text-white font-bold text-lg">A</span>
                    </div>
                </Link>
            </div>

            <div className="flex items-center space-x-3 sm:space-x-6">
                <LanguageToggle />
                
                <ThemeToggle />

                <div className="h-8 w-[1px] bg-border hidden sm:block" />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-accent/50 transition-colors">
                            <Avatar className="h-10 w-10 border-2 border-white dark:border-zinc-800 shadow-sm">
                                <AvatarImage src={user?.image || ""} alt={user?.name || ""} referrerPolicy="no-referrer" />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">{user?.name?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 p-2 glass-card border-none" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal p-2">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-semibold leading-none">{user?.name || 'User'}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user?.email || ''}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-border/50" />
                        <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary">
                            <Link href="/settings" className="flex items-center w-full py-2">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>{t('header.settings', 'Settings')}</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border/50" />
                        <DropdownMenuItem
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="rounded-lg cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive py-2"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>{t('header.logout', 'Log out')}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
