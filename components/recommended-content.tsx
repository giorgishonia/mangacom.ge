import Link from "next/link"
import { ImageSkeleton } from "@/components/image-skeleton"

interface RecommendedItem {
  id: string
  title: string
  year: string
  image: string
}

interface RecommendedContentProps {
  items: RecommendedItem[]
}

export function RecommendedContent({ items }: RecommendedContentProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
      {items.map((item) => (
        <Link key={item.id} href={`/anime/${item.id}`} className="block">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden hover:bg-gray-800 transition-colors cursor-pointer">
            <ImageSkeleton
              src={item.image || "/placeholder.svg"}
              alt={item.title}
              className="w-full aspect-[2/3] object-cover"
            />
            <div className="p-3">
              <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>
              <p className="text-xs text-gray-400">{item.year}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
