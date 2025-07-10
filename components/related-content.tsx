import Link from "next/link"
import { ImageSkeleton } from "@/components/image-skeleton"

interface RelatedItem {
  id: string
  title: string
  type: string
  year: string
  image: string
}

interface RelatedContentProps {
  items: RelatedItem[]
}

export function RelatedContent({ items }: RelatedContentProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map((item) => (
        <Link key={item.id} href={`/anime/${item.id}`} className="block">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden hover:bg-gray-800 transition-colors cursor-pointer">
            <div className="relative">
              <ImageSkeleton
                src={item.image || "/placeholder.svg"}
                alt={item.title}
                className="w-full aspect-[2/3] object-cover"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
                {item.type}
              </div>
            </div>
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
