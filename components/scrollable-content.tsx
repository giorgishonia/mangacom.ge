"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScrollableContentProps {
  children: React.ReactNode[]
  autoScroll?: boolean
  autoScrollInterval?: number
  className?: string
  itemClassName?: string
  showControls?: boolean
  showIndicators?: boolean
}

export function ScrollableContent({
  children,
  autoScroll = true,
  autoScrollInterval = 4000,
  className,
  itemClassName,
  showControls = true,
  showIndicators = true,
}: ScrollableContentProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const totalItems = children.length
  const visibleItems = Math.min(Math.floor((containerRef.current?.clientWidth || 1200) / 250), totalItems)
  const maxIndex = Math.max(0, totalItems - visibleItems)

  const scrollToIndex = (index: number) => {
    if (containerRef.current) {
      const newIndex = Math.max(0, Math.min(index, maxIndex))
      setCurrentIndex(newIndex)
      const itemWidth = containerRef.current.scrollWidth / totalItems
      containerRef.current.scrollTo({
        left: newIndex * itemWidth,
        behavior: "smooth",
      })
    }
  }

  const handleNext = () => {
    scrollToIndex(currentIndex + 1)
  }

  const handlePrev = () => {
    scrollToIndex(currentIndex - 1)
  }

  const handleIndicatorClick = (index: number) => {
    // Calculate the actual scroll index based on the indicator
    const scrollIndex = Math.min(index * visibleItems, maxIndex)
    scrollToIndex(scrollIndex)
  }

  // Auto scroll
  useEffect(() => {
    if (autoScroll && !isHovering) {
      const interval = setInterval(() => {
        if (currentIndex >= maxIndex) {
          scrollToIndex(0)
        } else {
          scrollToIndex(currentIndex + 1)
        }
      }, autoScrollInterval)

      return () => clearInterval(interval)
    }
  }, [currentIndex, autoScroll, isHovering, maxIndex, autoScrollInterval])

  // Number of indicators
  const indicatorCount = Math.ceil(totalItems / visibleItems)

  return (
    <div className="relative" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
      <div
        ref={containerRef}
        className={cn("flex overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory", className)}
      >
        {children.map((child, index) => (
          <div key={index} className={cn("flex-shrink-0 snap-start px-2", itemClassName)}>
            {child}
          </div>
        ))}
      </div>

      {showControls && (
        <>
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 rounded-full p-2 text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-6 w-6" />
            <span className="sr-only">Previous</span>
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex >= maxIndex}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 rounded-full p-2 text-white disabled:opacity-30"
          >
            <ChevronRight className="h-6 w-6" />
            <span className="sr-only">Next</span>
          </button>
        </>
      )}

      {showIndicators && indicatorCount > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          {Array.from({ length: indicatorCount }).map((_, i) => {
            const isActive = i === Math.floor(currentIndex / visibleItems)
            return (
              <button
                key={i}
                onClick={() => handleIndicatorClick(i)}
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  isActive ? "bg-white" : "bg-gray-600 hover:bg-gray-400",
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
