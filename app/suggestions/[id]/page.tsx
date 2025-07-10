"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowUp, Calendar, ArrowLeft, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/components/supabase-auth-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import {
  getSuggestionById,
  toggleVote,
  getCommentsBySuggestionId,
  addComment,
  SuggestionComment,
  deleteComment,
  Suggestion,
} from "@/lib/feedback";

export default function SuggestionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [comments, setComments] = useState<SuggestionComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    loadSuggestion();
    loadComments();
  }, [params.id, user?.id]);

  const loadSuggestion = async () => {
    try {
      const suggestionData = await getSuggestionById(params.id, user?.id);
      setSuggestion(suggestionData);
    } catch (error) {
      console.error("Error loading suggestion:", error);
      toast.error("Failed to load suggestion");
    } finally {
      setIsLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const commentsData = await getCommentsBySuggestionId(params.id);
      setComments(commentsData);
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Failed to load comments");
    }
  };

  const handleVote = async () => {
    if (!user) {
      toast.error("You must be signed in to vote");
      return;
    }

    if (!suggestion) return;

    try {
      await toggleVote(suggestion.id, user.id);
      setSuggestion((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          vote_count: prev.has_voted ? prev.vote_count - 1 : prev.vote_count + 1,
          has_voted: !prev.has_voted,
        };
      });
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Could not register your vote");
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be signed in to comment");
      return;
    }

    if (!commentText.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      setIsSubmittingComment(true);
      await addComment({
        suggestionId: params.id,
        userId: user.id,
        content: commentText,
      });

      setCommentText("");
      toast.success("Comment added");
      loadComments(); // Reload comments to show the new one
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error("Failed to submit comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const result = await deleteComment(commentId, user.id);
      if (result.success) {
        toast.success("Comment deleted");
        // Remove comment from state
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } else {
        toast.error(result.error || "Failed to delete comment");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  // TypeBadge component
  const TypeBadge = ({ type }: { type: string }) => {
    const typeBadgeColors: Record<string, string> = {
      anime: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      manga: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      sticker: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      feature: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      bug: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      gif: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    };

    const badgeColor = typeBadgeColors[type] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    const badgeClass = `inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${badgeColor}`;

    return (
      <span className={badgeClass}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 px-4 sm:px-6 py-6 container pl-[80px]">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to suggestions
        </Button>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !suggestion ? (
          <div className="text-center py-12 border rounded-lg bg-muted/30">
            <h3 className="text-lg font-medium">Suggestion not found</h3>
            <p className="text-muted-foreground mt-1">
              The suggestion you're looking for doesn't exist or has been removed
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-4 p-6 border rounded-lg shadow-sm mb-6">
              <div className="flex flex-col items-center gap-1 pt-1">
                <Button
                  variant={suggestion.has_voted ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleVote}
                  disabled={!user}
                >
                  <ArrowUp className="h-4 w-4" />
                  <span className="sr-only">Vote</span>
                </Button>
                <span className="text-sm font-medium">{suggestion.vote_count}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <h1 className="font-semibold text-2xl">{suggestion.title}</h1>
                  <TypeBadge type={suggestion.type} />
                </div>

                <p className="mb-4 whitespace-pre-line">{suggestion.description}</p>

                <div className="flex items-center gap-2 mt-4">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={suggestion.user?.image || ""} alt="Author" />
                    <AvatarFallback>
                      {suggestion.user?.name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {suggestion.user?.name || suggestion.user?.username || "Anonymous"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {formatDistanceToNow(new Date(suggestion.created_at), {
                        addSuffix: true,
                        locale: ka
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-semibold mb-4">Comments</h2>
            <Separator className="mb-6" />

            {user ? (
              <form onSubmit={handleSubmitComment} className="mb-8">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[100px] mb-2"
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmittingComment || !commentText.trim()}>
                    {isSubmittingComment ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="p-4 mb-6 bg-muted/30 rounded-lg text-center">
                <p>Sign in to add a comment</p>
              </div>
            )}

            {comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={comment.user?.image || ""} alt="Commenter" />
                        <AvatarFallback>
                          {comment.user?.name?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {comment.user?.name || comment.user?.username || "Anonymous"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: ka
                        })}
                      </span>
                    </div>

                    <p className="whitespace-pre-line">{comment.content}</p>

                    {user && user.id === comment.user.id && (
                      <div className="flex justify-end mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive/80"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 