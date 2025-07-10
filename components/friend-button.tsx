"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, UserPlus, Users, CheckCircle2 } from "lucide-react"
import { createClient as createBrowserClient } from '@/utils/supabase/client'

interface FriendButtonProps {
  targetUserId: string
  currentUserId: string | null
}

type Status = "none" | "sent" | "incoming" | "friends" | "loading"

export function FriendButton({ targetUserId, currentUserId }: FriendButtonProps) {
  const [status, setStatus] = useState<Status>("loading")

  // Fetch relationship status
  useEffect(() => {
    if (!currentUserId) {
      setStatus("none")
      return
    }

    const supabase = createBrowserClient()
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token
      fetch("/api/friends/list", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
        .then(async res => {
          if (!res.ok) {
            if (res.status === 401) {
              setStatus("none")
              return
            }
            console.error("Failed to load friend list:", res.status)
            setStatus("none")
            return
          }
          const data = await res.json() as { accepted: string[]; pending: { from: string; to: string }[] }

          if (data.accepted.includes(targetUserId)) return setStatus("friends")

          const pending = data.pending.find(
            (p) => (p.from === currentUserId && p.to === targetUserId) || (p.from === targetUserId && p.to === currentUserId)
          )
          if (!pending) return setStatus("none")

          if (pending.from === currentUserId) setStatus("sent")
          else setStatus("incoming")
        })
        .catch(err => { console.error(err); setStatus('none') })
    })
  }, [currentUserId, targetUserId])

  // Helpers
  const sendRequest = async () => {
    if (!currentUserId) {
      toast.error("საჭიროებაა ავტორიზაცია")
      return
    }
    const supabase = createBrowserClient()
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    setStatus("loading")
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ targetId: targetUserId }),
    })
    if (res.ok) {
      toast.success("მოთხოვნა გაიგზავნა")
      setStatus("sent")
    } else {
      const { error } = await res.json()
      toast.error(error || "შეცდომა")
      setStatus("none")
    }
  }

  const respond = async (action: "accept" | "decline") => {
    if (!currentUserId) {
      toast.error("საჭიროებაა ავტორიზაცია")
      return
    }
    const supabase = createBrowserClient()
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    setStatus("loading")
    const res = await fetch("/api/friends/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ requesterId: targetUserId, action }),
    })
    if (res.ok) {
      if (action === "accept") {
        toast.success("დამეგობრდით")
        setStatus("friends")
      } else {
        toast.success("უარი თქვით")
        setStatus("none")
      }
    } else {
      const { error } = await res.json()
      toast.error(error || "შეცდომა")
      setStatus("none")
    }
  }

  // Render logic
  if (!currentUserId || currentUserId === targetUserId) return null

  if (status === "loading") {
    return (
      <Button disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    )
  }

  if (status === "friends") {
    const unfriend = async () => {
      if (!currentUserId) return
      const supabase = createBrowserClient()
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      setStatus("loading")
      const res = await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ targetId: targetUserId }),
      })
      if (res.ok) {
        toast.success("მეგობრობაც დასრულდა")
        setStatus("none")
      } else {
        const { error } = await res.json()
        toast.error(error || "შეცდომა")
        setStatus("friends")
      }
    }

    return (
      <Button variant="secondary" className="gap-2" onClick={unfriend}>
        <Users className="h-4 w-4" /> მეგობრები (წაშლა)
      </Button>
    )
  }

  if (status === "sent") {
    return (
      <Button disabled className="gap-2">
        <CheckCircle2 className="h-4 w-4" /> გაგზავნილია
      </Button>
    )
  }

  if (status === "incoming") {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => respond("accept")}>დასტური</Button>
        <Button size="sm" variant="destructive" onClick={() => respond("decline")}>უარი</Button>
      </div>
    )
  }

  // none
  return (
    <Button onClick={sendRequest} className="gap-2">
      <UserPlus className="h-4 w-4" /> დამატება
    </Button>
  )
} 