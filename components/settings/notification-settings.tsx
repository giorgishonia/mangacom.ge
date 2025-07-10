"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { updateUserProfile } from "@/lib/users"

interface NotificationSettingsProps {
  userId: string
  initialSettings: {
    email_notifications: boolean
    push_notifications: boolean
  }
}

export function NotificationSettings({ userId, initialSettings }: NotificationSettingsProps) {
  const [emailNotif, setEmailNotif] = useState(initialSettings.email_notifications)
  const [pushNotif, setPushNotif] = useState(initialSettings.push_notifications)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const { success, error } = await updateUserProfile(userId, {
        email_notifications: emailNotif,
        push_notifications: pushNotif,
      })
      if (success) {
        toast.success("Notification preferences saved")
      } else {
        throw error
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to save preferences")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <div className="flex items-center justify-between p-4 border border-white/10 rounded-md bg-black/30">
        <div>
          <Label className="font-medium">Email notifications</Label>
          <p className="text-xs text-gray-400">Receive updates via email.</p>
        </div>
        <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
      </div>

      <div className="flex items-center justify-between p-4 border border-white/10 rounded-md bg-black/30">
        <div>
          <Label className="font-medium">Push notifications</Label>
          <p className="text-xs text-gray-400">Enable browser push notifications.</p>
        </div>
        <Switch checked={pushNotif} onCheckedChange={setPushNotif} />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  )
} 