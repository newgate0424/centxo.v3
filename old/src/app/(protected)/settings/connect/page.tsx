import { redirect } from "next/navigation"

export default function SettingsConnectPage() {
    redirect("/settings?tab=connect")
}
