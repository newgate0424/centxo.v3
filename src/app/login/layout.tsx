import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen w-full relative flex flex-col bg-background">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,#3b82f61a,transparent)] pointer-events-none" />

            {/* Header */}
            <header className="absolute top-0 left-0 right-0 z-50 w-full">
                <div className="container flex h-16 items-center justify-between px-4 sm:px-8">
                    <Link href="/" className="flex items-center gap-2">
                        <img src="/centxo-logo.png" alt="Centxo" className="w-8 h-8 rounded-lg" />
                        <span className="font-bold text-xl hidden sm:inline-block">Centxo</span>
                    </Link>

                    <ThemeToggle />
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center p-6 relative z-10 w-full animate-in fade-in zoom-in-95 duration-500">
                {children}
            </main>
        </div>
    );
}
