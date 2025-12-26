import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Navbar from "@/components/landing/Navbar"
import Footer from "@/components/landing/Footer"
import HeroSection from "@/components/landing/HeroSection"
import CTA from "@/components/landing/CTA"
import SimpleFeature from "@/components/landing/SimpleFeature"


export default async function LandingPage() {
  // Check if user is logged in
  const session = await getServerSession(authOptions)

  // If logged in, redirect to dashboard
  if (session) {
    // Next.js redirect() uses the request's host header automatically
    // So it will redirect to the correct domain (adser.net in production)
    redirect("/dashboard")
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <SimpleFeature />
      <CTA />
      <Footer />
    </main>
  )
}
