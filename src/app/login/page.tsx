'use client';

import { Suspense } from 'react';
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

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

function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({ email: "", password: "" });

    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam) {
            const errorMessages: { [key: string]: string } = {
                'Callback': 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง',
                'OAuthCallback': 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย OAuth',
                'OAuthAccountNotLinked': 'อีเมลนี้ถูกใช้กับ provider อื่นแล้ว',
                'Default': 'เกิดข้อผิดพลาด: ' + errorParam,
            };
            setError(errorMessages[errorParam] || errorMessages['Default']);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                redirect: false,
                email: formData.email,
                password: formData.password,
            });

            if (result?.error) {
                alert(result.error);
            } else {
                router.push("/dashboard");
            }
        } catch (error) {
            alert("An error occurred during sign in");
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
                <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
                <CardDescription className="text-base">
                    Sign in to your account to continue
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 px-8 sm:px-10">
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
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
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                            <Link href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                                Forgot password?
                            </Link>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="h-11 rounded-xl bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary/20"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 rounded-3xl text-base font-semibold shadow-primary/25 hover:shadow-primary/40 shadow-lg transition-all"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
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

            <CardFooter className="flex justify-center pb-8 pt-2">
                <p className="text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="font-medium text-primary hover:underline">
                        Create one for free
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginPageContent />
        </Suspense>
    );
}