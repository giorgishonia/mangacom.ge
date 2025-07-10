"use client"

import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

interface CategoryFilterProps {
  categories: string[]
  selectedCategory: string
  setSelectedCategory: (category: string) => void
}

export function CategoryFilter({ categories, selectedCategory, setSelectedCategory }: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => setSelectedCategory(category)}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors",
            selectedCategory === category
              ? "bg-white text-black font-medium"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700",
          )}
        >
          {category}
        </button>
      ))}
      <button className="p-1.5 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700">
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}
