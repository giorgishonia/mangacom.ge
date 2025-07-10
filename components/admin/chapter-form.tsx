"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Loader2, Plus, X, ImagePlus, FolderOpen } from "lucide-react";
import { format, isValid } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Form schema for chapter validation
const chapterSchema = z.object({
  number: z.coerce.number().int().positive("Chapter number must be positive"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  thumbnail: z.preprocess(
    // Preprocess: Convert null/undefined/whitespace to empty string
    (val) => (typeof val === 'string' ? val.trim() : ''),
    // Base validation: Must be a string
    z.string()
      .refine(
        // Refine: Must be empty or a valid URL
        (val) => val === '' || val.startsWith('http://') || val.startsWith('https://'),
        { message: "Thumbnail must be empty or a valid URL starting with http:// or https://" }
      )
  ).optional(), // Make the entire processed field optional
  pages: z.array(z.string().url("Invalid page URL")).min(1, "At least one page is required"),
  releaseDate: z.date().optional(),
});

type ChapterFormValues = z.infer<typeof chapterSchema>;

type ChapterFormProps = {
  initialData?: any;
  contentId: string;
  contentType?: 'manga' | 'comics';
  onSuccess: () => void;
  onCancel: () => void;
};

export default function ChapterForm({
  initialData,
  contentId,
  contentType,
  onSuccess,
  onCancel,
}: ChapterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newPageUrl, setNewPageUrl] = useState("");
  const [serviceRoleKey, setServiceRoleKey] = useState("");
  const [showServiceKeyInput, setShowServiceKeyInput] = useState(false);
  const [cloudinaryFolder, setCloudinaryFolder] = useState("");
  const [isLoadingCloudinary, setIsLoadingCloudinary] = useState(false);
  const [cloudinaryImages, setCloudinaryImages] = useState<Array<{id: string, url: string, filename: string}>>([]);
  
  // Set default values for the form
  const defaultValues = initialData ? {
    ...initialData,
    // Convert any string dates to Date objects with validation
    releaseDate: initialData.releaseDate ? (() => {
      const date = new Date(initialData.releaseDate);
      return isValid(date) ? date : undefined;
    })() : undefined,
    // Ensure number fields are numbers
    number: Number(initialData.number),
    // Ensure pages is an array
    pages: Array.isArray(initialData.pages) ? initialData.pages : [],
  } : {
    number: 1,
    title: "",
    description: "",
    thumbnail: "",
    pages: [],
    releaseDate: undefined,
  };

  const form = useForm<ChapterFormValues>({
    resolver: zodResolver(chapterSchema),
    defaultValues,
  });

  const watchedPages = form.watch("pages");

  useEffect(() => {
    // Load saved service role key from localStorage, if any
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('serviceRoleKey');
      if (savedKey) {
        setServiceRoleKey(savedKey);
      }
    }
  }, []);

  const saveServiceRoleKey = () => {
    if (typeof window !== 'undefined') {
      if (serviceRoleKey) {
        localStorage.setItem('serviceRoleKey', serviceRoleKey);
        toast.success('Service role key saved');
        setShowServiceKeyInput(false);
      } else {
        // If empty, remove the key
        localStorage.removeItem('serviceRoleKey');
        toast.success('Service role key removed');
      }
    }
  };

  const handleAddPage = () => {
    if (!newPageUrl) return;
    
    // Basic URL validation
    try {
      new URL(newPageUrl);
      form.setValue("pages", [...watchedPages, newPageUrl]);
      setNewPageUrl("");
    } catch (error) {
      toast.error("Please enter a valid URL");
    }
  };

  const handleRemovePage = (index: number) => {
    const updatedPages = [...watchedPages];
    updatedPages.splice(index, 1);
    form.setValue("pages", updatedPages);
  };

  const handleReorderPage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === watchedPages.length - 1)
    ) {
      return;
    }
    
    const updatedPages = [...watchedPages];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const [movedPage] = updatedPages.splice(index, 1);
    updatedPages.splice(newIndex, 0, movedPage);
    
    form.setValue("pages", updatedPages);
  };

  const fetchCloudinaryImages = async () => {
    if (!cloudinaryFolder.trim()) {
      toast.error("Please enter a Cloudinary folder name");
      return;
    }

    setIsLoadingCloudinary(true);
    setCloudinaryImages([]);
    
    try {
      // Normalize folder name by removing leading/trailing slashes and spaces
      const normalizedFolder = cloudinaryFolder.trim().replace(/^\/|\/$/g, "");
      console.log("Fetching images from folder:", normalizedFolder);
      
      const response = await fetch(`/api/cloudinary?folder=${encodeURIComponent(normalizedFolder)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || "Failed to fetch images from Cloudinary");
      }

      const { images } = await response.json();
      setCloudinaryImages(images || []);
      
      if (!images || images.length === 0) {
        toast.warning(`No images found in "${normalizedFolder}". Check folder name and case sensitivity.`);
      } else {
        toast.success(`Found ${images.length} images`);
      }
    } catch (error) {
      console.error("Error fetching Cloudinary images:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch images");
    } finally {
      setIsLoadingCloudinary(false);
    }
  };

  const handleAddAllCloudinaryImages = () => {
    if (cloudinaryImages.length === 0) {
      toast.warning("No Cloudinary images to add");
      return;
    }

    // Add all Cloudinary image URLs to the pages array
    const imageUrls = cloudinaryImages.map(img => img.url);
    form.setValue("pages", [...watchedPages, ...imageUrls]);
    toast.success(`Added ${imageUrls.length} images to pages`);
  };

  const onSubmit = async (data: ChapterFormValues) => {
    setIsLoading(true);
    
    try {
      // DEVELOPMENT MODE BYPASS - Skip admin check in development
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        console.log("DEVELOPMENT MODE: Bypassing admin check for chapters");
        // Continue with chapter submission without admin check
      } else {
        // Check admin status first before trying to submit
        const adminCheck = await fetch('/api/admin/check', {
          method: 'GET',
          credentials: 'include',
        });
        
        const adminCheckData = await adminCheck.json();
        if (!adminCheckData.isAdmin) {
          toast.error("Admin privileges required to manage chapters");
          setIsLoading(false);
          return;
        }
      }
      
      // Process pages to ensure they're in correct order
      const processedPages = [...data.pages];
      
      // Ensure thumbnail is a valid URL or empty string
      let thumbnail = data.thumbnail?.trim() || '';
      if (thumbnail && !(thumbnail.startsWith('http://') || thumbnail.startsWith('https://'))) {
        thumbnail = ''; // Reset invalid URLs to empty string
      }
      
      const chapterData = {
        contentId: contentId,
        number: data.number,
        title: data.title || `Chapter ${data.number}`, // Provide default title if empty
        pages: processedPages,
        release_date: data.releaseDate || null,
        thumbnail: thumbnail,
      };
      
      console.log("Submitting chapter data:", chapterData);
      
      // Check if service role key is available in localStorage
      const serviceRoleKey = typeof window !== 'undefined' ? localStorage.getItem('serviceRoleKey') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add service role key if available
      if (serviceRoleKey) {
        headers['x-supabase-service-role'] = serviceRoleKey;
      }
      
      const response = await fetch('/api/chapters' + (initialData ? `?id=${initialData.id}` : ''), {
        method: initialData ? 'PUT' : 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(chapterData),
      });
      
      if (response.status === 401) {
        toast.error("Authentication required. Please log in again.");
        setIsLoading(false);
        return;
      }
      
      if (response.status === 403) {
        toast.error("You don't have admin privileges to manage chapters.");
        setIsLoading(false);
        return;
      }
      
      if (!response.ok) {
        // Try to parse error JSON
        let errorData: any;
        try {
          errorData = await response.json();
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
        
        let displayErrorMessage = 'Failed to save chapter'; // Default message

        if (errorData) {
          if (typeof errorData.error === 'string') {
            displayErrorMessage = errorData.error;
          } else if (typeof errorData.error === 'object' && errorData.error !== null && typeof errorData.error.message === 'string') {
            displayErrorMessage = errorData.error.message;
          } else if (typeof errorData.message === 'string') { // Fallback for errors that have a top-level message
            displayErrorMessage = errorData.message;
          }

          if (errorData.details) {
            try {
              const detailsString = JSON.stringify(errorData.details);
              displayErrorMessage += ` (Details: ${detailsString})`;
            } catch (stringifyError) {
              console.error("Failed to stringify error details:", stringifyError);
              // Optionally append a generic details error: displayErrorMessage += ' (Could not parse details)';
            }
          }
        }
        throw new Error(displayErrorMessage);
      } else {
        // Parse successful response
        const data = await response.json();
        toast.success(`Chapter ${data.number || ''} ${initialData ? 'updated' : 'created'} successfully`);
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
      toast.error(error instanceof Error ? error.message : "Failed to save chapter");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chapter Number *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="1" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  The chapter number in the series
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="releaseDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Release Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value && isValid(field.value) ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  The date when this chapter was released
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="Enter chapter title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter chapter description" 
                  rows={3}
                  {...field}
                  value={field.value || ""} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="thumbnail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thumbnail URL</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://example.com/thumbnail.jpg" 
                  {...field}
                  value={field.value || ""} 
                />
              </FormControl>
              <FormDescription>
                URL for the chapter thumbnail image
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="pages"
          render={() => (
            <FormItem>
              <FormLabel>Pages *</FormLabel>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/page1.jpg"
                    value={newPageUrl}
                    onChange={(e) => setNewPageUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddPage}
                    variant="secondary"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                
                {/* Cloudinary Integration */}
                <div className="border border-dashed border-accent p-4 rounded-md bg-secondary/10">
                  <h4 className="text-sm font-medium mb-2 flex items-center">
                    <FolderOpen className="h-4 w-4 mr-1 text-accent" />
                    Import from Cloudinary
                  </h4>
                  <div className="flex flex-col gap-2 mb-3">
                    <Input
                      placeholder="Enter Cloudinary folder name (e.g., berserk/chapter1)"
                      value={cloudinaryFolder}
                      onChange={(e) => setCloudinaryFolder(e.target.value)}
                      className="w-full"
                    />
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span className="italic">
                        Format examples: "berserk/chapter1", "manga/one-piece/ch1"
                      </span>
                    </div>
                    <Button 
                      type="button" 
                      onClick={fetchCloudinaryImages}
                      variant="outline"
                      disabled={isLoadingCloudinary}
                      className="w-full"
                    >
                      {isLoadingCloudinary ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Searching...</>
                      ) : (
                        <>Find Images</>
                      )}
                    </Button>
                  </div>
                  
                  {cloudinaryImages.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Found {cloudinaryImages.length} images in folder "{cloudinaryFolder}"
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAddAllCloudinaryImages}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add All Images to Pages
                      </Button>
                      <ScrollArea className="h-32 border rounded-md p-2 mt-2">
                        <div className="space-y-1">
                          {cloudinaryImages.map((image, index) => (
                            <div 
                              key={image.id}
                              className="flex items-center justify-between bg-secondary/10 p-1 rounded text-xs"
                            >
                              <div className="truncate flex-1">{image.filename}</div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  form.setValue("pages", [...watchedPages, image.url]);
                                  toast.success("Added image to pages");
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
                
                {watchedPages.length > 0 ? (
                  <ScrollArea className="h-64 border rounded-md p-2">
                    <div className="space-y-2">
                      {watchedPages.map((page, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between bg-secondary/20 p-2 rounded-md"
                        >
                          <div className="flex items-center gap-2 flex-1 overflow-hidden">
                            <div className="bg-background rounded-md p-1 flex-shrink-0">
                              <ImagePlus className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="text-sm truncate">{page}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleReorderPage(index, 'up')}
                              disabled={index === 0}
                            >
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 15 15"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                              >
                                <path
                                  d="M7.5 3C7.77614 3 8 3.22386 8 3.5V11.2929L10.1464 9.14645C10.3417 8.95118 10.6583 8.95118 10.8536 9.14645C11.0488 9.34171 11.0488 9.65829 10.8536 9.85355L7.85355 12.8536C7.75979 12.9473 7.63261 13 7.5 13C7.36739 13 7.24021 12.9473 7.14645 12.8536L4.14645 9.85355C3.95118 9.65829 3.95118 9.34171 4.14645 9.14645C4.34171 8.95118 4.65829 8.95118 4.85355 9.14645L7 11.2929V3.5C7 3.22386 7.22386 3 7.5 3Z"
                                  fill="currentColor"
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  transform="rotate(180 7.5 7.5)"
                                ></path>
                              </svg>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleReorderPage(index, 'down')}
                              disabled={index === watchedPages.length - 1}
                            >
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 15 15"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                              >
                                <path
                                  d="M7.5 3C7.77614 3 8 3.22386 8 3.5V11.2929L10.1464 9.14645C10.3417 8.95118 10.6583 8.95118 10.8536 9.14645C11.0488 9.34171 11.0488 9.65829 10.8536 9.85355L7.85355 12.8536C7.75979 12.9473 7.63261 13 7.5 13C7.36739 13 7.24021 12.9473 7.14645 12.8536L4.14645 9.85355C3.95118 9.65829 3.95118 9.34171 4.14645 9.14645C4.34171 8.95118 4.65829 8.95118 4.85355 9.14645L7 11.2929V3.5C7 3.22386 7.22386 3 7.5 3Z"
                                  fill="currentColor"
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                ></path>
                              </svg>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleRemovePage(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-center h-20 border rounded-md">
                    <p className="text-sm text-muted-foreground">No pages added yet</p>
                  </div>
                )}
                
                {watchedPages.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {watchedPages.length} page{watchedPages.length !== 1 && "s"} added
                  </p>
                )}
                
                <FormMessage />
              </div>
              <FormDescription>
                Add URLs for each page of the chapter (in order)
              </FormDescription>
            </FormItem>
          )}
        />
        
        <div className="flex justify-between mt-8">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setShowServiceKeyInput(!showServiceKeyInput)}
              size="sm"
            >
              {showServiceKeyInput ? "Hide API Key" : "API Key"}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="animate-pulse">Saving...</span>
                </>
              ) : (
                <>{initialData ? 'Update' : 'Create'} Chapter</>
              )}
            </Button>
          </div>
        </div>

        {showServiceKeyInput && (
          <div className="mt-4 p-4 border border-dashed border-gray-700 rounded-md bg-black/20">
            <p className="text-sm mb-2 text-yellow-300">Admin Service Role Key</p>
            <div className="flex gap-2">
              <Input
                type="password"
                value={serviceRoleKey || ''}
                onChange={(e) => setServiceRoleKey(e.target.value)}
                placeholder="Enter Supabase service role key"
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={saveServiceRoleKey}
                variant="secondary"
                size="sm"
              >
                Save Key
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Only for admin use. This key is stored locally and used for authenticated API access.
            </p>
          </div>
        )}
      </form>
    </Form>
  );
} 