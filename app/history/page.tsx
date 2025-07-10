"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, BookOpen, Trash2, History as HistoryIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ReadingProgress, getRecentlyRead, clearReadingHistory } from '@/lib/reading-history';
import { cn } from '@/lib/utils';
import { toast } from 'sonner'; // Using sonner for toasts
import { AppSidebar } from '@/components/app-sidebar'; // Import the sidebar

export default function HistoryPage() {
  const [history, setHistory] = useState<ReadingProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false); // To prevent hydration mismatch

  useEffect(() => {
    setIsClient(true); // Component has mounted
    try {
      const recentHistory = getRecentlyRead(50); // Load up to 50 items
      setHistory(recentHistory);
    } catch (error) {
      console.error("Failed to load reading history:", error);
      toast.error("Failed to load reading history.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleClearHistory = () => {
    try {
      clearReadingHistory();
      setHistory([]); // Clear state immediately
      toast.success("Reading history cleared.");
    } catch (error) {
      console.error("Failed to clear reading history:", error);
      toast.error("Failed to clear reading history.");
    }
  };

  if (!isClient || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <>
      <AppSidebar /> {/* Add the sidebar component */}
      <div className="container mx-auto px-4 py-8 md:pl-24"> {/* Keep padding-left */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <HistoryIcon className="h-7 w-7 text-purple-400" />
            კითხვის ისტორია
          </h1>
          {history.length > 0 && (
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1.5">
                  <Trash2 className="h-4 w-4" />
                  ისტორიის გასუფთავება
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>დარწმუნებული ხართ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    ეს მოქმედება წაშლის თქვენს კითხვის ისტორიას. ამ მოქმედების გაუქმება შეუძლებელია.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>გაუქმება</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistory} className="bg-red-600 hover:bg-red-700">
                    წაშლა
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-16 text-gray-400 flex flex-col items-center">
            <AlertCircle className="h-16 w-16 mb-4 text-gray-600" />
            <p className="text-xl mb-2">ისტორია ცარიელია</p>
            <p className="text-sm">დაიწყეთ მანგას კითხვა, რომ აქ გამოჩნდეს.</p>
            <Link href="/manga">
              <Button className="mt-6 bg-purple-600 hover:bg-purple-700">
                მანგას კითხვის დაწყება
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((item) => (
              <div 
                key={`${item.mangaId}-${item.chapterId}-${item.lastRead}`} 
                className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden shadow-lg flex gap-4 p-4 items-start transition-all hover:border-purple-500/30 hover:bg-purple-900/10"
              >
                <Link href={`/manga/${item.mangaId}?resume=true`}>
                  <div className="w-20 h-28 rounded overflow-hidden flex-shrink-0 relative cursor-pointer group">
                    <Image 
                      src={item.mangaThumbnail || '/placeholder.svg'} 
                      alt={item.mangaTitle}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  </div>
                </Link>
                
                <div className="flex-1 min-w-0">
                  <Link href={`/manga/${item.mangaId}?resume=true`} className="hover:text-purple-400 transition-colors">
                    <h3 className="font-semibold truncate text-lg mb-1">{item.mangaTitle}</h3>
                  </Link>
                  
                  <p className="text-sm text-gray-300 truncate mb-2">
                    {item.chapterTitle}
                  </p>
                  
                  <p className="text-xs text-gray-500 mb-3">
                    ბოლოს წაკითხული: {formatDistanceToNow(new Date(item.lastRead), { addSuffix: true })}
                  </p>
                  
                  <Link href={`/manga/${item.mangaId}?resume=true&page=${item.currentPage}`} className="inline-block">
                    <Button 
                      size="sm" 
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-3 gap-1.5"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      გაგრძელება
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
} 