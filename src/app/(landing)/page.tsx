"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Users, Zap, BarChart3, Shield, ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'authenticated') {
            router.push('/dashboard');
        }
    }, [status, router]);
    const features = [
        {
            icon: Sparkles,
            title: "AI-Powered Automation",
            description: "Let AI handle your ad copy generation and optimization automatically",
            color: "text-blue-500"
        },
        {
            icon: Zap,
            title: "Lightning Fast Setup",
            description: "Launch complete campaigns in minutes, not hours",
            color: "text-yellow-500"
        },
        {
            icon: BarChart3,
            title: "Real-time Analytics",
            description: "Track performance metrics and ROI in real-time with actionable insights",
            color: "text-green-500"
        },
        {
            icon: Shield,
            title: "Secure & Reliable",
            description: "Enterprise-grade security with 99.9% uptime guarantee",
            color: "text-purple-500"
        }
    ];

    return (
        <div className="relative">
            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
                <div className="container mx-auto px-4 sm:px-8 relative z-10 text-center py-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-4xl mx-auto"
                    >
                        <div className="inline-block mb-6 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium">
                            ✨ AI-Powered Ad Management Platform
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight">
                            Scale Your Ads with
                            <span className="text-primary"> AI Automation</span>
                        </h1>
                        <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10">
                            Launch, optimize, and scale Facebook Messenger campaigns effortlessly.
                            Let AI handle the heavy lifting while you focus on growth.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Link href="/signup">
                                <Button size="lg" className="rounded-full px-8 h-14 text-lg shadow-xl shadow-primary/25 w-full sm:w-auto">
                                    Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Link href="#features">
                                <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-lg w-full sm:w-auto">
                                    See How It Works
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>

                {/* Scroll indicator */}
                <motion.div
                    className="absolute bottom-10 left-1/2 -translate-x-1/2"
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    <ChevronDown className="w-8 h-8 text-muted-foreground" />
                </motion.div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 md:py-32 relative">
                <div className="container mx-auto px-4 sm:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                            Everything you need to succeed
                        </h2>
                        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                            Powerful features designed to help you scale your advertising campaigns
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                className="relative group"
                            >
                                <div className="p-6 rounded-2xl border bg-card hover:shadow-xl transition-all duration-300 h-full">
                                    <div className={`${feature.color} mb-4`}>
                                        <feature.icon className="h-10 w-10" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                                    <p className="text-muted-foreground">{feature.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 md:py-32 relative">
                <div className="container mx-auto px-4 sm:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="max-w-4xl mx-auto text-center"
                    >
                        <div className="relative rounded-3xl border bg-card/50 backdrop-blur-sm p-8 sm:p-12 md:p-16 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
                            <div className="relative z-10">
                                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                                    Ready to scale your ads?
                                </h2>
                                <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                                    Join thousands of marketers who trust AdPilot AI to automate and optimize their campaigns
                                </p>
                                <Link href="/signup">
                                    <Button size="lg" className="rounded-full px-8 h-14 text-lg shadow-xl shadow-primary/25">
                                        Start Your Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </Link>
                                <p className="text-sm text-muted-foreground mt-4">
                                    No credit card required • 14-day free trial
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
