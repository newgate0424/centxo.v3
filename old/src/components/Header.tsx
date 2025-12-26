"use client"

import { User } from "next-auth"
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
import { useLanguage } from "@/contexts/LanguageContext"
import { Globe, Menu } from "lucide-react"
import Logo from "@/components/Logo"

interface HeaderProps {
    user?: User & {
        id?: string
    }
    onMobileMenuToggle?: () => void
}

export default function Header({ user, onMobileMenuToggle }: HeaderProps) {
    const { language, setLanguage } = useLanguage()

    return (
        <header className="flex items-center justify-between h-16 px-3 sm:px-6 bg-transparent text-white z-20 relative">
            <div className="flex items-center gap-2">
                {/* Mobile Menu Button */}
                {onMobileMenuToggle && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden h-8 w-8 text-white hover:bg-white/20"
                        onClick={onMobileMenuToggle}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                )}
                <Link href="/dashboard">
                    <Logo size="md" />
                </Link>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 hover:text-white">
                            <Globe className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-accent' : ''}>
                            English
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage('th')} className={language === 'th' ? 'bg-accent' : ''}>
                            ภาษาไทย
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-white/20">
                            <Avatar className="h-8 w-8 border-2 border-white/20">
                                <AvatarImage src={user?.image || ""} alt={user?.name || ""} referrerPolicy="no-referrer" />
                                <AvatarFallback className="text-black">{user?.name?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user?.email || ''}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/settings/account">Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/settings/connect">Connect Facebook</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
