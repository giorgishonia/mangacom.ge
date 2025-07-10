"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusCircle, Pencil, Trash2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import ContentForm from "@/components/content-form";
import { useAuth } from "@/components/supabase-auth-provider";
import { getAllContent, deleteContent, getContentById } from "@/lib/content";
import { supabase } from "@/lib/supabase";

// Add an interface for Character
interface Character {
  id?: string;
  name: string;
  image: string;
  role: string;
  age?: string;
  gender?: string;
}

// Update ContentItem interface to include characters
interface ContentItem {
  id: string;
  title: string;
  type: string;
  status: string;
  genres?: string[];
  characters?: Character[];
  release_year?: number;
  rating?: number;
  [key: string]: any; // For any other properties
}

// Wrapper function to get all content for admin use
async function getAllContentForAdmin() {
  try {
    // Get manga, and comics content and combine them
    const mangaResult = await getAllContent('manga', 100, 0);
    const comicsResult = await getAllContent('comics', 100, 0);
    
    // Extract content arrays or use empty arrays
    const mangaContent = mangaResult?.success ? mangaResult.content || [] : [];
    const comicsContent = comicsResult?.success ? comicsResult.content || [] : [];
    
    // Combine all content types
    return [...mangaContent, ...comicsContent];
  } catch (error) {
    console.error("Failed to fetch all content:", error);
    return [];
  }
}

export default function AdminContentPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const contentId = searchParams ? searchParams.get("id") : null;
  const isNew = searchParams ? searchParams.get("new") === "true" : false;
  
  const [contentList, setContentList] = useState<any[]>([]);
  const [singleContent, setSingleContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(isNew || false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState<ContentItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      if (!authLoading) {
        if (!user) {
          toast.error("You must be logged in to access this page", {
            description: "You must be logged in to access this page",
          });
          router.push("/login");
          return;
        }

        // Enforce admin-only access
        if (!isAdmin) {
          toast.error("Permission Denied", {
            description: "You don't have permission to access this page",
          });
          router.push("/");
          return;
        }

        if (contentId) {
          try {
            const contentData = await getContentById(contentId);
            if (contentData?.success && contentData.content) {
              setSingleContent(contentData.content);
              setEditContent(contentData.content);
              setFormOpen(true);
            } else {
              toast.error("Content not found", {
                description: "The requested content could not be found",
              });
              router.push("/admin/content");
            }
          } catch (error) {
            console.error("Failed to fetch content:", error);
            toast.error("Failed to fetch content details", {
              description: "Failed to fetch content details",
            });
          }
        } else {
          // Load all content if no specific ID is provided
          try {
            const allContent = await getAllContentForAdmin();
            setContentList(allContent);
          } catch (error) {
            console.error("Failed to fetch content list:", error);
            toast.error("Failed to load content list");
          }
        }
        
        setLoading(false);
      }
    }

    checkAuth();
  }, [authLoading, user, contentId, isNew, router]);

  const handleAddContent = () => {
    setEditContent(null);
    setFormOpen(true);
  };

  const handleEditContent = (item: ContentItem) => {
    setEditContent(item);
    setFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    
    try {
      await deleteContent(deleteId);
      setContentList((prevContent) => 
        prevContent.filter((item) => item.id !== deleteId)
      );
      toast.success("Content deleted successfully");
    } catch (error) {
      console.error("Error deleting content:", error);
      toast.error("Failed to delete content");
    } finally {
      setDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  const handleFormClose = (refresh = false) => {
    setFormOpen(false);
    setEditContent(null);
    
    if (refresh) {
      setLoading(true);
      getAllContentForAdmin()
        .then(async (data) => {
          setContentList(data);
          
          const wasCreating = !editContent; 
          if (wasCreating) {
              const newContentTitle = "Newly Added Content";
              const newContentId = "new-id";
              
              console.log("Conceptual: Creating new_content notification for all users for:", newContentTitle);
          }
        })
        .catch((error) => {
          console.error("Error reloading content:", error);
          toast.error("Failed to reload content");
        })
        .finally(() => {
          setLoading(false);
        });
    }
    
    if (contentId) {
      router.push("/admin/content");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">კონტენტის მართვა</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={async () => {
              try {
                const response = await fetch('/api/setup/fix-chapters-schema');
                const data = await response.json();
                
                if (data.success) {
                  toast.success("თავების სქემა წარმატებით გასწორდა");
                } else {
                  toast.error("თავების სქემის გასწორება ვერ მოხერხდა: " + (data.error || "უცნობი შეცდომა"));
                }
              } catch (error) {
                console.error("Error fixing schema:", error);
                toast.error("შეცდომა სქემის გასწორებისას");
              }
            }}
          >
            სქემების გასწორება
          </Button>
          <Button onClick={handleAddContent}>
            <PlusCircle className="mr-2 h-4 w-4" /> კონტენტის დამატება
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !Array.isArray(contentList) || contentList.length === 0 ? (
        <div className="text-center p-10 border rounded-md">
          <p className="text-muted-foreground">კონტენტი ვერ მოიძებნა</p>
          <Button onClick={handleAddContent} className="mt-4">
            <PlusCircle className="mr-2 h-4 w-4" /> კონტენტის დამატება
          </Button>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>სათაური</TableHead>
                <TableHead>ტიპი</TableHead>
                <TableHead>სტატუსი</TableHead>
                <TableHead>ჟანრები</TableHead>
                <TableHead className="text-right">მოქმედებები</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contentList.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    <span className="capitalize">{item.type}</span>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{item.status}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(item.genres) && item.genres.slice(0, 3).map((genre: string, index: number) => (
                        <span 
                          key={index}
                          className="px-2 py-1 text-xs bg-secondary rounded-full"
                        >
                          {genre}
                        </span>
                      ))}
                      {Array.isArray(item.genres) && item.genres.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-secondary rounded-full">
                          +{item.genres.length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <span className="sr-only">მენიუს გახსნა</span>
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 15 15"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                          >
                            <path
                              d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z"
                              fill="currentColor"
                              fillRule="evenodd"
                              clipRule="evenodd"
                            ></path>
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditContent(item)}>
                          <Pencil className="mr-2 h-4 w-4" /> რედაქტირება
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClick(item.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> წაშლა
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editContent ? "კონტენტის რედაქტირება" : "კონტენტის დამატება"}</DialogTitle>
            <DialogDescription>
              {editContent 
                ? "განაახლეთ კონტენტის ინფორმაცია ქვემოთ მოცემულ ფორმაში."
                : "შეავსეთ ქვემოთ მოცემული ფორმა ახალი კონტენტის ბაზაში დასამატებლად."}
            </DialogDescription>
          </DialogHeader>
          <ContentForm 
            initialData={editContent} 
            onSuccess={() => handleFormClose(true)}
            onCancel={() => handleFormClose(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>დარწმუნებული ხართ?</AlertDialogTitle>
            <AlertDialogDescription>
              ეს სამუდამოდ წაშლის ამ კონტენტს და მასთან დაკავშირებულ ყველა მონაცემს, როგორიცაა ეპიზოდები ან თავები.
              ეს ქმედება ვერ იქნება გაუქმებული.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 