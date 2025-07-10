import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-800", className)}
      {...props}
    />
  )
}

// Card skeleton for manga/comics items
function CardSkeleton() {
  return (
    <div className="flex-none w-[160px] sm:w-[180px]">
      <Skeleton className="aspect-[2/3] rounded-md mb-2" />
      <Skeleton className="h-4 w-3/4 mb-1" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

// Banner skeleton for featured content
function BannerSkeleton() {
  return (
    <div className="w-full">
      <Skeleton className="w-full h-[360px] md:h-[420px] lg:h-[460px] rounded-none bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800" />
      <div className="absolute bottom-24 right-12 max-w-lg space-y-4 p-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  )
}

// Text block skeleton for descriptions
function TextBlockSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 w-full">
      {Array(lines).fill(0).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 ${i === lines - 1 ? 'w-4/5' : 'w-full'}`} 
        />
      ))}
    </div>
  )
}

// List item skeleton (generic)
function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 bg-gray-800/50 rounded-md p-3 w-[280px]">
      <Skeleton className="w-16 h-16 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

// Grid of card skeletons
function CarouselSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex space-x-4 overflow-hidden">
      {Array(count).fill(0).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

// Category buttons skeleton
function CategorySkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex space-x-2 pb-2">
      {Array(count).fill(0).map((_, i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-full" />
      ))}
    </div>
  )
}

// Detailed view skeleton for manga/comics detail page
function DetailViewSkeleton() {
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <Skeleton className="w-full md:w-64 aspect-[2/3] rounded-lg" />
      <div className="flex-1 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <TextBlockSkeleton lines={5} />
      </div>
    </div>
  )
}

// Chapter item skeleton (episodes removed)
function ChapterItemSkeleton() {
  return (
    <div className="flex items-center gap-3 bg-gray-800/50 rounded-md p-3 w-[280px]">
      <Skeleton className="w-16 h-16 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

export { 
  Skeleton, 
  CardSkeleton, 
  BannerSkeleton, 
  TextBlockSkeleton,
  ListItemSkeleton,
  CarouselSkeleton,
  CategorySkeleton,
  DetailViewSkeleton,
  ChapterItemSkeleton
}
