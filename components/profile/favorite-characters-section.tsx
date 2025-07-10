"use client"

import React, { useEffect, useState } from "react"
import { Heart, Trash2 } from "lucide-react"
import { ImageSkeleton } from "@/components/image-skeleton"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface CharacterFav {
  id: string
  name: string
  image: string
  from?: string
  addedAt?: string
}

export default function FavoriteCharactersSection({ isOwner, username }: { isOwner: boolean; username?: string }) {
  const [chars, setChars] = useState<CharacterFav[]>([])

  // ui state
  const [showDialog, setShowDialog] = useState(false)

  const [search, setSearch] = useState("")
  const [sortMode, setSortMode] = useState<'recent' | 'alpha' | 'source'>('recent')

  // constants
  const INLINE_LIMIT = 3;

  // derived list
  const filteredChars = chars.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.from || '').toLowerCase().includes(search.toLowerCase())
  )

  const sortedChars = [...filteredChars].sort((a,b)=>{
    if (sortMode==='alpha') return a.name.localeCompare(b.name)
    if (sortMode==='source') return (a.from||'').localeCompare(b.from||'')
    // recent
    return (new Date(b.addedAt||0).getTime()) - (new Date(a.addedAt||0).getTime())
  })

  const visibleChars = sortedChars.slice(0, INLINE_LIMIT)
  const placeholders = isOwner? Math.max(INLINE_LIMIT, Math.ceil(visibleChars.length/INLINE_LIMIT)*INLINE_LIMIT) - visibleChars.length : 0

  useEffect(() => {
    try {
      const raw = localStorage.getItem("favorites")
      if (!raw) return
      const obj = JSON.parse(raw)
      const arr: CharacterFav[] = []
      Object.values(obj).forEach((entry: any) => {
        if (entry && entry.type === "character") {
          arr.push({
            id: entry.id,
            name: entry.name || entry.title,
            image: entry.image,
            from: entry.from || entry.mangaTitle || entry.contentTitle || entry.origin || entry.series,
            addedAt: entry.addedAt,
          })
        }
      })
      setChars(arr)
    } catch (err) {
      console.error("Failed to load favorite characters", err)
    }

    const handleStorage = () => {
      try {
        const raw2 = localStorage.getItem("favorites")
        if (!raw2) return setChars([])
        const obj2 = JSON.parse(raw2)
        const arr2: CharacterFav[] = []
        Object.values(obj2).forEach((entry: any) => {
          if (entry && entry.type === "character") {
            arr2.push({
              id: entry.id,
              name: entry.name || entry.title,
              image: entry.image,
              from: entry.from || entry.mangaTitle || entry.contentTitle || entry.origin || entry.series,
              addedAt: entry.addedAt,
            })
          }
        })
        setChars(arr2)
      } catch (err) {
        console.error("Failed to parse favourite chars", err)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const handleRemove = (id: string) => {
    if (!isOwner) return
    try {
      const raw = localStorage.getItem("favorites")
      if (!raw) return
      const obj = JSON.parse(raw)
      Object.keys(obj).forEach((key) => {
        const entry = obj[key]
        if (entry && entry.type === "character" && entry.id === id) {
          delete obj[key]
        }
      })
      localStorage.setItem("favorites", JSON.stringify(obj))
      setChars((prev) => prev.filter((ch) => ch.id !== id))
    } catch (err) {
      console.error("Failed to remove favorite character", err)
    }
  }

  if (chars.length === 0) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-5 border border-gray-800 flex flex-col items-center justify-center text-center">
        <Heart className="h-8 w-8 text-pink-500 mb-3" />
        <p className="text-gray-400 text-sm">
          {isOwner ? "თქვენ არ გაქვთ შენახული ფავორიტი პერსონაჟები." : "ფავორიტი პერსონაჟები ვერ მოიძებნა."}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-5 pb-0 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-500" />
          <span className="text-lg font-bold">{isOwner ? "ჩემი" : `${username || ""}-ის`} ფავორიტი პერსონაჟები</span>
        </div>
        {/* View-all button */}
        {sortedChars.length > INLINE_LIMIT && (
          <Button variant="ghost" size="sm" onClick={() => setShowDialog(true)}>
            ყველას ნახვა
          </Button>
        )}
      </div>

      {/* Controls (only visible when owner) */}
      {isOwner && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
          <input
            type="text"
            placeholder="ძიება..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
            className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none"
          />
          <select
            value={sortMode}
            onChange={e=>setSortMode(e.target.value as any)}
            className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none"
          >
            <option value="recent">უახლესი</option>
            <option value="alpha">ანბანი</option>
            <option value="source">სერია</option>
          </select>
        </div>
      )}

      {/* Grid with visible characters and placeholders */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-3 gap-4">
        {visibleChars.map((c) => (
          <div key={c.id} className="relative w-[85%] flex flex-col items-center text-center h-full">
            {isOwner && (
              <button
                onClick={() => handleRemove(c.id)}
                title="წაშლა"
                className="absolute z-10 top-1 right-1 p-1 bg-black/60 hover:bg-red-600 rounded-full"
              >
                <Trash2 className="h-4 w-4 text-white" />
              </button>
            )}
            {/* Image wrapper enforcing square aspect ratio */}
            <div className="w-full aspect-[2/3] rounded-md overflow-hidden mb-2 flex-shrink-0">
              <ImageSkeleton
                src={c.image || "/placeholder-character.jpg"}
                alt={c.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs text-gray-200 break-words leading-snug w-full">
              {c.name}
            </span>
            {c.from && (
              <span className="text-[10px] text-gray-400 break-words leading-snug w-full">
                {c.from}
              </span>
            )}
          </div>
        ))}

        {/* Placeholder slots */}
        {Array.from({ length: placeholders }).map((_, idx) => (
          <div
            key={`ph-${idx}`}
            className="flex items-center justify-center aspect-[2/3] w-[85%] border-2 border-dashed border-gray-600 rounded-md"
          />
        ))}
      </div>

      {/* Dialog with full list */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>ყველა ფავორიტი პერსონაჟი</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-2">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
              <input
                type="text"
                placeholder="ძიება..."
                value={search}
                onChange={e=>setSearch(e.target.value)}
                className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none"
              />
              <select
                value={sortMode}
                onChange={e=>setSortMode(e.target.value as any)}
                className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none"
              >
                <option value="recent">უახლესი</option>
                <option value="alpha">ანბანი</option>
                <option value="source">სერია</option>
              </select>
            </div>
            {sortedChars.map((c) => (
              <div key={`dlg-${c.id}`} className="relative flex flex-col items-center text-center h-full">
                {isOwner && (
                  <button
                    onClick={() => handleRemove(c.id)}
                    title="წაშლა"
                    className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 rounded-full"
                  >
                    <Trash2 className="h-4 w-4 text-white" />
                  </button>
                )}
                {/* Image wrapper enforcing square aspect ratio */}
                <div className="w-full aspect-square rounded-md overflow-hidden mb-2 flex-shrink-0">
                  <ImageSkeleton
                    src={c.image || "/placeholder-character.jpg"}
                    alt={c.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs text-gray-200 break-words mt-4 leading-snug w-full">
                  {c.name}
                </span>
                {c.from && (
                  <span className="text-[10px] text-gray-400 break-words leading-snug w-full">
                    {c.from}
                  </span>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 