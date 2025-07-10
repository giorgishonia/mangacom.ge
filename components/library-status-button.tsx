"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Bookmark, 
  CheckCheck, 
  Play, 
  BookOpen,
  PauseCircle, 
  XCircle, 
  X,
  Clock 
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MediaStatus, MediaType, updateItemStatus } from '@/lib/user-library'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/use-toast'

interface LibraryStatusButtonProps {
  id: string
  type: MediaType
  currentStatus: MediaStatus | null
  onStatusChange: (status: MediaStatus) => void
}

export function LibraryStatusButton({ 
  id, 
  type, 
  currentStatus, 
  onStatusChange 
}: LibraryStatusButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const isAnime = type === 'anime'
  
  const getStatusInfo = (status: MediaStatus | null) => {
    switch (status) {
      case 'reading':
        return {
          icon: isAnime ? <Play className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />,
          label: isAnime ? 'Watching' : 'Reading',
          color: 'text-green-400'
        }
      case 'plan_to_read':
        return {
          icon: <Bookmark className="h-4 w-4" />,
          label: isAnime ? 'Plan to Watch' : 'Plan to Read',
          color: 'text-purple-400'
        }
      case 'completed':
        return {
          icon: <CheckCheck className="h-4 w-4" />,
          label: 'Completed',
          color: 'text-blue-400'
        }
      case 'on_hold':
        return {
          icon: <PauseCircle className="h-4 w-4" />,
          label: 'On Hold',
          color: 'text-yellow-400'
        }
      case 'dropped':
        return {
          icon: <XCircle className="h-4 w-4" />,
          label: 'Dropped',
          color: 'text-red-400'
        }
      default:
        return {
          icon: <Bookmark className="h-4 w-4" />,
          label: 'Add to Library',
          color: 'text-white/70'
        }
    }
  }

  const statusInfo = getStatusInfo(currentStatus)

  const handleStatusUpdate = async (status: MediaStatus) => {
    try {
      // If the status is the same as current, don't update
      if (status === currentStatus) {
        setIsOpen(false)
        return
      }
      
      // Call the parent's onStatusChange callback
      onStatusChange(status)
      
      // Show success toast
      toast({
        title: `${isAnime ? 'Anime' : 'Manga'} status updated`,
        description: `Status changed to ${getStatusInfo(status).label.toLowerCase()}`,
        variant: "default",
      })
    } catch (error) {
      console.error("Failed to update status:", error)
      toast({
        title: "Failed to update status",
        description: "Please try again later",
        variant: "destructive",
      })
    }
  }

  const handleRemoveFromLibrary = async () => {
    try {
      // Reset status to null
      onStatusChange(null as any)
      
      // Remove from library in database
      await updateItemStatus(id, type.toLowerCase() as MediaType, 'removed' as MediaStatus, '', '', 0)
      
      // Show success toast
      toast({
        title: `${isAnime ? 'Anime' : 'Manga'} removed from library`,
        description: "Successfully removed from your library",
        variant: "default",
      })
    } catch (error) {
      console.error("Failed to remove from library:", error)
      toast({
        title: "Failed to remove from library",
        description: "Please try again later",
        variant: "destructive",
      })
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <motion.button
          className={cn(
            "px-4 py-2.5 bg-white/10 backdrop-blur-sm text-white font-medium rounded-lg flex items-center gap-2 border border-white/10 transition-all duration-200",
            currentStatus ? "hover:bg-white/15" : "hover:bg-white/20"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className={statusInfo.color}>{statusInfo.icon}</span>
          <span>{statusInfo.label}</span>
        </motion.button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-56 bg-black/90 backdrop-blur-md border-white/10 rounded-lg shadow-xl"
        align="end"
      >
        <DropdownMenuItem 
          className={cn(
            "flex items-center gap-2 px-3 py-2 cursor-pointer",
            currentStatus === 'reading' ? "bg-green-900/20 text-green-400" : "hover:bg-white/10"
          )}
          onClick={() => handleStatusUpdate('reading')}
        >
          {isAnime ? <Play className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
          <span>{isAnime ? 'Watching' : 'Reading'}</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className={cn(
            "flex items-center gap-2 px-3 py-2 cursor-pointer",
            currentStatus === 'plan_to_read' ? "bg-purple-900/20 text-purple-400" : "hover:bg-white/10"
          )}
          onClick={() => handleStatusUpdate('plan_to_read')}
        >
          <Bookmark className="h-4 w-4" />
          <span>{isAnime ? 'Plan to Watch' : 'Plan to Read'}</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className={cn(
            "flex items-center gap-2 px-3 py-2 cursor-pointer",
            currentStatus === 'completed' ? "bg-blue-900/20 text-blue-400" : "hover:bg-white/10"
          )}
          onClick={() => handleStatusUpdate('completed')}
        >
          <CheckCheck className="h-4 w-4" />
          <span>Completed</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className={cn(
            "flex items-center gap-2 px-3 py-2 cursor-pointer",
            currentStatus === 'on_hold' ? "bg-yellow-900/20 text-yellow-400" : "hover:bg-white/10"
          )}
          onClick={() => handleStatusUpdate('on_hold')}
        >
          <PauseCircle className="h-4 w-4" />
          <span>On Hold</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className={cn(
            "flex items-center gap-2 px-3 py-2 cursor-pointer",
            currentStatus === 'dropped' ? "bg-red-900/20 text-red-400" : "hover:bg-white/10"
          )}
          onClick={() => handleStatusUpdate('dropped')}
        >
          <XCircle className="h-4 w-4" />
          <span>Dropped</span>
        </DropdownMenuItem>
        
        {currentStatus && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem 
              className="flex items-center gap-2 px-3 py-2 text-white/60 hover:bg-white/10 cursor-pointer"
              onClick={handleRemoveFromLibrary}
            >
              <X className="h-4 w-4" />
              <span>Remove from Library</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 