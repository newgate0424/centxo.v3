'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { showCustomToast } from "@/utils/custom-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const FacebookIcon = () => (
    <svg className="h-5 w-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 2.848-5.978 5.817-5.978.33 0 3.165.178 3.165.178v3.39H16.27c-2.095 0-2.625 1.106-2.625 2.03v1.96h3.848l-.519 3.667h-3.329v7.98h-4.544z" />
    </svg>
);

export default function SignupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                showCustomToast(data.error || "Registration failed");
                return;
            }

            // Auto sign in after registration
            const result = await signIn("credentials", {
                redirect: false,
                email: formData.email,
                password: formData.password,
            });

            if (result?.error) {
                showCustomToast(result.error);
            } else {
                router.push("/dashboard");
            }
        } catch (error) {
            showCustomToast("An error occurred during registration");
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthSignIn = async (provider: "google" | "facebook") => {
        setLoading(true);
        await signIn(provider, { callbackUrl: "/dashboard" });
    };

    return (
        <Card className="w-full max-w-[450px] shadow-2xl border-0 sm:border sm:rounded-3xl overflow-hidden bg-card">
            <CardHeader className="space-y-1 text-center pb-8 pt-10">
                <CardTitle className="text-2xl font-bold tracking-tight">Create your account</CardTitle>
                <CardDescription className="text-base">
                    Start managing your ads like a pro
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 px-8 sm:px-10">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="full-name">Full Name</Label>
                        <Input
                            id="full-name"
                            placeholder="Alex Thunder"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="h-11 rounded-xl bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary/20"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="h-11 rounded-xl bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary/20"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Create a strong password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="h-11 rounded-xl bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary/20"
                            required
                            minLength={8}
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 rounded-3xl text-base font-semibold shadow-primary/25 hover:shadow-primary/40 shadow-lg transition-all"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Account"}
                    </Button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or continue with</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <Button
                        variant="outline"
                        disabled={loading}
                        onClick={() => handleOAuthSignIn("google")}
                        className="w-full h-11 rounded-3xl font-medium border-muted-foreground/20 hover:bg-muted/30 transition-all justify-center gap-3"
                    >
                        <GoogleIcon />
                        Continue with Google
                    </Button>
                    <Button
                        variant="outline"
                        disabled={loading}
                        onClick={() => handleOAuthSignIn("facebook")}
                        className="w-full h-11 rounded-3xl font-medium border-muted-foreground/20 hover:bg-muted/30 transition-all justify-center gap-3"
                    >
                        <FacebookIcon />
                        Continue with Facebook
                    </Button>
                </div>
            </CardContent>

            <CardFooter className="flex flex-col justify-center pb-8 pt-2 gap-4">
                <p className="text-xs text-center text-muted-foreground px-4">
                    By creating an account, you agree to our <Link href="#" className="text-primary hover:underline">Terms of Service</Link> and <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>
                </p>

                <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium text-primary hover:underline">
                        Sign in instead
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}
