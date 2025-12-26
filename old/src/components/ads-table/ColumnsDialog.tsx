'use client'

import { useState } from 'react'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { LayoutGrid, X } from "lucide-react"
import {
    COLUMN_CATEGORIES,
    getAvailableColumnsForTab,
    groupColumnsByCategory,
    type ColumnDef
} from "@/lib/column-config"

interface ColumnsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    activeTab: string
    visibleColumns: string[]
    setVisibleColumns: (columns: string[]) => void
    resetColumnsToDefault: () => void
}

export function ColumnsDialog({
    open,
    onOpenChange,
    activeTab,
    visibleColumns,
    setVisibleColumns,
    resetColumnsToDefault
}: ColumnsDialogProps) {
    const [columnSearch, setColumnSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('performance')

    // Get available columns for current tab
    const availableColumnsForTab = getAvailableColumnsForTab(activeTab)
    const groupedColumns = groupColumnsByCategory(availableColumnsForTab)

    const getTabLabel = () => {
        switch (activeTab) {
            case 'accounts': return 'Accounts'
            case 'campaigns': return 'Campaigns'
            case 'adsets': return 'Ad Sets'
            case 'ads': return 'Ads'
            default: return activeTab
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!w-[calc(100vw-400px)] !max-w-[1200px] max-h-[85vh] overflow-hidden flex flex-col"
                style={{ width: "calc(100vw - 400px)", maxWidth: "1200px" }}>
                <DialogHeader>
                    <DialogTitle className="text-emerald-600 flex items-center gap-2">
                        <LayoutGrid className="h-5 w-5" />
                        ปรับแต่งคอลัมน์ - {getTabLabel()}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex gap-6 flex-1 min-h-0">
                    {/* Left Sidebar - Categories */}
                    <div className="w-48 space-y-1 flex-shrink-0">
                        <div className="text-xs font-semibold text-muted-foreground mb-3">หมวดหมู่</div>
                        {Object.entries(COLUMN_CATEGORIES).map(([key, cat]) => {
                            const hasColumns = groupedColumns[key]?.length > 0
                            if (!hasColumns) return null

                            return (
                                <Button
                                    key={key}
                                    variant={selectedCategory === key ? 'secondary' : 'ghost'}
                                    className="w-full justify-start text-sm"
                                    onClick={() => setSelectedCategory(key)}
                                >
                                    {cat.labelTh}
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        ({groupedColumns[key]?.length || 0})
                                    </span>
                                </Button>
                            )
                        })}
                    </div>

                    {/* Middle - Available Columns */}
                    <div className="flex-1 px-4 space-y-3 min-w-0">
                        <Input
                            placeholder="ค้นหาคอลัมน์..."
                            value={columnSearch}
                            onChange={(e) => setColumnSearch(e.target.value)}
                            className="w-full"
                        />

                        <div className="space-y-0.5 overflow-y-auto max-h-[400px]">
                            <div className="font-semibold text-xs text-muted-foreground uppercase mb-2 sticky top-0 bg-background py-1">
                                {COLUMN_CATEGORIES[selectedCategory as keyof typeof COLUMN_CATEGORIES]?.labelTh || selectedCategory}
                            </div>
                            {(groupedColumns[selectedCategory] || [])
                                .filter((col: ColumnDef) =>
                                    col.label.toLowerCase().includes(columnSearch.toLowerCase()) ||
                                    (col.labelTh && col.labelTh.toLowerCase().includes(columnSearch.toLowerCase()))
                                )
                                .map((col: ColumnDef) => (
                                    <div
                                        key={col.key}
                                        className="flex items-center space-x-3 py-2.5 px-3 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                                        onClick={() => {
                                            if (!visibleColumns.includes(col.key)) {
                                                setVisibleColumns([...visibleColumns, col.key])
                                            }
                                        }}
                                    >
                                        <Checkbox
                                            checked={visibleColumns.includes(col.key)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setVisibleColumns([...visibleColumns, col.key])
                                                } else {
                                                    setVisibleColumns(visibleColumns.filter((v: string) => v !== col.key))
                                                }
                                            }}
                                            className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                        />
                                        <Label className="cursor-pointer flex-1 text-sm font-normal">
                                            <span>{col.labelTh || col.label}</span>
                                            {col.labelTh && <span className="text-xs text-muted-foreground ml-2">({col.label})</span>}
                                        </Label>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Right - Selected Columns */}
                    <div className="w-72 space-y-3 flex-shrink-0">
                        <div className="flex items-center justify-between px-2">
                            <div className="text-sm font-medium text-emerald-600">
                                คอลัมน์ที่เลือก ({visibleColumns.length})
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground"
                                onClick={resetColumnsToDefault}
                            >
                                รีเซ็ต
                            </Button>
                        </div>

                        <div className="space-y-1.5 overflow-y-auto max-h-[400px] px-1">
                            {visibleColumns.map((colKey: string) => {
                                const col = availableColumnsForTab.find((c: ColumnDef) => c.key === colKey)
                                if (!col) return null

                                return (
                                    <div
                                        key={colKey}
                                        className="flex items-center gap-3 px-3 py-2.5 bg-muted/50 rounded-md group hover:bg-muted transition-colors"
                                    >
                                        <div className="flex items-center gap-0.5 cursor-move text-muted-foreground/40">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="w-1 h-1 bg-current rounded-full"></div>
                                                <div className="w-1 h-1 bg-current rounded-full"></div>
                                                <div className="w-1 h-1 bg-current rounded-full"></div>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="w-1 h-1 bg-current rounded-full"></div>
                                                <div className="w-1 h-1 bg-current rounded-full"></div>
                                                <div className="w-1 h-1 bg-current rounded-full"></div>
                                            </div>
                                        </div>
                                        <span className="flex-1 text-sm">{col.labelTh || col.label}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => {
                                                setVisibleColumns(visibleColumns.filter((v: string) => v !== colKey))
                                            }}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <div className="text-sm text-muted-foreground">
                        การตั้งค่าจะถูกบันทึกอัตโนมัติ
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            ปิด
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
