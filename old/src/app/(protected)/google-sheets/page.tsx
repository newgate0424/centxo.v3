"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import GoogleSheetsConfigContent from "@/components/GoogleSheetsConfigContent"
import ClientRouteGuard from '@/components/ClientRouteGuard'
import { FileSpreadsheet, Settings2, FolderOpen } from "lucide-react"
import { useState, useEffect } from "react"

export default function GoogleSheetsPage() {
    const [activeTab, setActiveTab] = useState<string>("export")
    const [mounted, setMounted] = useState(false)

    // Load saved tab from localStorage on mount
    useEffect(() => {
        setMounted(true)
        const savedTab = localStorage.getItem("googleSheetsActiveTab")
        if (savedTab) {
            setActiveTab(savedTab)
        }
    }, [])

    // Save tab to localStorage when it changes
    const handleTabChange = (value: string) => {
        setActiveTab(value)
        localStorage.setItem("googleSheetsActiveTab", value)
    }

    if (!mounted) {
        return null
    }

    return (
        <ClientRouteGuard requiredRoute="/google-sheets">
            <div className="h-full">
                <Card className="h-full flex flex-col border-0 shadow-none md:border md:shadow-sm rounded-none md:rounded-2xl">
                    <CardHeader className="px-6 py-4 border-b flex flex-row items-center gap-2 space-y-0">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        <CardTitle className="text-xl">Google Sheets Export</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-0">
                        <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
                            <div className="px-6 pt-6 pb-0">
                                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                                    <TabsTrigger value="export" className="flex items-center gap-2">
                                        <FolderOpen className="h-4 w-4" />
                                        เลือกบัญชีโฆษณา
                                    </TabsTrigger>
                                    <TabsTrigger value="saved" className="flex items-center gap-2">
                                        <Settings2 className="h-4 w-4" />
                                        การตั้งค่าที่บันทึกไว้
                                    </TabsTrigger>
                                </TabsList>
                            </div>
                            
                            <TabsContent value="export" className="flex-1 overflow-y-auto mt-0">
                                <GoogleSheetsConfigContent
                                    dataType="ads"
                                    standalone={false}
                                    className="p-6 max-w-5xl mx-auto"
                                    mode="export"
                                    onSwitchToSaved={() => {
                                        setActiveTab("saved")
                                        localStorage.setItem("googleSheetsActiveTab", "saved")
                                    }}
                                />
                            </TabsContent>
                            
                            <TabsContent value="saved" className="flex-1 overflow-y-auto mt-0">
                                <GoogleSheetsConfigContent
                                    dataType="ads"
                                    standalone={false}
                                    className="p-6 max-w-5xl mx-auto"
                                    mode="saved"
                                />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </ClientRouteGuard>
    )
}
