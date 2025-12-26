'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, PlusCircle } from "lucide-react"

// Type for formatting rules
export interface FormattingRule {
    id: string
    column: string
    condition: 'greater' | 'less' | 'equal' | 'between'
    value: string
    value2?: string
    color: string
}

interface FormattingDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    formattingRules: FormattingRule[]
    setFormattingRules: React.Dispatch<React.SetStateAction<FormattingRule[]>>
}

export function FormattingDialog({
    open,
    onOpenChange,
    formattingRules,
    setFormattingRules
}: FormattingDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>การจัดรูปแบบตามเงื่อนไข</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="text-sm text-muted-foreground mb-4">
                        กำหนดเงื่อนไขเพื่อเปลี่ยนสีพื้นหลังของแถว
                    </div>

                    {formattingRules.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            ยังไม่มีกฎการจัดรูปแบบ คลิกปุ่มด้านล่างเพื่อเพิ่ม
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {formattingRules.map((rule) => (
                                <div key={rule.id} className="flex items-center gap-2 p-3 border rounded-lg">
                                    <div className="flex-1 text-sm">
                                        <span className="font-medium">{rule.column}</span>
                                        {' '}
                                        {rule.condition === 'greater' && '>'}
                                        {rule.condition === 'less' && '<'}
                                        {rule.condition === 'equal' && '='}
                                        {rule.condition === 'between' && 'between'}
                                        {' '}
                                        <span className="font-medium">{rule.value}</span>
                                        {rule.condition === 'between' && rule.value2 && (
                                            <span> and <span className="font-medium">{rule.value2}</span></span>
                                        )}
                                    </div>
                                    <div
                                        className="w-8 h-8 rounded border"
                                        style={{ backgroundColor: rule.color }}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setFormattingRules(prev => prev.filter(r => r.id !== rule.id))
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                            setFormattingRules(prev => [...prev, {
                                id: Date.now().toString(),
                                column: 'spend',
                                condition: 'greater',
                                value: '1000',
                                color: '#fef3c7'
                            }])
                        }}
                    >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        เพิ่มกฎใหม่
                    </Button>

                    <div className="flex gap-2 pt-4">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setFormattingRules([])}
                        >
                            ล้างทั้งหมด
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={() => onOpenChange(false)}
                        >
                            บันทึก
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
