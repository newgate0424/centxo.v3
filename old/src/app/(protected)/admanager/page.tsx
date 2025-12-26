import { Suspense } from "react"
import AdsTable from "@/components/AdsTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { checkRouteAccess } from "@/lib/route-guard"

export default async function AdManagerPage() {
    // Check if user has permission to access this route
    await checkRouteAccess('/admanager')

    return (
        <div className="h-full">
            <Card className="h-full flex flex-col">
                <CardContent className="flex-1 overflow-hidden">
                    <Suspense fallback={<div>Loading ads...</div>}>
                        <AdsTable />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    )
}
