"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Redirect legacy export-sheet URL to Report Tools
export default function ExportSheetRedirectPage() {
    const router = useRouter()
    useEffect(() => {
        router.replace("/report-tools/google-sheets-export")
    }, [router])
    return null
}
