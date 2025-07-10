"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { Loader2 } from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface AccountSettingsProps {
  user: User
}

export function AccountSettings({ user }: AccountSettingsProps) {
  const supabase = createClient()
  const [email, setEmail] = useState(user.email || "")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!email && !newPassword) return toast.info("Nothing to update.")

    if (newPassword && newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters")
    }
    if (newPassword && newPassword !== confirmPassword) {
      return toast.error("Passwords do not match")
    }

    setLoading(true)
    try {
      if (email && email !== user.email) {
        const { error } = await supabase.auth.updateUser({ email })
        if (error) throw error
        toast.success("Email update requested – check your inbox to confirm.")
      }

      if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error
        toast.success("Password updated")
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Update failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-black/30 border-white/10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new_password">New Password</Label>
        <Input
          id="new_password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="bg-black/30 border-white/10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm_password">Confirm Password</Label>
        <Input
          id="confirm_password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="bg-black/30 border-white/10"
        />
      </div>

      <Button onClick={handleSave} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
      </Button>
    </div>
  )
} 