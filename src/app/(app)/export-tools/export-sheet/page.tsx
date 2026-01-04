"use client"

import { useState } from 'react'
import GoogleSheetsConfigContent, { ExportConfig } from "@/components/GoogleSheetsConfigContent"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ExportSheetPage() {
    const [activeTab, setActiveTab] = useState("export")
    const [editConfig, setEditConfig] = useState<ExportConfig | null>(null)

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Export Sheet</h1>
                <p className="text-muted-foreground mt-1">
                    Export your data to Google Sheets
                </p>
            </div>

            <div className="max-w-[1000px] mx-auto">
                <div className="rounded-xl border bg-card text-card-foreground shadow p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6">
                            <TabsTrigger value="export" onClick={() => setEditConfig(null)}>สร้างการส่งออกใหม่</TabsTrigger>
                            <TabsTrigger value="saved">การตั้งค่าที่บันทึกไว้</TabsTrigger>
                        </TabsList>

                        <TabsContent value="export" className="mt-0">
                            <GoogleSheetsConfigContent
                                dataType="ads"
                                standalone={false}
                                mode="export"
                                initialConfig={editConfig}
                            />
                        </TabsContent>

                        <TabsContent value="saved" className="mt-0">
                            <GoogleSheetsConfigContent
                                dataType="ads"
                                standalone={false}
                                mode="saved"
                                onEdit={(config) => {
                                    setEditConfig(config)
                                    setActiveTab("export")
                                }}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
