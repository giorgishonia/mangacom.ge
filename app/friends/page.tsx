"use client"

import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { ka } from 'date-fns/locale'
import { AppSidebar } from '@/components/app-sidebar'
import { useAuth } from '@/components/supabase-auth-provider'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface FriendActivity {
  user_id: string
  username: string | null
  avatar_url: string | null
  content_id: string
  content_title: string | null
  content_thumbnail: string | null
  content_type: 'manga' | 'comics'
  activity_type: 'progress' | 'rating' | 'comment'
  status?: string
  progress?: number | null
  rating?: number | null
  comment_text?: string | null
  updated_at: string
}

export default function FriendsActivityPage() {
  const [activities, setActivities] = useState<FriendActivity[]>([])
  const [activeTab, setActiveTab] = useState<'all'|'progress'|'rating'|'comment'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  const { user } = useAuth()

  useEffect(() => {
    setIsClient(true)
    async function fetchFeed() {
      try {
        const headers: Record<string, string> = {}
        // Attach bearer token if logged in so the API authenticates us
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch('/api/friends/activity', { headers })
        if (res.status === 401) {
          setError('unauth')
          return
        }
        const json = await res.json()
        if (json.success) {
          setActivities(json.activities)
        } else {
          setError(json.error || 'Error fetching feed')
        }
      } catch (err) {
        setError('network')
      } finally {
        setLoading(false)
      }
    }
    // Only attempt fetch after client mount
    fetchFeed()
  }, [])

  const renderMessage = (act: FriendActivity) => {
    if (act.activity_type === 'comment') {
      const snippet = act.comment_text ? (act.comment_text.length > 40 ? act.comment_text.slice(0,37)+"…" : act.comment_text) : ''
      return `დააკომენტარა ${act.content_title} \"${snippet}\"`
    }
    if (act.activity_type === 'rating' && act.rating && act.rating > 0) {
      return `შეფასა ${act.content_title} ${act.rating}/10`
    }
    if (act.status === 'completed') {
      return `დაასრულა ${act.content_title} კითხვა`
    }
    return `კითხულობს ${act.content_title} (თავი ${act.progress ?? 0})`
  }

  return (
    <>
      <AppSidebar />
      <div className="container mx-auto px-4 py-8 md:pl-24 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">მეგობრების აქტივობა</h1>

      {/* Tabs */}
      {!loading && !error && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            {key:'all', label:'ყველა'},
            {key:'progress', label:'წარმატებები'},
            {key:'rating', label:'შეფასებები'},
            {key:'comment', label:'კომენტარები'}
          ].map(t=> (
            <button key={t.key} onClick={()=>setActiveTab(t.key as any)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${activeTab===t.key?'bg-purple-600 text-white border-purple-500':'border-gray-600 text-gray-300 hover:bg-white/10'}`}
            >{t.label}</button>
          ))}
        </div>
      )}
      {loading && <div>იტვირთება...</div>}
      {error === 'unauth' && (
        <div className="text-center py-16 text-gray-400 flex flex-col items-center">
          <p className="text-xl mb-2">სერვერს სჭირდება ავტორიზაცია</p>
          <Link href="/login">
            <Button className="mt-6 bg-purple-600 hover:bg-purple-700">შესვლა</Button>
          </Link>
        </div>
      )}
      {error && error !== 'unauth' && <div className="text-red-500">{error}</div>}
      {!loading && activities.length === 0 && !error && (
        <div>ჯერ არ არსებობს აქტივობა.</div>
      )}
      <div className="space-y-4">
        {activities.filter(a=> activeTab==='all' || a.activity_type===activeTab).map((act) => (
          <div 
            key={`${act.user_id}-${act.updated_at}-${act.content_id}`} 
            className="flex flex-col sm:flex-row gap-3 bg-white/5 p-4 rounded-lg"
          >
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={act.avatar_url || '/placeholder-user.jpg'} alt={act.username || ''} />
              <AvatarFallback>
                {act.username ? act.username.charAt(0).toUpperCase() : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {act.username || 'Unknown user'}
              </div>
              <div className="text-sm text-white/80 break-words">
                {renderMessage(act)} • {formatDistanceToNow(new Date(act.updated_at), { addSuffix: true, locale: ka })}
              </div>
            </div>
            {act.content_thumbnail && (
              <img
                src={act.content_thumbnail}
                alt={act.content_title || ''}
                className="h-20 w-20 sm:h-12 sm:w-12 rounded-md object-cover flex-shrink-0"
              />
            )}
          </div>
        ))}
      </div>
      </div>
    </>
  )
} 