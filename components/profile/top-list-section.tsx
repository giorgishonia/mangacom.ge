"use client"

import React, { useEffect, useState } from 'react'
import { Plus, X, Heart } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ImageSkeleton } from '@/components/image-skeleton'
import { Input } from '@/components/ui/input'
import { searchContent } from '@/lib/content'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface ContentLite {
  id: string
  title: string // Georgian or fallback title
  englishTitle?: string | null
  thumbnail: string
  type: 'manga' | 'comics'
}

export default function TopListSection({ isOwner, username }: { isOwner: boolean; username?: string }) {
  const [list, setList] = useState<ContentLite[]>([])
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<ContentLite[]>([])
  const [addingPos, setAddingPos] = useState<number | null>(null)

  // fetch current list
  const fetchList = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/user/top-list', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const data = await res.json()
      if (data.success) {
        const items = (data.list as any[]).map((row) => {
          const georgianTitle = (row.content.georgian_title && typeof row.content.georgian_title === 'string' && row.content.georgian_title.trim() !== '')
            ? row.content.georgian_title
            : (Array.isArray(row.content.alternative_titles)
                ? (() => {
                    const geoEntry = row.content.alternative_titles.find((t: any) => typeof t === 'string' && t.startsWith('georgian:'))
                    return geoEntry ? geoEntry.substring(9) : null
                  })()
                : null)

          return {
            id: row.content.id,
            title: georgianTitle || row.content.title,
            englishTitle: georgianTitle ? row.content.title : null,
            thumbnail: row.content.thumbnail,
            type: row.content.type,
            position: row.position,
          }
        })

        // create fixed slots array length 3
        const slots: (ContentLite | null)[] = Array(3).fill(null)
        items.forEach((it) => {
          if (it.position >= 1 && it.position <= 3) {
            slots[it.position - 1] = it
          }
        })

        setList(slots as ContentLite[])
      }
    } catch (err) {
      console.error('Failed to load top list', err)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  // search handler
  useEffect(() => {
    const handler = setTimeout(() => {
      (async () => {
        const query = search.trim()

        // If empty -> fetch default list
        if (query.length === 0) {
          try {
            const resp = await searchContent('', undefined)
            if (resp.success && resp.content) {
              setResults(
                resp.content.slice(0, 15).map((c: any) => ({
                  id: c.id,
                  title: c.title,
                  thumbnail: c.thumbnail,
                  type: c.type,
                }))
              )
            }
          } catch (err) {
            console.error('search error', err)
          }
          return
        }

        if (query.length < 2) {
          setResults([])
          return
        }

        try {
          const resp = await searchContent(query, undefined)
          if (resp.success && resp.content) {
            setResults(
              resp.content.slice(0, 10).map((c: any) => ({
                id: c.id,
                title: c.title,
                thumbnail: c.thumbnail,
                type: c.type,
              }))
            )
          }
        } catch (err) {
          console.error('search error', err)
        }
      })()
    }, 300)

    return () => clearTimeout(handler)
  }, [search])

  const handleAdd = async (content: ContentLite) => {
    if (addingPos === null) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/user/top-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ contentId: content.id, contentType: content.type, position: addingPos }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('დამატებულია პირად სიაში')
        setShowDialog(false)
        setSearch('')
        setResults([])
        fetchList()
      } else {
        toast.error('ვერ დაემატა')
      }
    } catch (err) {
      console.error(err)
      toast.error('შეცდომა')
    }
  }

  const authHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : undefined
  }

  const handleRemove = async (pos: number) => {
    try {
      const headers = await authHeader()
      const res = await fetch('/api/user/top-list', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(headers || {}),
        },
        body: JSON.stringify({ position: pos }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('წაიშალა')
        fetchList()
      } else {
        toast.error('ვერ წაიშალა')
      }
    } catch (err) {
      console.error(err)
      toast.error('შეცდომა')
    }
  }

  const grid = list.length === 3 ? list : [0, 1, 2].map((idx) => list[idx] || null)

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-5 border border-gray-800">
      <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
        <Heart className="h-5 w-5 text-pink-500" />
        <span>
          {isOwner ? 'ჩემი' : `${username || ''}-ის`} ფავორიტი მანგა/კომიქსი
        </span>
      </h2>
      <div className="grid grid-cols-3 gap-4 mt-4">
        {grid.map((item, idx) => (
          item ? (
            <div key={idx} className="flex flex-col items-center text-center">
              <div className="relative group w-[85%]">
                <ImageSkeleton src={item.thumbnail} alt={item.title} className="w-full aspect-[2/3] overflow-hidden rounded-[10px] object-cover" />
                <div className="absolute top-1 left-1 bg-black/60 rounded-full px-2 text-xs">#{idx + 1}</div>
                {isOwner && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-opacity rounded-[10px]">
                    <button
                      onClick={() => {
                        setAddingPos(idx + 1)
                        setShowDialog(true)
                      }}
                      title="რედაქტირება"
                      className="p-2 bg-white/10 hover:bg-white/20 rounded"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleRemove(idx + 1)}
                      title="წაშლა"
                      className="p-2 bg-red-600/90 hover:bg-red-700 rounded"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
              <span className="mt-1 text-xs text-gray-200 break-words leading-snug line-clamp-2 w-full">
                {item.title}
              </span>
              {item.englishTitle && (
                <span className="text-[10px] text-gray-400 leading-snug line-clamp-1 w-full">
                  {item.englishTitle}
                </span>
              )}
            </div>
          ) : (
            <button
              key={idx}
              disabled={!isOwner}
              onClick={() => {
                setAddingPos(idx + 1)
                setShowDialog(true)
              }}
              className={cn(
                'flex items-center justify-center w-[85%] aspect-[2/3] rounded-[10px] border-2 border-dashed',
                isOwner ? 'border-gray-600 hover:border-white/70 hover:bg-white/5 transition-colors' : 'border-gray-800'
              )}
            >
              {isOwner && <Plus className="h-8 w-8 text-gray-500" />}
            </button>
          )
        ))}
      </div>

      {/* Add dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>ფავორიტის დამატება</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="მოძებნეთ მანგა ან კომიქსი..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-80 overflow-y-auto mt-3 space-y-2">
              {results.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleAdd(r)}
                  className="flex items-center gap-3 p-2 hover:bg-gray-800 rounded cursor-pointer"
                >
                  <img src={r.thumbnail} alt={r.title} className="w-10 h-14 object-cover rounded" />
                  <span className="text-sm">{r.title}</span>
                </div>
              ))}
              {search.length >= 2 && results.length === 0 && (
                <p className="text-center text-gray-500 text-sm mt-4">ვერ მოიძებნა</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 