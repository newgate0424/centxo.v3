"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ArrowLeft, Lock, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react"
import { LogoStatic } from "@/components/Logo"

function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get("token")
    
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [isError, setIsError] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    useEffect(() => {
        if (!token) {
            setIsError(true)
            setErrorMessage("Invalid reset link. Please request a new password reset.")
        }
    }, [token])

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)
        const password = formData.get("password") as string
        const confirmPassword = formData.get("confirmPassword") as string

        if (password !== confirmPassword) {
            toast.error("Passwords do not match")
            setIsLoading(false)
            return
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters")
            setIsLoading(false)
            return
        }

        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || "Something went wrong")
            }
            
            setIsSuccess(true)
            toast.success("Password reset successfully")
        } catch (error) {
            if (error instanceof Error) {
                setIsError(true)
                setErrorMessage(error.message)
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
                </div>
            </nav>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    {/* Card */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-blue-500/10 border border-blue-100/50 p-8">
                        {isError ? (
                            <div className="text-center">
                                <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                    <XCircle className="w-7 h-7 text-red-600" />
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-2">Link expired</h1>
                                <p className="text-gray-600 mb-6">{errorMessage}</p>
                                <Link href="/forgot-password">
                                    <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base font-medium">
                                        Request new link
                                    </Button>
                                </Link>
                            </div>
                        ) : isSuccess ? (
                            <div className="text-center">
                                <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle className="w-7 h-7 text-green-600" />
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-2">Password reset!</h1>
                                <p className="text-gray-600 mb-6">
                                    Your password has been successfully reset. You can now sign in with your new password.
                                </p>
                                <Button 
                                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base font-medium"
                                    onClick={() => router.push("/login")}
                                >
                                    Sign in
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-8">
                                    <div className="mx-auto w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                        <Lock className="w-7 h-7 text-blue-600" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Set new password</h1>
                                    <p className="text-gray-600">Your new password must be at least 6 characters.</p>
                                </div>

                                {/* Password Form */}
                                <form onSubmit={onSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-sm font-medium text-gray-700">New Password</Label>
                                        <div className="relative">
                                            <Input 
                                                id="password" 
                                                name="password" 
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Enter new password"
                                                required 
                                                minLength={6}
                                                className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 pr-12"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
                                        <div className="relative">
                                            <Input 
                                                id="confirmPassword" 
                                                name="confirmPassword" 
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="Confirm new password"
                                                required 
                                                minLength={6}
                                                className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 pr-12"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <Button 
                                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base font-medium shadow-md shadow-blue-500/20 mt-2" 
                                        type="submit" 
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Resetting...</span>
                                            </div>
                                        ) : (
                                            "Reset Password"
                                        )}
                                    </Button>
                                </form>
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

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    )
}
