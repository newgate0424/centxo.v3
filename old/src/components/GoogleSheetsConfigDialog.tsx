"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { FileSpreadsheet } from "lucide-react"
import GoogleSheetsConfigContent, { ExportConfig } from "./GoogleSheetsConfigContent"

interface GoogleSheetsConfigDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    dataType: string // accounts, campaigns, adsets, ads
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onExport?: (config: ExportConfig, data: Record<string, any>[]) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>[]
}

export default function GoogleSheetsConfigDialog({
    open,
    onOpenChange,
    dataType,
    data
}: GoogleSheetsConfigDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        ตั้งค่าส่งออกไป Google Sheets
                    </DialogTitle>
                </DialogHeader>

                <GoogleSheetsConfigContent
                    dataType={dataType}
                    data={data}
                    onClose={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    )
}
