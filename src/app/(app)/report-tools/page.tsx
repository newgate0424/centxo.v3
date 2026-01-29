"use client"

import Link from "next/link"
import { FileSpreadsheet } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

export default function ReportToolsPage() {
    const { t } = useLanguage()

    const tools = [
        {
            href: "/report-tools/google-sheets-export",
            icon: FileSpreadsheet,
            title: t("reportTools.googleSheetsExport", "Google Sheets Export"),
            description: t("reportTools.googleSheetsExportDesc", "Export ad data to Google Sheets with custom column mapping"),
        },
    ]

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">
                    {t("reportTools.title", "Report Tools")}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {t("reportTools.subtitle", "Export and report your ad performance data")}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
                {tools.map((tool) => (
                    <Link
                        key={tool.href}
                        href={tool.href}
                        className="flex items-start gap-4 rounded-xl border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
                    >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <tool.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold">{tool.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
