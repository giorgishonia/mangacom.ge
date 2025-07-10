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
  toggleCommentLike
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

// Placeholder type for the return value of the assumed paginated function
type PaginatedCommentsResponse = {
  success: boolean;
  comments: CommentWithDetails[];
  totalCount: number | null;
  error?: any;
};

// Placeholder for the actual paginated fetching function
async function getPaginatedComments(
  contentId: string,
  contentType: 'manga' | 'comics',
  page: number,
  limit: number,
  userId?: string | null
): Promise<PaginatedCommentsResponse> {
  console.warn("Using placeholder getPaginatedComments. Implement actual fetching in lib/comments.ts");
  
  // Don't normalize content type here, let the getAllComments function handle it consistently
  const { success, comments, error } = await getAllComments(contentId, contentType, userId);
  
  if (!success || !comments) {
    return { success: false, comments: [], totalCount: 0, error };
  }
  
  const totalCount = comments.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedComments = comments.slice(startIndex, endIndex);
  
  return { success: true, comments: paginatedComments, totalCount, error: null };
}

interface CommentSectionProps {
  contentId: string
  contentType: 'manga' | 'comics'
  sectionVariants?: any
  itemVariants?: any
}

export function CommentSection({
  contentId,
  contentType,
  sectionVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  },
  itemVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  }
}: CommentSectionProps) {
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

  // Print auth state for debugging
  useEffect(() => {
    console.log("CommentSection auth state:", { isAuthenticated, userId, username, authLoading });
  }, [isAuthenticated, userId, username, authLoading]);

  // Load comments for this content
  useEffect(() => {
    async function loadComments() {
      setIsLoading(true)
      
      try {
        // First ensure the comments table structure is correct
        await ensureCommentsTable();
        
        // Then get the comments, passing the userId
        const { success, comments } = await getAllComments(contentId, contentType, userId);
        
        if (success && comments) {
          // The comments fetched now include like_count and user_has_liked
          setComments(comments);
        } else {
          toast.error("კომენტარების ჩატვირთვა ვერ მოხერხდა")
        }
      } catch (error) {
        console.error('Error loading comments:', error)
        toast.error("კომენტარების სერვერთან დაკავშირება ვერ მოხერხდა")
      } finally {
        setIsLoading(false)
      }
    }

    loadComments();
    // Add userId to dependencies so likes update on login/logout
  }, [contentId, contentType, userId]);

  // Reload comments when user authentication state changes
  useEffect(() => {
    if (!isLoading && contentId) {
      getAllComments(contentId, contentType, userId).then(({ success, comments }) => {
        if (success && comments) {
          setComments(comments);
        }
      });
    }
  }, [isAuthenticated, userId, avatarUrl, contentId, contentType, isLoading]);

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
    if (!newComment.trim() && !selectedSticker) return
    
    if (!isAuthenticated || !userId) {
      toast.error("კომენტარის დასატოვებლად უნდა იყოთ ავტორიზებული.");
      router.push('/login')
      return
    }
  
    try {
      setIsSubmitting(true)
      
      const tableCheck = await ensureCommentsTable();
      if (!tableCheck.success) {
        console.error("Failed to ensure comments table structure:", tableCheck.error);
        toast.error("სერვერის პრობლემა. გთხოვთ, სცადოთ ხელახლა ცოტა ხანში.");
        return;
      }
      
      // We'll validate the contentType but not convert it to uppercase here
      // Let the addComment function handle case normalization consistently
      const validContentTypes = ['manga', 'comics'];
      
      if (!validContentTypes.includes(contentType.toLowerCase())) {
        console.error(`Invalid content type: ${contentType}`);
        toast.error(`Invalid content type. Please reload the page.`);
        return;
      }
      
      console.log('Submitting comment with contentType:', contentType);
      
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
        contentType, // Pass the original contentType, let addComment normalize it
        newComment.trim(),
        username || 'მომხმარებელი',
        avatarUrl,
        mediaUrl
      )
      
      if (success && comment) {
        // Add to the beginning of the full comments list
        setComments(prevComments => [comment, ...prevComments])
        // If on a page other than 1, new comment might not be visible, consider going to page 1
        // For simplicity now, it just adds to the master list.
        setCurrentPage(1); // Go to first page to see new comment
        setNewComment('')
        setSelectedSticker(null)
        toast.success("კომენტარი დაემატა!")
      } else {
        console.error('Error posting comment:', error);
        // Access error message safely and ensure it's a string
        let errorMessage = "კომენტარის დამატება ვერ მოხერხდა";
        
        if (error && typeof error === 'object' && 'message' in error) {
          errorMessage = String(error.message);
        }
        
        toast.error(errorMessage);
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
    setSelectedSticker(null) // Clear main sticker selector when editing
    if (comment.media_url && comment.media_url.startsWith('http')) { // Assuming stickers are URLs
        // Attempt to find sticker object if media_url matches a known sticker
        // This part is tricky if you don't have the original sticker objects easily available.
        // For now, we just set editMedia. If you have a list of all possible stickers, you could find it here.
    }
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
        editMedia // This now correctly passes the media_url for the sticker or other media
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
    // If editing, this means we want to remove the sticker/media from the comment upon saving
  }

  // Handle deleting a comment - NOW SETS STATE TO SHOW CONFIRMATION
  const handleDeleteCommentRequest = (commentToConfirm: CommentWithDetails) => {
    if (!userId) return; // Should not happen if button is shown correctly
    setCommentToDelete(commentToConfirm);
  };

  // Actual deletion logic after confirmation
  const confirmActualDelete = async () => {
    if (!commentToDelete || !userId) return;

    try {
      // Call the existing deleteComment function from lib/comments
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
      setCommentToDelete(null); // Hide modal
    }
  };

  const cancelActualDelete = () => {
    setCommentToDelete(null); // Hide modal
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
      router.push('/login');
      return;
    }

    const originalLiked = item.user_has_liked ?? false; 
    const originalCount = item.like_count || 0;
    const optimisticNewLiked = !originalLiked;
    const optimisticNewCount = optimisticNewLiked ? originalCount + 1 : Math.max(0, originalCount - 1);

    updateLocalLikeState(item.id, optimisticNewLiked, optimisticNewCount);

    try {
      const { success, liked, newLikeCount, error } = await toggleCommentLike(item.id, userId, contentId, contentType);

      if (!success) {
        updateLocalLikeState(item.id, originalLiked, originalCount);
        toast.error("მოწონების განახლება ვერ მოხერხდა");
        console.error("Like toggle error:", error);
        return;
      }
      // The backend now returns the definitive state, so update with that.
      updateLocalLikeState(item.id, liked, newLikeCount);
      
      if (liked && item.user_id !== ensureUUID(userId)) {
        console.log(`Attempting to send 'like' notification to user: ${item.user_id}`);
        try {
           const notificationResult = await createNotification( 
               item.user_id, 
               'comment_like', 
               { 
                 sender_user_id: userId, 
                 sender_username: username || 'მომხმარებელი',
                 comment_id: item.id, 
                 content_id: contentId, 
                 content_type: contentType,
                 comment_snippet: item.text.substring(0, 50) + (item.text.length > 50 ? '...' : '') 
               }
           );
           if (notificationResult.success) {
               console.log("Like notification created successfully.");
           } else {
               console.error("Failed to create like notification:", notificationResult.error);
           }
        } catch (notifError) {
           console.error("Error calling createNotification:", notifError);
        }
      } 
    } catch (err) {
      updateLocalLikeState(item.id, originalLiked, originalCount);
      toast.error("კომენტარის მოწონებისას დაფიქსირდა შეცდომა");
      console.error("Like handling error:", err);
    }
  };

  // Create filtered comments array with no additional processing needed
  const processedComments = comments;

  // --- Pagination Logic --- 
  const allTopLevelComments = processedComments;
  const totalTopLevelCommentsCount = allTopLevelComments.length;
  const totalPagesCalculated = Math.ceil(totalTopLevelCommentsCount / commentsPerPage);
  
  const indexOfLastTopLevelComment = currentPage * commentsPerPage;
  const indexOfFirstTopLevelComment = indexOfLastTopLevelComment - commentsPerPage;
  const currentTopLevelComments = allTopLevelComments.slice(indexOfFirstTopLevelComment, indexOfLastTopLevelComment);
  
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
    <div 
      className="w-full mt-8 md:mt-12 relative"
    >
      {/* Overlay for readability if background is set - REMOVED */}
      
      {/* All existing content should be wrapped to be above the overlay */}
      <div className="relative z-10">
        {/* New comment box / Edit comment box */} 
        {isAuthenticated ? (
          <motion.div 
            className="mb-6 p-4 rounded-lg bg-transparent border border-white/10 shadow-md" // Transparent BG, border
            variants={itemVariants}
          >
            <div className="flex items-start space-x-3">
              <Avatar className="h-10 w-10 flex-shrink-0"> {/* Slightly larger avatar */} 
                {avatarUrl ? (
                  <AvatarImage 
                    src={avatarUrl} 
                    alt={username || 'მომხმარებელი'} 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <AvatarFallback>
                    <UserCircle className="h-10 w-10 text-white/70" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-grow">
                <Textarea
                  ref={commentBoxRef}
                  value={editingId ? editText : newComment}
                  onChange={(e) => editingId ? setEditText(e.target.value) : setNewComment(e.target.value)}
                  placeholder={editingId ? "კომენტარის რედაქტირება..." : "დაწერეთ კომენტარი..."}
                  className="resize-none mb-3 bg-transparent border-white/20 placeholder:text-white/50 focus:border-purple-500/60 transition-colors duration-150 p-3 rounded-md text-white" // Transparent BG, improved focus
                  rows={editingId || newComment.length > 70 ? 3 : 1} // Dynamic rows
                />
              
                {/* Sticker/Media Preview Area */} 
                {(editingId && editMedia) || (!editingId && selectedSticker) ? (
                  <div className="relative inline-block mb-3 ml-1 group">
                    <div className="relative w-24 h-24 rounded-md overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center">
                      <Image
                        src={editingId ? editMedia! : selectedSticker!.url}
                        alt={editingId ? "მედია" : selectedSticker!.alt}
                        width={96}
                        height={96}
                        className="object-contain max-w-full max-h-full"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={editingId ? handleRemoveEditMedia : handleRemoveSticker}
                      className="absolute -top-2 -right-2 bg-gray-800 rounded-full p-1 border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      title={editingId ? "მედიის წაშლა" : "სტიკერის წაშლა"}
                    >
                      <X className="h-3.5 w-3.5 text-white/80" />
                    </button>
                  </div>
                ) : null}
              
                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={editingId ? toggleEditStickerSelector : toggleStickerSelector}
                      className="h-9 w-9 text-white/70 hover:text-purple-400 hover:bg-purple-500/10 relative"
                      title="სტიკერის დამატება"
                    >
                      <StickyNote className="h-5 w-5" />
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
                    {/* Add more media buttons here if needed */}
                  </div>
                  
                  <div className="flex items-center gap-2">
                      {editingId && (
                          <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={cancelEdit}
                              className="text-white/70 hover:text-white hover:bg-white/10 px-3 py-1.5 h-auto"
                          >
                              გაუქმება
                          </Button>
                      )}
                      <Button 
                        onClick={handlePostOrUpdateComment} 
                        disabled={((editingId ? !editText.trim() && !editMedia : !newComment.trim() && !selectedSticker)) || isSubmitting}
                        className="bg-purple-600 text-white hover:bg-purple-500 transition-colors duration-150 px-4 py-2 h-auto text-sm rounded-md"
                      >
                          {isSubmitting ? 
                            <Loader2 className="h-4 w-4 animate-spin" /> : 
                            editingId ? 'შენახვა' : 'გამოქვეყნება'
                          }
                          {!isSubmitting && <Send className="ml-2 h-4 w-4" />}
                      </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            className="mb-6 border border-white/10 p-6 rounded-lg bg-transparent text-center shadow-sm"
            variants={itemVariants}
          >
            <AlertCircle className="h-8 w-8 mx-auto mb-3 text-purple-400" />
            <p className="text-white mb-3">კომენტარის დასატოვებლად გაიარეთ ავტორიზაცია.</p>
            <Button 
              onClick={() => router.push('/login')}
              className="bg-purple-600 text-white hover:bg-purple-500 transition-colors duration-150"
            >
              ავტორიზაცია
            </Button>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
            <p className="mt-3 text-sm text-white/70">კომენტარები იტვირთება...</p>
          </div>
        ) : currentTopLevelComments.length === 0 ? (
          <motion.div 
            className="text-center py-10 border border-dashed border-white/10 rounded-lg bg-transparent mt-4"
            variants={itemVariants}
          >
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-purple-400/70" />
            <p className="text-white/70">კომენტარები ჯერ არ არის.</p>
            <p className="text-sm text-white/50 mt-1">იყავით პირველი!</p>
            <img src="/images/mascot/no-comments.png" alt="No comments mascot" className="mx-auto mt-4 w-32 h-32" />
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="space-y-5">
            {currentTopLevelComments.map((comment) => (
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                userId={userId}
                avatarUrl={avatarUrl}
                username={username}
                handleLikeCommentOrReply={handleLikeCommentOrReply}
                handleEditComment={handleEditComment}
                handleDeleteCommentRequest={handleDeleteCommentRequest}
                profile={profile}
                itemVariants={itemVariants}
              />
            ))}
          </motion.div>
        )}

        {totalPagesCalculated > 1 && (
          <motion.div 
            className="flex justify-center items-center gap-2 mt-10 pt-4 border-t border-white/10"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="bg-transparent border-white/20 text-white/80 hover:bg-white/5 hover:border-purple-500/50 transition-colors duration-150"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              წინა
            </Button>
            
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPagesCalculated }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "ghost"}
                  size="icon"
                  onClick={() => handlePageChange(page)}
                  className={cn(
                    "h-9 w-9 rounded-md text-sm flex items-center justify-center transition-colors duration-150",
                    currentPage === page 
                      ? "bg-purple-600 text-white font-medium hover:bg-purple-500 shadow-md"
                      : "bg-transparent text-white/70 border border-white/20 hover:bg-white/5 hover:border-purple-500/50 hover:text-white"
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
              className="bg-transparent border-white/20 text-white/80 hover:bg-white/5 hover:border-purple-500/50 transition-colors duration-150"
            >
              შემდეგი
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {commentToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              onClick={cancelActualDelete} // Click outside to cancel
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-gray-900 p-6 rounded-lg shadow-xl border border-gray-700 max-w-sm w-full text-center relative"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
              >
                <button 
                  onClick={cancelActualDelete}
                  className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-700/80 text-gray-400 hover:text-white transition-colors"
                  title="დახურვა"
                >
                  <X className="h-5 w-5" />
                </button>
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">კომენტარის წაშლა</h3>
                <p className="text-sm text-gray-300 mb-6">
                  დარწმუნებული ხართ, რომ გსურთ ამ კომენტარის წაშლა?
                </p>
                <div className="flex justify-center gap-3">
                  <Button 
                    variant="outline"
                    onClick={cancelActualDelete}
                    className="border-gray-600 hover:bg-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-6"
                  >
                    არა
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={confirmActualDelete}
                    className="bg-red-600 hover:bg-red-700 text-white px-6"
                  >
                    დიახ
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div> {/* End of z-10 wrapper */}
    </div>
  )
}

const CommentItem = ({ 
  comment, userId, avatarUrl, username, handleLikeCommentOrReply, handleEditComment, handleDeleteCommentRequest, profile,
  itemVariants
}: { 
  comment: CommentWithDetails; 
  userId: string | null; 
  avatarUrl: string | null; 
  username: string | null;
  handleLikeCommentOrReply: (comment: CommentWithDetails) => void; 
  handleEditComment: (comment: CommentWithDetails) => void; 
  handleDeleteCommentRequest: (comment: CommentWithDetails) => void;
  profile?: UserProfile | null;
  itemVariants?: any;
}) => {
  const isOwnComment = userId && comment.user_id === ensureUUID(userId)
  const [showFullText, setShowFullText] = useState(false);
  const MAX_LENGTH = 200;

  const formattedDate = comment.created_at
    ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ka })
    : 'თარიღი უცნობია';

  const toggleShowFullText = () => {
    setShowFullText(!showFullText);
  };

  const commentBackgroundStyle = comment.user_profile?.vip_status && comment.user_profile?.comment_background_url
    ? { backgroundImage: `url(${comment.user_profile.comment_background_url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
    : {};

  return (
    <motion.div 
      variants={itemVariants} 
      className={cn(
        "p-4 rounded-lg shadow-sm border-2 border-white/10 relative", 
        comment.user_profile?.vip_status ? "border-2 border-yellow-500 dark:border-yellow-400" : "bg-transparent"
      )}
      style={commentBackgroundStyle}
    >
      <div className={cn(
        "absolute inset-0 rounded-lg",
        comment.user_profile?.vip_status && comment.user_profile?.comment_background_url ? "bg-black/30 dark:bg-black/50" : ""
      )}></div>
      
      <div className="relative z-10">
        <div className="flex items-start space-x-3">
          <Link href={`/profile/${comment.user_id}`} className="flex-shrink-0">
            <Avatar className="w-10 h-10 border-2 border-gray-200 dark:border-gray-700">
              {comment.user_profile?.avatar_url ? (
                <AvatarImage 
                  src={comment.user_profile.avatar_url} 
                  alt={comment.user_profile?.username || "მომხმარებელი"} 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <AvatarFallback>
                  {comment.user_profile?.username 
                    ? comment.user_profile.username.charAt(0).toUpperCase() 
                    : <UserCircle size={24} />
                  }
                </AvatarFallback>
              )}
            </Avatar>
          </Link>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <Link href={`/profile/${comment.user_id}`} className="font-semibold text-sm text-white hover:underline">
                {comment.user_profile?.username || " მომხმარებელი"}
              </Link>
              {comment.user_profile?.vip_status && (
                <VIPBadge />
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</span>
            </div>
            
            {/* Restored Comment Text */} 
            {comment.text && (
              <div className="mt-2 text-sm text-white-200 dark:text-gray-300 whitespace-pre-wrap break-words">
                {showFullText || comment.text.length <= MAX_LENGTH 
                  ? comment.text 
                  : `${comment.text.substring(0, MAX_LENGTH)}...`}
                {comment.text.length > MAX_LENGTH && (
                  <button 
                    onClick={toggleShowFullText} 
                    className="text-xs text-blue-500 hover:underline ml-1"
                  >
                    {showFullText ? 'ნაკლების ჩვენება' : 'მეტის ჩვენება'}
                  </button>
                )}
              </div>
            )}

            {/* Restored Media/Sticker Display */} 
            {comment.media_url && (
              <div className="mt-2">
                {comment.media_url.includes('stickers/') || comment.media_url.includes('tenor.com') || comment.media_url.endsWith('.gif') ? (
                  <div className="max-w-[150px] bg-transparent p-0.5 rounded-md inline-block">
                    <Image src={comment.media_url} alt="სტიკერი" width={150} height={150} className="rounded object-contain" />
                  </div>
                ) : (
                  <img src={comment.media_url} alt="მედია" className="rounded-md max-h-[200px] w-auto border border-gray-200 dark:border-gray-700 shadow-sm" />
                )}
              </div>
            )}

            {/* Like Button - Reply Button Removed */} 
            <div className="mt-3 flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLikeCommentOrReply(comment)}
                className={cn(
                  "px-2 py-1 h-auto text-xs flex items-center gap-1 rounded-full transition-colors duration-150",
                  comment.user_has_liked
                    ? "text-purple-600 bg-purple-100 dark:text-purple-300 dark:bg-purple-700/30 hover:bg-purple-200 dark:hover:bg-purple-700/50"
                    : "text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                )}
              >
                <ThumbsUp className={cn("h-3.5 w-3.5", comment.user_has_liked && "fill-purple-600 dark:fill-purple-300")} />
                <span>{comment.like_count || 0}</span>
              </Button>
            </div>
            
            {isOwnComment && (
              <div className="flex space-x-2 mt-2">
                <Button variant="ghost" size="sm" onClick={() => handleEditComment(comment)} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  <Edit size={14} className="mr-1" /> რედაქტირება
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteCommentRequest(comment)} className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                  <Trash2 size={14} className="mr-1" /> წაშლა
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CommentSection; 