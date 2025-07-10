"use client"

import { ImageSkeleton } from "@/components/image-skeleton"
import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"

interface Character {
  id: number
  name: string
  age: string
  role: string
  image: string
}

interface CharacterCardProps {
  character: Character
}

// Simple favourite toggle util inside component
function useCharacterFavourite(id: number) {
  const getStored = () => {
    try {
      const raw = localStorage.getItem('favorites')
      if (!raw) return false
      const obj = JSON.parse(raw)
      return !!obj[`character-${id}`]
    } catch { return false }
  }

  const [fav, setFav] = useState<boolean>(getStored)

  // Sync when storage changes (e.g., from other tabs/components)
  useEffect(() => {
    const handler = () => setFav(getStored())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [id])

  const toggle = (character: Character) => {
    try {
      const raw = localStorage.getItem('favorites')
      const obj = raw ? JSON.parse(raw) : {}
      const key = `character-${id}`
      if (obj[key]) {
        delete obj[key]
        setFav(false)
      } else {
        obj[key] = { id: character.id, type: 'character', name: character.name, title: character.name, image: character.image, addedAt: new Date().toISOString() }
        setFav(true)
      }
      localStorage.setItem('favorites', JSON.stringify(obj))
      window.dispatchEvent(new Event('storage'))
    } catch {}
  }

  return [fav, toggle] as const
}

export function CharacterCard({ character }: CharacterCardProps) {
  const [isFav, toggle] = useCharacterFavourite(character.id)

  return (
    <div className={cn(
      "backdrop-blur-sm rounded-lg overflow-hidden transition-colors cursor-pointer relative group",
      isFav ? "bg-gray-800/70 ring-2 ring-red-500/60" : "bg-gray-800/50 hover:bg-gray-800"
    )}>
      {/* Heart overlay */}
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggle(character) }}
        className={cn(
          "absolute top-2 right-2 z-20 rounded-full p-1 transition-opacity",
          isFav ? "bg-red-600/90 opacity-100" : "bg-black/60 hover:bg-black/80 opacity-0 group-hover:opacity-100"
        )}
        title={isFav ? "ფავორიტებიდან ამოღება" : "ფავორიტებში დამატება"}
      >
        <Heart className="h-4 w-4" fill={isFav ? '#e11d48' : 'none'} stroke={isFav ? '#e11d48' : '#ffffff'} />
      </button>

      <div className="aspect-square overflow-hidden">
        <ImageSkeleton
          src={character.image || "/placeholder.svg"}
          alt={character.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm">{character.name}</h3>
        <div className="flex justify-between gap-1 text-xs text-gray-400">
          {/* Role with truncation to avoid overflow on small screens */}
          <span className="truncate max-w-[60%]" title={character.role}>{character.role}</span>
          <span className="whitespace-nowrap">{character.age}</span>
        </div>
      </div>
    </div>
  )
}
