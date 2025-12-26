"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ArrowLeft, Mail, CheckCircle } from "lucide-react"
import { LogoStatic } from "@/components/Logo"

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [email, setEmail] = useState("")

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)
        const emailValue = formData.get("email") as string
        setEmail(emailValue)

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailValue }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || "Something went wrong")
            }
            
            setIsSubmitted(true)
            toast.success("Reset link sent successfully")
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message)
            } else {
                toast.error("Something went wrong. Please try again.")
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 flex flex-col">
            {/* Header */}
            <nav className="w-full bg-blue-50/80 backdrop-blur-md border-b border-blue-100/50">
                <div className="flex items-center justify-between px-6 py-4 max-w-[1400px] mx-auto w-full">
                    <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <LogoStatic size="md" />
                    </Link>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">Remember your password?</span>
                        <Link href="/login">
                            <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg px-5 py-2 text-sm font-medium">
                                Sign In
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    {/* Card */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-blue-500/10 border border-blue-100/50 p-8">
                        {!isSubmitted ? (
                            <>
                                <div className="text-center mb-8">
                                    <div className="mx-auto w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                        <Mail className="w-7 h-7 text-blue-600" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot password?</h1>
                                    <p className="text-gray-600">No worries, we&apos;ll send you reset instructions.</p>
                                </div>

                                {/* Email Form */}
                                <form onSubmit={onSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                                        <Input 
                                            id="email" 
                                            name="email" 
                                            type="email" 
                                            placeholder="you@example.com" 
                                            required 
                                            className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                    <Button 
                                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base font-medium shadow-md shadow-blue-500/20 mt-2" 
                                        type="submit" 
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Sending...</span>
                                            </div>
                                        ) : (
                                            "Reset Password"
                                        )}
                                    </Button>
                                </form>
                            </>
                        ) : (
                            <>
                                <div className="text-center">
                                    <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle className="w-7 h-7 text-green-600" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
                                    <p className="text-gray-600 mb-2">
                                        We sent a password reset link to
                                    </p>
                                    <p className="text-gray-900 font-medium mb-6">{email}</p>
                                    
                                    <Button 
                                        variant="outline"
                                        className="w-full h-12 rounded-xl text-base font-medium border-gray-200 hover:bg-gray-50 mb-4"
                                        onClick={() => window.open("https://mail.google.com", "_blank")}
                                    >
                                        Open email app
                                    </Button>
                                    
                                    <p className="text-sm text-gray-500">
                                        Didn&apos;t receive the email?{" "}
                                        <button 
                                            onClick={() => setIsSubmitted(false)}
                                            className="text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            Click to resend
                                        </button>
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Back to login */}
                    <div className="text-center mt-6">
                        <Link 
                            href="/login" 
                            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
