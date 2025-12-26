"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccountForm } from "@/components/settings/AccountForm"
import { ConnectForm } from "@/components/settings/ConnectForm"
import { Separator } from "@/components/ui/separator"

export function SettingsTabs() {
    return (
        <Tabs defaultValue="account" className="space-y-4">
            <TabsList>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="connect">Connect</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="space-y-4">
                <div>
                    <h3 className="text-lg font-medium">Account</h3>
                    <p className="text-sm text-muted-foreground">
                        Update your account settings.
                    </p>
                </div>
                <Separator />
                <AccountForm />
            </TabsContent>
            <TabsContent value="connect" className="space-y-4">
                <div>
                    <h3 className="text-lg font-medium">Connect</h3>
                    <p className="text-sm text-muted-foreground">
                        Connect your Facebook Ads account.
                    </p>
                </div>
                <Separator />
                <ConnectForm />
            </TabsContent>
        </Tabs>
    )
}
