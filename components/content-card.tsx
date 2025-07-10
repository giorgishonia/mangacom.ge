"use client"

import { cn } from "@/lib/utils"
import { ImageSkeleton } from "@/components/image-skeleton"

interface ContentCardProps {
  id: number
  title: string
  image: string
  year?: string
  rating?: number
  isHoverable?: boolean
  onHover?: (id: number) => void
  className?: string
  contentType?: "ANIME" | "MANGA" // Add contentType prop
}

export function ContentCard({
  id,
  title,
  image,
  year,
  rating,
  isHoverable = true,
  onHover,
  className,
  contentType = "ANIME", // Default to ANIME
}: ContentCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-md overflow-hidden transition-transform",
        isHoverable && "hover:scale-105 cursor-pointer",
        className,
      )}
      onClick={() => isHoverable && onHover?.(id)}
      data-content-type={contentType} // Add data attribute for content type
    >
      <div className="aspect-[2/3] bg-gray-800 relative overflow-hidden">
        <ImageSkeleton
          src={image || "/placeholder.svg"}
          alt={title}
          className="w-full h-full object-cover transition-transform group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {rating && (
          <div className="absolute top-2 right-2 bg-gray-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-xs flex items-center">
            <span className="text-yellow-400 mr-1">★</span>
            {rating}
          </div>
        )}
      </div>

      <div className="p-2">
        <h3 className="font-medium text-sm line-clamp-1">{title}</h3>
        {year && <p className="text-xs text-gray-400">{year}</p>}
      </div>
    </div>
  )
}
