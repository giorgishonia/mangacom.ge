"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import ContentForm from "@/app/components/admin/content-form";
import { useAuth } from "@/components/supabase-auth-provider";
import { toast } from "sonner";

export default function NewContentPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAdmin } = useAuth();

  // Check if user is admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/");
      toast.error("You don't have permission to access this page");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
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
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Add New Content</h1>
              <p className="text-gray-400 mt-1">Create a new anime or manga entry</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white"
            >
              ← Back to Content
            </button>
          </div>

          <ContentForm mode="create" />
        </div>
      </main>
    </div>
  );
} 