import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function Hero() {
    return (
        <section className="py-20 bg-gradient-to-b from-white to-blue-50">
            <div className="container mx-auto px-6 text-center">
                <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight sm:text-6xl mb-6">
                    Manage Your Facebook Ads <br className="hidden sm:block" />
                    <span className="text-blue-600">Like a Pro</span>
                </h1>
                <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto mb-10">
                    Simplify your ad management workflow. Track performance, manage multiple accounts, and get actionable insights in one place.
                </p>
                <div className="flex justify-center gap-4">
                    <Link href="/register">
                        <Button size="lg" className="h-12 px-8 text-lg">
                            Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                    <Link href="/login">
                        <Button variant="outline" size="lg" className="h-12 px-8 text-lg">
                            Live Demo
                        </Button>
                    </Link>
                </div>
                <div className="mt-16 relative">
                    <div className="absolute inset-0 bg-blue-600 blur-3xl opacity-10 rounded-full transform scale-75"></div>
                    <div className="relative rounded-xl border bg-white shadow-2xl p-4 max-w-4xl mx-auto">
                        {/* Placeholder for a dashboard screenshot */}
                        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                            Dashboard Preview
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
