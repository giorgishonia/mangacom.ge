"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import ContentForm from '@/components/content-form';
import { useAuth } from "@/components/supabase-auth-provider";
import { toast } from "sonner";
import { FiArrowLeft } from "react-icons/fi";
import Link from "next/link";
import { getContentById } from "@/lib/content";
import { Content } from "@/types/content";

export default function EditContentPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const contentId = params.id as string;

  // Check if user is admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/");
      toast.error("You don't have permission to access this page");
    }
  }, [user, authLoading, router]);

  // Fetch content data
  useEffect(() => {
    async function fetchContent() {
      if (!authLoading && user && contentId) {
        try {
          setLoading(true);
          const contentData = await getContentById(contentId);
          if (!contentData) {
            toast.error("Content not found");
            router.push("/admin/content");
            return;
          }
          setContent(contentData);
        } catch (error) {
          console.error("Error fetching content:", error);
          toast.error("Failed to load content");
          router.push("/admin/content");
        } finally {
          setLoading(false);
        }
      }
    }

    fetchContent();
  }, [contentId, user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen bg-black text-white">
        <AppSidebar />
        <main className="flex-1 overflow-x-hidden pl-[77px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-t-2 border-b-2 border-white rounded-full animate-spin mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AppSidebar />
      <main className="flex-1 overflow-x-hidden pl-[77px] p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link
              href="/admin/content"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
            >
              <FiArrowLeft size={16} />
              Back to content list
            </Link>
            <h1 className="text-3xl font-bold">Edit Content</h1>
            <p className="text-gray-400 mt-1">
              Update information for "{content?.title}"
            </p>
          </div>

          {content && (
            <ContentForm initialData={content} isEditing={true} />
          )}
        </div>
      </main>
    </div>
  );
} 