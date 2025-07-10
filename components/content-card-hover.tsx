"use client"

import { useState, useEffect } from "react"
import { Play, Plus, X } from "lucide-react"
import { motion as m, AnimatePresence } from "framer-motion"

interface ContentCardHoverProps {
  id: string
  onClose: () => void
  contentType?: "ANIME" | "MANGA" | "COMICS" // Add COMICS to content type
}

// Mock function to get content details
function getContentDetails(id: string, type: string) {
  const numericId = parseInt(id) || 0; // Simple fallback if needed

  return {
    id,
    title: `${type === "ANIME" ? "Anime" : type === "MANGA" ? "Manga" : "Comics"} Title ${id}`,
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    image: `/placeholder.svg?seed=${numericId}`,
    rating: (Math.random() * 2 + 8).toFixed(1),
    type,
    year: "2025"
  }
}

export function ContentCardHover({ id, onClose, contentType = "ANIME" }: ContentCardHoverProps) {
  const [details, setDetails] = useState<any>(null)

  useEffect(() => {
    // Simulate API fetch
    setDetails(getContentDetails(id, contentType))
  }, [id, contentType])

  if (!details) return null

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="hidden fixed bottom-8 right-8 z-50 w-64 bg-gray-900 rounded-lg overflow-hidden shadow-xl"
      >
        <div className="relative">
          <img src={details.image || "/placeholder.svg"} alt={details.title} className="w-full h-40 object-cover" />
          <button onClick={onClose} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="text-xs text-gray-400 mb-1">
            {details.type} {details.year && `- ${details.year}`}
          </div>
          <h3 className="font-medium mb-3">{details.title}</h3>

          {details.type === "ANIME" ? (
            <button className="w-full bg-white text-black font-medium py-2 rounded-md flex items-center justify-center gap-2">
              <Play className="h-4 w-4" />
              Watch
            </button>
          ) : (
            <button className="w-full bg-white text-black font-medium py-2 rounded-md flex items-center justify-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 6.25278V19.2528M12 6.25278C10.8321 5.47686 9.24649 5 7.5 5C5.75351 5 4.16789 5.47686 3 6.25278V19.2528C4.16789 18.4769 5.75351 18 7.5 18C9.24649 18 10.8321 18.4769 12 19.2528M12 6.25278C13.1679 5.47686 14.7535 5 16.5 5C18.2465 5 19.8321 5.47686 21 6.25278V19.2528C19.8321 18.4769 18.2465 18 16.5 18C14.7535 18 13.1679 18.4769 12 19.2528"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Read
            </button>
          )}

          <div className="mt-3 flex items-center justify-between">
            {details.rating && (
              <div className="flex items-center gap-1 text-sm">
                <span className="text-yellow-400">★</span>
                <span>{details.rating}</span>
              </div>
            )}
            <button className="p-2 bg-gray-800 rounded-full">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </m.div>
    </AnimatePresence>
  )
}
