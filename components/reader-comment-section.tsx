"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { 
  Send, 
  MessageSquare, 
  AlertCircle, 
  Trash2, 
  Edit, 
  X,
  Loader2,
  UserCircle,
  StickyNote,
  XCircle,
  ThumbsUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ka } from 'date-fns/locale'
import { v5 as uuidv5 } from 'uuid'
import { 
  getCommentsByContentId, 
  getAllComments, 
  addComment, 
  deleteComment, 
  updateComment, 
  Comment,
  ensureCommentsTable,
  toggleCommentLike,
  getSupabaseAvatarUrl
} from '@/lib/comments'
import { toast } from 'sonner'
import { useUnifiedAuth } from '@/components/unified-auth-provider'
import { useAuth } from '@/components/supabase-auth-provider'
import { StickerSelector, Sticker } from './sticker-selector'
import { cn } from '@/lib/utils'
import { createNotification } from "@/lib/notifications"
import { VIPBadge } from "@/components/ui/vip-badge"
import Link from 'next/link'

// UUID namespace for converting non-UUID IDs (same as in comments.ts)
const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341'

// Helper function to ensure UUID format (copied from comments.ts)
function ensureUUID(id: string): string {
  // Check if already a valid UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id
  }
  
  // Convert to a deterministic UUID using the namespace
  return uuidv5(id, NAMESPACE)
}

// Define UserProfile interface with VIP properties
interface UserProfile {
  username: string | null;
  avatar_url: string | null;
  vip_status?: boolean;
  vip_theme?: string | undefined;
  comment_background_url?: string | null | undefined;
}

// Extended Comment interface that includes the properties used in this component
interface CommentWithDetails extends Comment {
  media_url?: string;
  user_profile?: UserProfile;
  like_count?: number;
  user_has_liked?: boolean;
}

interface ReaderCommentSectionProps {
  mangaId: string
  chapterNumber: number
  chapterTitle: string
  chapterId?: string
  language?: 'ge' | 'en'
}

export function ReaderCommentSection({
  mangaId,
  chapterNumber,
  chapterTitle,
  chapterId,
  language = 'ge'
}: ReaderCommentSectionProps) {
  // Use unified auth for basic auth state
  const { isAuthenticated, isLoading: authLoading, userId, username, avatarUrl } = useUnifiedAuth();
  // Use useAuth for detailed profile information, including VIP status
  const { profile } = useAuth();
  
  const [comments, setComments] = useState<CommentWithDetails[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null)
  const [showStickerSelector, setShowStickerSelector] = useState(false)
  const [editMedia, setEditMedia] = useState<string | null>(null)
  const [commentToDelete, setCommentToDelete] = useState<CommentWithDetails | null>(null)
  
  const commentBoxRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [commentsPerPage] = useState(5) // Comments per page

  // Create unique content ID for this specific chapter
  const contentId = `${mangaId}-chapter-${chapterId || chapterNumber}-${language}`

  // Load comments for this specific chapter
  useEffect(() => {
    async function loadComments() {
      setIsLoading(true)
      
      try {
        // First ensure the comments table structure is correct
        await ensureCommentsTable();
        
        // Get comments for this specific chapter
        const { success, comments } = await getAllComments(contentId, 'manga', userId);
        
        if (success && comments) {
          setComments(comments);
        } else {
          // Silent fail for reader - don't show error toast
          console.warn("Failed to load chapter comments");
        }
      } catch (error) {
        console.error('Error loading chapter comments:', error)
        // Silent fail for reader
      } finally {
        setIsLoading(false)
      }
    }

    loadComments();
  }, [contentId, userId]);

  // Reload comments when user authentication state changes
  useEffect(() => {
    if (!isLoading && contentId) {
      getAllComments(contentId, 'manga', userId).then(({ success, comments }) => {
        if (success && comments) {
          setComments(comments);
        }
      });
    }
  }, [isAuthenticated, userId, contentId, isLoading]);

  // Auto focus when editing
  useEffect(() => {
    if (editingId && commentBoxRef.current) {
      commentBoxRef.current.focus()
    }
  }, [editingId])

  // Handle sticker selection
  const handleStickerSelect = (sticker: Sticker) => {
    setSelectedSticker(sticker);
    setShowStickerSelector(false);
  }
  
  // Remove selected sticker
  const handleRemoveSticker = () => {
    setSelectedSticker(null)
  }
  
  // Toggle sticker selector
  const toggleStickerSelector = () => {
    setShowStickerSelector(!showStickerSelector);
  }

  // Submit a new comment or save an edit
  const handlePostOrUpdateComment = async () => {
    if (editingId) {
      await saveEdit();
    } else {
      await handlePostComment();
    }
  };

  // Submit a new comment
  const handlePostComment = async () => {
    if (!newComment.trim() && !selectedSticker) {
      toast.error("გთხოვთ, შეიყვანოთ კომენტარი ან აირჩიოთ სტიკერი");
      return;
    }
    
    if (authLoading) {
      toast.error("გთხოვთ, დაელოდოთ ავტორიზაციის პროცესს");
      return;
    }
    
    if (!isAuthenticated || !userId) {
      toast.error("კომენტარის დასატოვებლად უნდა იყოთ ავტორიზებული");
      return;
    }
  
    try {
      setIsSubmitting(true)
      
      const tableCheck = await ensureCommentsTable();
      if (!tableCheck.success) {
        console.error("Failed to ensure comments table structure:", tableCheck.error);
        toast.error("სერვერის პრობლემა. გთხოვთ, სცადოთ ხელახლა.");
        return;
      }
      
      const mediaUrl = selectedSticker ? selectedSticker.url : null
      
      // Validate text length before sending to server
      if (newComment.trim().length > 2000) {
        toast.error("კომენტარი ძალიან გრძელია. მაქსიმუმ 2000 სიმბოლო დაშვებულია.");
        return;
      }
      
      // Make sure we have at least one of text or media
      if (!newComment.trim() && !mediaUrl) {
        toast.error("კომენტარი უნდა შეიცავდეს ტექსტს ან სტიკერს.");
        return;
      }
      
      const { success, comment, error } = await addComment(
        userId,
        contentId,
        'manga',
        newComment.trim(),
        username || 'მომხმარებელი',
        getSupabaseAvatarUrl(userId, profile?.avatar_url),
        mediaUrl
      )
      
      if (success && comment) {
        setComments(prevComments => [comment, ...prevComments])
        setCurrentPage(1); // Go to first page to see new comment
        setNewComment('')
        setSelectedSticker(null)
        toast.success("კომენტარი დაემატა!")
      } else {
        console.error('Error posting comment:', error);
        toast.error("კომენტარის დამატება ვერ მოხერხდა");
      }
    } catch (error) {
      console.error('Error posting comment:', error)
      toast.error("დაფიქსირდა შეცდომა")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Check if the current user can edit/delete a comment
  const isOwnComment = (comment: CommentWithDetails): boolean => {
    if (!userId) return false
    return comment.user_id === ensureUUID(userId);
  }

  // Start editing a comment
  const handleEditComment = (comment: CommentWithDetails) => {
    setEditingId(comment.id)
    setEditText(comment.text)
    setEditMedia(comment.media_url || null)
    setSelectedSticker(null)
    setShowStickerSelector(false);
    if(commentBoxRef.current) commentBoxRef.current.focus();
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
    setEditMedia(null)
  }

  // Save edited comment
  const saveEdit = async () => {
    if (!editingId || (!editText.trim() && !editMedia) || !userId) return
    
    try {
      setIsSubmitting(true)
      
      const { success, comment, error } = await updateComment(
        editingId,
        userId,
        editText.trim(),
        editMedia
      )
      
      if (success && comment) {
        setComments(prevComments => 
          prevComments.map(c => 
            c.id === editingId ? comment : c
          )
        )
        
        setEditingId(null)
        setEditText('')
        setEditMedia(null)
        toast.success("კომენტარი განახლდა")
      } else {
        console.error('Error updating comment:', error)
        toast.error("კომენტარის განახლება ვერ მოხერხდა")
      }
    } catch (error) {
      console.error('Error updating comment:', error)
      toast.error("კომენტარის განახლება ვერ მოხერხდა")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Remove media from a comment being edited
  const handleRemoveEditMedia = async () => {
    setEditMedia(null)
  }

  // Handle deleting a comment
  const handleDeleteCommentRequest = (commentToConfirm: CommentWithDetails) => {
    if (!userId) return;
    setCommentToDelete(commentToConfirm);
  };

  // Actual deletion logic after confirmation
  const confirmActualDelete = async () => {
    if (!commentToDelete || !userId) return;

    try {
      const { success, error } = await deleteComment(commentToDelete.id, userId);

      if (success) {
        setComments(prevComments => prevComments.filter(c => c.id !== commentToDelete.id));
        toast.success("კომენტარი წაიშალა");
      } else {
        console.error('Error deleting comment:', error);
        toast.error("კომენტარის წაშლა ვერ მოხერხდა");
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error("დაფიქსირდა შეცდომა კომენტარის წაშლისას");
    } finally {
      setCommentToDelete(null);
    }
  };

  const cancelActualDelete = () => {
    setCommentToDelete(null);
  };

  // Function to update like state locally
  const updateLocalLikeState = (commentId: string, liked: boolean, newCount: number) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, user_has_liked: liked, like_count: newCount };
      }
      return c;
    }));
  };

  // Handle Liking a comment
  const handleLikeCommentOrReply = async (item: CommentWithDetails) => {
    if (!isAuthenticated || !userId) {
      toast.error("კომენტარების მოსაწონებლად უნდა იყოთ ავტორიზებული");
      return;
    }

    const originalLiked = item.user_has_liked ?? false; 
    const originalCount = item.like_count || 0;
    const optimisticNewLiked = !originalLiked;
    const optimisticNewCount = optimisticNewLiked ? originalCount + 1 : Math.max(0, originalCount - 1);

    updateLocalLikeState(item.id, optimisticNewLiked, optimisticNewCount);

    try {
      const { success, liked, newLikeCount, error } = await toggleCommentLike(item.id, userId, contentId, 'manga');

      if (!success) {
        updateLocalLikeState(item.id, originalLiked, originalCount);
        toast.error("მოწონების განახლება ვერ მოხერხდა");
        console.error("Like toggle error:", error);
        return;
      }

      updateLocalLikeState(item.id, liked, newLikeCount);
      
      if (liked && item.user_id !== ensureUUID(userId)) {
        try {
           const notificationResult = await createNotification( 
               item.user_id, 
               'comment_like', 
               { 
                 sender_user_id: userId, 
                 sender_username: username || 'მომხმარებელი',
                 comment_id: item.id, 
                 content_id: contentId, 
                 content_type: 'manga',
                 comment_snippet: item.text.substring(0, 50) + (item.text.length > 50 ? '...' : ''),
                 content_title: `${chapterTitle}`,
                 chapter_number: chapterNumber
               }
           );
        } catch (notifError) {
           console.error("Error creating notification:", notifError);
        }
      } 
    } catch (err) {
      updateLocalLikeState(item.id, originalLiked, originalCount);
      toast.error("კომენტარის მოწონებისას დაფიქსირდა შეცდომა");
      console.error("Like handling error:", err);
    }
  };

  // Pagination Logic
  const totalCommentsCount = comments.length;
  const totalPagesCalculated = Math.ceil(totalCommentsCount / commentsPerPage);
  
  const indexOfLastComment = currentPage * commentsPerPage;
  const indexOfFirstComment = indexOfLastComment - commentsPerPage;
  const currentComments = comments.slice(indexOfFirstComment, indexOfLastComment);
  
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPagesCalculated) {
      setCurrentPage(pageNumber);
    }
  };

  // Combined state for edit sticker selection
  const [showEditStickerSelector, setShowEditStickerSelector] = useState(false);
  const handleEditStickerSelect = (sticker: Sticker) => {
    setEditMedia(sticker.url);
    setShowEditStickerSelector(false);
  };
  const toggleEditStickerSelector = () => {
    setShowEditStickerSelector(!showEditStickerSelector);
  };

  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
      {/* Chapter Header */}
      <div className="flex-shrink-0 p-4 bg-gray-900/50 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-white">
              თავი {chapterNumber}: {chapterTitle}
            </span>
            {language === 'en' && (
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">EN</span>
            )}
          </div>
          <div className="bg-purple-600/30 text-purple-200 px-2 py-1 rounded-full text-xs">
            {comments.length} კომენტარი
          </div>
        </div>
      </div>
      
      {/* Comments Container */}
      <div className="flex-1 flex flex-col overflow-visible">
        {/* New comment box */}
        {(isAuthenticated || authLoading) ? (
          <div className="flex-shrink-0 p-4 border-b border-gray-700">
            <div className="flex items-start space-x-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                {profile?.avatar_url ? (
                  <AvatarImage 
                    src={getSupabaseAvatarUrl(userId, profile.avatar_url ?? undefined) ?? undefined} 
                    alt={username || 'მომხმარებელი'} 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <AvatarFallback>
                    <UserCircle className="h-8 w-8 text-white/70" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-grow">
                <Textarea
                  ref={commentBoxRef}
                  value={editingId ? editText : newComment}
                  onChange={(e) => editingId ? setEditText(e.target.value) : setNewComment(e.target.value)}
                  placeholder={
                    authLoading 
                      ? "იტვირთება..." 
                      : editingId 
                        ? "კომენტარის რედაქტირება..." 
                        : "დაწერეთ კომენტარი..."
                  }
                  className="resize-none mb-2 bg-gray-800 border-gray-600 placeholder:text-gray-400 focus:border-purple-500 text-white text-sm"
                  rows={editingId || newComment.length > 70 ? 2 : 1}
                  disabled={authLoading}
                />
              
                {/* Sticker/Media Preview */}
                {(editingId && editMedia) || (!editingId && selectedSticker) ? (
                  <div className="relative inline-block mb-2 ml-1 group">
                    <div className="relative w-20 h-20 rounded-md overflow-hidden border border-gray-600 bg-gray-800 flex items-center justify-center">
                      <Image
                        src={editingId ? editMedia! : selectedSticker!.url}
                        alt={editingId ? "მედია" : selectedSticker!.alt}
                        width={80}
                        height={80}
                        className="object-contain max-w-full max-h-full"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={editingId ? handleRemoveEditMedia : handleRemoveSticker}
                      className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="წაშლა"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ) : null}
              
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={editingId ? toggleEditStickerSelector : toggleStickerSelector}
                      className="h-8 w-8 text-gray-400 hover:text-purple-400 hover:bg-gray-700 relative p-0"
                      title="სტიკერი"
                    >
                      <StickyNote className="h-4 w-4" />
                      {(showStickerSelector && !editingId) && (
                        <StickerSelector
                          onSelectSticker={handleStickerSelect}
                          onClose={() => setShowStickerSelector(false)}
                          profile={profile}
                        />
                      )}
                      {(showEditStickerSelector && editingId) && (
                          <StickerSelector
                              onSelectSticker={handleEditStickerSelect}
                              onClose={toggleEditStickerSelector}
                              profile={profile}
                          />
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {editingId && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={cancelEdit}
                        className="text-gray-400 hover:text-white hover:bg-gray-700 text-xs"
                      >
                        გაუქმება
                      </Button>
                    )}
                    <Button 
                      onClick={() => {
                        if (authLoading) return;
                        if (!isAuthenticated && !authLoading) {
                          toast.error("ავტორიზაცია საჭიროა");
                          return;
                        }
                        handlePostOrUpdateComment();
                      }} 
                      disabled={authLoading || isSubmitting || (editingId ? !editText.trim() && !editMedia : !newComment.trim() && !selectedSticker)}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1 h-8"
                    >
                      {authLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          იტვირთება...
                        </>
                      ) : isSubmitting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : !isAuthenticated ? (
                        'ავტორიზაცია'
                      ) : (
                        <>
                          {editingId ? 'შენახვა' : 'გამოქვეყნება'}
                          <Send className="ml-1 h-3 w-3" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-shrink-0 p-4 border-b border-gray-700 text-center">
            <AlertCircle className="h-6 w-6 mx-auto mb-2 text-purple-400" />
            <p className="text-sm text-gray-300 mb-2">ავტორიზაცია საჭიროა კომენტარისთვის</p>
            <Button 
              onClick={() => router.push('/login')}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1"
            >
              შესვლა
            </Button>
          </div>
        )}

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              <p className="mt-2 text-xs text-gray-400">იტვირთება...</p>
            </div>
          ) : currentComments.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-500" />
              <p className="text-sm text-gray-400">კომენტარები არ არის</p>
              <p className="text-xs text-gray-500 mt-1">იყავით პირველი!</p>
              <img src="/images/mascot/no-comments.png" alt="no comments" className="w-1/3 mt-4 mx-auto" />
            </div>
          ) : (
            <div className="space-y-4">
              {currentComments.map((comment) => (
                <ReaderCommentItem 
                  key={comment.id} 
                  comment={comment} 
                  userId={userId}
                  handleLikeCommentOrReply={handleLikeCommentOrReply}
                  handleEditComment={handleEditComment}
                  handleDeleteCommentRequest={handleDeleteCommentRequest}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPagesCalculated > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t border-gray-700">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPagesCalculated }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className={cn(
                      "h-8 w-8 text-xs",
                      currentPage === page 
                        ? "bg-purple-600 text-white hover:bg-purple-500"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    )}
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPagesCalculated}
                className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {commentToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={cancelActualDelete}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 p-6 rounded-lg shadow-xl border border-gray-700 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">კომენტარის წაშლა</h3>
              <p className="text-sm text-gray-300 mb-6">
                დარწმუნებული ხართ?
              </p>
              <div className="flex justify-center gap-3">
                <Button 
                  variant="outline"
                  onClick={cancelActualDelete}
                  className="border-gray-600 hover:bg-gray-700 text-gray-300"
                >
                  არა
                </Button>
                <Button 
                  variant="destructive"
                  onClick={confirmActualDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  დიახ
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const ReaderCommentItem = ({ 
  comment, 
  userId, 
  handleLikeCommentOrReply, 
  handleEditComment, 
  handleDeleteCommentRequest 
}: { 
  comment: CommentWithDetails; 
  userId: string | null; 
  handleLikeCommentOrReply: (comment: CommentWithDetails) => void; 
  handleEditComment: (comment: CommentWithDetails) => void; 
  handleDeleteCommentRequest: (comment: CommentWithDetails) => void;
}) => {
  const isOwnComment = userId && comment.user_id === ensureUUID(userId)
  const [showFullText, setShowFullText] = useState(false);
  const MAX_LENGTH = 150;

  const formattedDate = comment.created_at
    ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ka })
    : 'უცნობი';

  const toggleShowFullText = () => {
    setShowFullText(!showFullText);
  };

  const commentBackgroundStyle = comment.user_profile?.vip_status && comment.user_profile?.comment_background_url
    ? { backgroundImage: `url(${comment.user_profile.comment_background_url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
    : {};

  return (
    <div 
      className={cn(
        "p-3 rounded-lg relative border",
        comment.user_profile?.vip_status ? "border-yellow-500" : "border-gray-700 bg-gray-800/50"
      )}
      style={commentBackgroundStyle}
    >
      <div className={cn(
        "absolute inset-0 rounded-lg",
        comment.user_profile?.vip_status && comment.user_profile?.comment_background_url ? "bg-black/70" : ""
      )}></div>
      
      <div className="relative z-10">
        <div className="flex items-start space-x-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            {comment.user_profile?.avatar_url ? (
              <AvatarImage 
                src={getSupabaseAvatarUrl(comment.user_id, comment.user_profile.avatar_url ?? undefined) ?? undefined} 
                alt={comment.user_profile?.username || "მომხმარებელი"} 
                referrerPolicy="no-referrer"
              />
            ) : (
              <AvatarFallback className="text-xs">
                {comment.user_profile?.username 
                  ? comment.user_profile.username.charAt(0).toUpperCase() 
                  : <UserCircle size={20} />
                }
              </AvatarFallback>
            )}
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className={cn(
                "font-medium text-sm truncate",
                comment.user_profile?.vip_status && comment.user_profile?.comment_background_url ? "text-white drop-shadow-lg" : "text-gray-200"
              )}>
                {comment.user_profile?.username || "მომხმარებელი"}
              </span>
              {comment.user_profile?.vip_status && <VIPBadge />}
              <span className={cn(
                "text-xs",
                comment.user_profile?.vip_status && comment.user_profile?.comment_background_url ? "text-gray-300 drop-shadow-lg" : "text-gray-400"
              )}>
                {formattedDate}
              </span>
            </div>
            
            {comment.text && (
              <div className={cn(
                "text-sm whitespace-pre-wrap break-words mb-2",
                comment.user_profile?.vip_status && comment.user_profile?.comment_background_url 
                  ? "text-white drop-shadow-lg" 
                  : "text-gray-300"
              )}>
                {showFullText || comment.text.length <= MAX_LENGTH 
                  ? comment.text 
                  : `${comment.text.substring(0, MAX_LENGTH)}...`}
                {comment.text.length > MAX_LENGTH && (
                  <button 
                    onClick={toggleShowFullText} 
                    className={cn(
                      "text-xs hover:underline ml-1",
                      comment.user_profile?.vip_status && comment.user_profile?.comment_background_url
                        ? "text-blue-300 drop-shadow-lg"
                        : "text-blue-400"
                    )}
                  >
                    {showFullText ? 'ნაკლები' : 'მეტი'}
                  </button>
                )}
              </div>
            )}

            {comment.media_url && (
              <div className="mb-2">
                <div className="max-w-[120px] inline-block">
                  <Image 
                    src={comment.media_url} 
                    alt="სტიკერი" 
                    width={120} 
                    height={120} 
                    className="rounded object-contain" 
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLikeCommentOrReply(comment)}
                className={cn(
                  "px-2 py-1 h-auto text-xs flex items-center gap-1 rounded-full",
                  comment.user_profile?.vip_status && comment.user_profile?.comment_background_url
                    ? comment.user_has_liked
                      ? "text-purple-300 bg-purple-800/50 hover:bg-purple-800/70"
                      : "text-gray-300 hover:text-purple-300 bg-black/20 hover:bg-black/30"
                    : comment.user_has_liked
                      ? "text-purple-400 bg-purple-900/30 hover:bg-purple-900/50"
                      : "text-gray-400 hover:text-purple-400 hover:bg-gray-700/50"
                )}
              >
                <ThumbsUp className={cn(
                  "h-3 w-3", 
                  comment.user_has_liked && "fill-current"
                )} />
                <span>{comment.like_count || 0}</span>
              </Button>
              
              {isOwnComment && (
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEditComment(comment)} 
                    className={cn(
                      "text-xs px-2 py-1 h-auto",
                      comment.user_profile?.vip_status && comment.user_profile?.comment_background_url
                        ? "text-blue-300 hover:text-blue-200 bg-black/20 hover:bg-black/30"
                        : "text-blue-400 hover:text-blue-300 hover:bg-gray-700/50"
                    )}
                  >
                    <Edit size={12} className="mr-1" /> რედაქტირება
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeleteCommentRequest(comment)} 
                    className={cn(
                      "text-xs px-2 py-1 h-auto",
                      comment.user_profile?.vip_status && comment.user_profile?.comment_background_url
                        ? "text-red-300 hover:text-red-200 bg-black/20 hover:bg-black/30"
                        : "text-red-400 hover:text-red-300 hover:bg-gray-700/50"
                    )}
                  >
                    <Trash2 size={12} className="mr-1" /> წაშლა
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReaderCommentSection; 