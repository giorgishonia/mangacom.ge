"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion as m, AnimatePresence } from "framer-motion";
import { Search, X, BookOpen, ArrowRight, Check, Users, PlusCircle, Trash2, Book } from "lucide-react";
import { useRouter } from "next/navigation";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { createContent, updateContent } from "@/lib/content";
import { cn } from "@/lib/utils";
import { getMangaById, searchAniList } from "@/lib/anilist";

// ჟანრების სიის განსაზღვრა
const genreOptions = [
  { label: "აქშენი", value: "action" },
  { label: "სათავგადასავლო", value: "adventure" },
  { label: "კომედია", value: "comedy" },
  { label: "დრამა", value: "drama" },
  { label: "ფენტეზი", value: "fantasy" },
  { label: "საშინელება", value: "horror" },
  { label: "საიდუმლოება", value: "mystery" },
  { label: "რომანტიკა", value: "romance" },
  { label: "მეცნიერული ფანტასტიკა", value: "sci-fi" },
  { label: "ცხოვრების ნაჭერი", value: "slice-of-life" },
  { label: "სპორტი", value: "sports" },
  { label: "ზებუნებრივი", value: "supernatural" },
  { label: "თრილერი", value: "thriller" },
];


// Define Character type
type Character = {
  id?: string;
  name: string;
  image: string;
  role: string;
  age?: string;
  gender?: string;
};

// Define extended schema with georgian title
const contentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  georgianTitle: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["manga", "comics"], {
    required_error: "Content type is required",
  }),
  status: z.enum(["ongoing", "completed", "hiatus"], {
    required_error: "Status is required",
  }),
  thumbnail: z.string().min(1, "Thumbnail URL is required"),
  bannerImage: z.string().optional(),
  logo: z.string().optional(),
  genres: z.array(z.string()).min(1, "At least one genre is required"),
  alternativeTitles: z.array(z.string()).optional(),
  releaseYear: z.number().optional(),
  anilistId: z.string().optional(),
  season: z.string().optional(),
  rating: z.number().min(0).max(10).optional(),
  publisher: z.string().optional(),
  characters: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, "Character name is required"),
      image: z.string().min(1, "Character image URL is required"),
      role: z.string().min(1, "Character role is required"),
      age: z.string().optional(),
      gender: z.string().optional(),
    })
  ).optional(),
});

type ContentFormValues = z.infer<typeof contentFormSchema>;

interface SearchResult {
  id: number;
  title: string;
  image: string;
  type: "anime" | "manga" | "comics";
  year?: number;
  publisher?: string;
}

interface ComicVineResult {
  id: number;
  name: string;
  image: {
    original_url: string;
    medium_url?: string;
    screen_url?: string;
    small_url?: string;
  };
  description: string;
  start_year?: string;
  publisher?: {
    name: string;
  };
  volume_count?: number;
  issue_count?: number;
  characters?: Array<{
    id: number;
    name: string;
    role?: string;
    gender?: string;
    age?: string;
    realName?: string;
    aliases?: string;
    image?: string;
    imageUrls?: {
      original?: string;
      medium?: string;
      screen?: string;
      small?: string;
    };
  }>;
}

type ContentFormProps = {
  initialData?: any;
  onSuccess: (content?: any) => void;
  onCancel: () => void;
};

// Define ContentType for internal use
type ContentType = "anime" | "manga" | "comics";

// Simple debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function ContentForm({
  initialData,
  onSuccess,
  onCancel,
}: ContentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchType, setSearchType] = useState<"manga" | "comics">("manga");
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  // Process initialData to handle characters and special fields
  const processedInitialData = useMemo(() => {
    if (!initialData) return null;
    
    // Create a copy of the initialData to avoid modifying the original
    const processed = { ...initialData };
    
    // Ensure characters array exists
    if (processed.characters === undefined) {
      // Characters array might be directly present or needs to be extracted
      processed.characters = [];
      
      // Extract characters from alternative_titles if present
      if (processed.alternative_titles && Array.isArray(processed.alternative_titles)) {
        const characterEntries = processed.alternative_titles.filter((title: string) => 
          typeof title === 'string' && title.startsWith('character:')
        );
        
        if (characterEntries.length > 0) {
          try {
            const extractedCharacters = characterEntries.map((entry: string) => {
              const jsonStr = entry.substring(10); // 'character:'.length = 10
              return JSON.parse(jsonStr);
            });
            processed.characters = extractedCharacters;
            console.log(`Extracted ${extractedCharacters.length} characters from alternative_titles`);
          } catch (err) {
            console.error('Error extracting characters from alternative_titles:', err);
          }
        }
      }
    }
    
    // Ensure there's at least one empty character if editing
    if (initialData.id && (!processed.characters || processed.characters.length === 0)) {
      console.log('Adding default empty character for editing');
      processed.characters = [{ name: "", image: "", role: "SUPPORTING" }];
    }
    
    // Extract georgian title from alternative_titles if not directly present
    if (!processed.georgianTitle && processed.alternative_titles && Array.isArray(processed.alternative_titles)) {
      const georgianTitleEntry = processed.alternative_titles.find((title: string) => 
        typeof title === 'string' && title.startsWith('georgian:')
      );
      
      if (georgianTitleEntry) {
        processed.georgianTitle = georgianTitleEntry.substring(9); // 'georgian:'.length = 9
        console.log('Extracted georgian title from alternative_titles');
      }
    }
    
    return processed;
  }, [initialData]);
  
  // Minimal default values
  const defaultValues = processedInitialData ? {
    title: processedInitialData.title || "",
    georgianTitle: processedInitialData.georgianTitle || processedInitialData.georgian_title || "",
    description: processedInitialData.description || "",
    type: processedInitialData.type === 'anime' ? 'manga' : (processedInitialData.type || "manga"),
    status: processedInitialData.status || "ongoing",
    thumbnail: processedInitialData.thumbnail || "",
    bannerImage: processedInitialData.bannerImage || processedInitialData.banner_image || "",
    logo: processedInitialData.logo || "",
    genres: processedInitialData.genres || [],
    alternativeTitles: processedInitialData.alternativeTitles || [],
    releaseYear: processedInitialData.releaseYear || processedInitialData.release_year || undefined,
    anilistId: processedInitialData.anilistId ? 
      processedInitialData.anilistId.toString() : 
      (processedInitialData.anilist_id ? processedInitialData.anilist_id.toString() : undefined),
    season: processedInitialData.season || undefined,
    rating: processedInitialData.rating || undefined,
    publisher: processedInitialData.publisher || "",
    characters: processedInitialData.characters || [],
  } : {
    title: "",
    georgianTitle: "",
    description: "",
    type: "manga" as const,
    status: "ongoing" as const,
    thumbnail: "",
    bannerImage: "",
    logo: "",
    genres: [],
    alternativeTitles: [],
    releaseYear: undefined,
    anilistId: undefined,
    season: undefined,
    rating: undefined,
    publisher: "",
    characters: [],
  };

  // Log what characters we're initializing with
  useEffect(() => {
    if (defaultValues.characters && defaultValues.characters.length > 0) {
      console.log(`Form initialized with ${defaultValues.characters.length} characters:`, 
        defaultValues.characters);
    }
  }, [defaultValues.characters]);

  const form = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema),
    defaultValues,
  });

  // Add after other state variables
  const debouncedSearch = useRef(
    debounce(async (query: string, type: "manga" | "comics") => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        // Use different API depending on content type
        if (type === "comics") {
          // Use Comic Vine API for comics
          const response = await fetch(`/api/comic-search?query=${encodeURIComponent(query)}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch comics data');
          }
          
          const data = await response.json();
          
          if (data.results && data.results.length > 0) {
            setSearchResults(data.results.map((comic: any) => ({
              id: comic.id,
              title: comic.name,
              image: comic.image?.original_url || "",
              type: "comics",
              year: comic.start_year ? parseInt(comic.start_year) : undefined,
              publisher: comic.publisher?.name || "Unknown Publisher"
            })));
          } else {
            setSearchResults([]);
          }
        } else {
          // Use AniList for manga (assuming it now only takes query)
          const results = await searchAniList(query);
          
          if (results && results.length > 0) {
            setSearchResults(results.map((item: {
              id: number;
              title: { english: string; romaji: string };
              coverImage: { medium: string };
              seasonYear?: number;
              startDate?: { year: string | number };
              type: string;
            }) => ({
              id: item.id,
              title: item.title.english || item.title.romaji,
              image: item.coverImage.medium,
              type: "manga",
              year: item.seasonYear || (item.startDate?.year ? parseInt(item.startDate.year.toString()) : undefined)
            })));
          } else {
            setSearchResults([]);
          }
        }
      } catch (error) {
        console.error(`Error searching ${type}:`, error);
        toast.error(`Failed to search ${type === "comics" ? "Comic Vine" : "AniList"}`);
      } finally {
        setIsSearching(false);
      }
    }, 300)
  ).current;
  
  // Replace the handleSearch function with this:
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    debouncedSearch(searchQuery, searchType);
  };
  
  // Add an effect to trigger search when query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      debouncedSearch(searchQuery, searchType);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchType, debouncedSearch]);

  const onSubmit = async (data: ContentFormValues) => {
    setIsLoading(true);
    
    try {
      console.log("Form submission started");
      
      // Process form data
      const contentData: any = {
        title: data.title,
        description: data.description,
        type: data.type,
        status: data.status,
      };
      
      // Process genres
      if (data.genres?.length > 0) {
        contentData.genres = data.genres;
      } else {
        contentData.genres = [];
      }
      
      // Process thumbnail
      if (data.thumbnail) {
        contentData.thumbnail = data.thumbnail;
      }
      
      // Process alternative titles
      if (data.alternativeTitles && data.alternativeTitles.length > 0) {
        contentData.alternative_titles = data.alternativeTitles;
      }
      
      // Process release year
      if (data.releaseYear) {
        contentData.release_year = data.releaseYear;
      }
      
      // Process rating
      if (data.rating !== undefined) {
        contentData.rating = parseFloat(data.rating.toString());
      }
      
      // Process banner image
      if (data.bannerImage) {
        contentData.banner_image = data.bannerImage;
      }
      
      // Process logo image
      if (data.logo) {
        contentData.logo = data.logo;
      }
      
      // Process season
      if (data.season) {
        contentData.season = data.season;
      }
      
      // Process georgian title
      if (data.georgianTitle) {
        contentData.georgian_title = data.georgianTitle;
      }
      
      // Process anilist ID
      if (data.anilistId) {
        contentData.anilist_id = data.anilistId;
      }
      
      // Process publisher for comics
      if (data.type === "comics" && data.publisher) {
        contentData.publisher = data.publisher;
      }
      
      // Process characters
      const characters = data.characters || [];
      if (characters.length > 0) {
        contentData.characters = characters;
      }
      
      console.log("Final content data:", contentData);
      
      let result;
      
      // Update existing content or create new content
      if (initialData?.id) {
        console.log(`Updating existing content with ID: ${initialData.id}`);
        result = await updateContent(initialData.id, contentData);
        console.log("Update result:", result);
        
        if (!result) {
          throw new Error("No response received from update operation");
        }
        
        if (!result.success) {
          throw new Error(result.error || "Content update failed");
        }
        
        // Show success message
        toast.success("Content updated successfully");
        router.refresh();
        
        // Call onSuccess callback with the updated content
        if (onSuccess) {
          onSuccess(result.content);
        }
      } else {
        console.log("Creating new content");
        result = await createContent(contentData);
        console.log("Create result:", result);
        
        if (!result) {
          throw new Error("No response received from create operation");
        }
        
        if (!result.success) {
          throw new Error(result.error || "Content creation failed");
        }
        
        // Show success message
        toast.success("Content created successfully");
        router.refresh();
        
        // If in modal mode, call the onSuccess callback, otherwise redirect
        if (onSuccess) {
          onSuccess(result.content);
        } else if (result.content) {
          router.push(`/${result.content.type.toLowerCase()}/${result.content.id}`);
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Open search modal
  const handleOpenSearch = () => {
    setSearchModalOpen(true);
    setSearchQuery("");
    setSearchResults([]);
    
    // Focus the search input after modal is opened
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  // Select AniList search result and populate form
  const handleSelectResult = async (
    contentType: ContentType,
    result: SearchResult | ComicVineResult
  ) => {
    setIsLoading(true);
    try {
      console.log(`Selected ${contentType} result:`, result);
      
      // For comics, get additional details including characters
      if (contentType === "comics") {
        const comicId = (result as ComicVineResult).id;
        console.log(`Fetching additional details for comic ID: ${comicId}`);
        
        const response = await fetch(`/api/comic-search/${comicId}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching comic details: ${response.statusText}`);
        }
        
        const comicData = await response.json();
        console.log("Comic details:", comicData);
        
        // Set form values from comic data
        form.setValue("title", comicData.name || "");
        form.setValue("description", stripHtml(comicData.description || ""));
        
        if (comicData.image) {
          form.setValue("thumbnail", comicData.image.original_url || comicData.image.medium_url || "");
        }
        
        if (comicData.start_year) {
          form.setValue("releaseYear", parseInt(comicData.start_year) || undefined);
        }
        
        // Set publisher as additional info
        if (comicData.publisher) {
          form.setValue("publisher", comicData.publisher.name || "");
        }
        
        // Process characters (limited to first 10)
        if (comicData.characters && comicData.characters.length > 0) {
          const processedCharacters = comicData.characters.slice(0, 10).map((character: any) => {
            let characterImage = character.image?.original_url || character.image?.medium_url || character.image?.screen_url || character.image?.small_url || "";
            
            let genderString = "unspecified";
            if (character.gender === 1) genderString = "Male";
            else if (character.gender === 2) genderString = "Female";
            // Add other mappings if Comic Vine has more gender codes

            return {
              name: character.name || "Unknown Character",
              image: characterImage,
              role: "SUPPORTING", // Default role, can be refined if API provides more detail
              gender: genderString,
              age: character.age || "", // Comic Vine might not provide age consistently
            };
          });
          
          form.setValue("characters", processedCharacters);
        }
        
        toast.success(`Successfully imported data for "${comicData.name}" from Comic Vine!`);
        setSearchModalOpen(false); // Close modal on success
      } else {
        // Handle manga from AniList
        const aniListId = result.id.toString();
        let details;

        details = await getMangaById(aniListId);

        if (details) {
          form.setValue("title", details.title.english || details.title.romaji || "");
          form.setValue("description", stripHtml(details.description || ""));
          form.setValue("thumbnail", details.coverImage.large || details.coverImage.extraLarge || "");
          form.setValue("bannerImage", details.bannerImage || "");
          form.setValue("logo", details.logo || "");
          form.setValue("genres", details.genres || []);
          form.setValue("status", mapAniListStatus(details.status || ""));
          form.setValue("releaseYear", details.startDate?.year || undefined);
          form.setValue("anilistId", details.id.toString());
          form.setValue("season", details.season || undefined);
          form.setValue("rating", details.averageScore ? parseFloat((details.averageScore / 10).toFixed(1)) : undefined);
          
          // Populate alternative titles if available
          const altTitles = [];
          if (details.title.native) altTitles.push(details.title.native);
          // You might want to add more sources for alternative titles if available from AniList API
          form.setValue("alternativeTitles", altTitles);

          // Process characters from AniList (first 10)
          if (details.characters && details.characters.nodes) {
            const aniListCharacters = details.characters.nodes.slice(0, 10).map((char: any) => ({
              name: char.name?.full || "Unnamed Character",
              image: char.image?.large || char.image?.medium || "",
              role: char.role || "SUPPORTING", // AniList role should map directly or use SUPPORTING as fallback
              age: char.age || "", // AniList might provide age as a string
              gender: char.gender || "unspecified", // AniList gender, might need mapping if not direct string
            }));
            form.setValue("characters", aniListCharacters);
          }

          toast.success(`Successfully imported data for "${details.title.english || details.title.romaji}" from AniList!`);
          setSearchModalOpen(false); // Close modal on success
        } else {
          toast.error(`Failed to fetch details for ${contentType} from AniList.`);
        }
      }
    } catch (error) {
      console.error(`Error handling ${contentType} selection:`, error);
      toast.error(`Failed to process ${contentType} data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setSearchResults([]);
      setSearchQuery("");
    }
  };
  
  // Helper function to strip HTML tags from description
  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };
  
  // Map AniList status to our status format
  const mapAniListStatus = (status: string) => {
    const statusMap: Record<string, "ongoing" | "completed" | "hiatus"> = {
      "RELEASING": "ongoing",
      "FINISHED": "completed",
      "HIATUS": "hiatus",
      "CANCELLED": "completed",
      "NOT_YET_RELEASED": "ongoing"
    };
    
    return statusMap[status] || "ongoing";
  };

  // Map comic status to our status format
  const mapComicStatus = (status: string) => {
    const statusMap: Record<string, "ongoing" | "completed" | "hiatus"> = {
      "ongoing": "ongoing",
      "completed": "completed",
      "cancelled": "completed",
      "hiatus": "hiatus",
      "limited": "completed",
    };
    
    return statusMap[status.toLowerCase()] || "ongoing";
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <div className="space-y-3 md:space-y-4">
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                <h2 className="text-lg font-semibold">Basic Information</h2>
                <Button 
                  type="button" 
                  onClick={handleOpenSearch}
                  variant="outline"
                  className="gap-2 w-full md:w-auto"
                >
                  <Search className="h-4 w-4" />
                  Search on {form.watch("type") === "comics" ? "Comic Vine" : "AniList"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <FormField
                  control={form.control}
                  name="georgianTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Georgian Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Georgian title (ქართულად)" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormDescription>
                        Title in Georgian language (e.g. "ბერსერკი")
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>English Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter English title" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="manga">მანგა</SelectItem>
                        <SelectItem value="comics">კომიქსი</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="hiatus">Hiatus</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter description" 
                      rows={4}
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <FormField
                control={form.control}
                name="thumbnail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thumbnail URL</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter thumbnail URL" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription>
                      URL for the thumbnail image (aspect ratio 2:3 recommended)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bannerImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banner Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter banner image URL" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription>
                      URL for the banner image (16:9 recommended)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter logo image URL" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription>
                      Transparent PNG / SVG recommended (used for page load animation)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="genres"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Genres</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={genreOptions}
                      placeholder="Select genres"
                      selected={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <FormField
                control={form.control}
                name="releaseYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Release Year</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Release year" 
                        {...field}
                        value={field.value === undefined ? "" : field.value}
                        onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("type") === "comics" && (
                <FormField
                  control={form.control}
                  name="publisher"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publisher</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="DC Comics, Marvel, etc." 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        The publisher of the comic
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("type") !== "comics" && (
                <FormField
                  control={form.control}
                  name="season"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Season</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          // Convert "no_season" to undefined for the form data
                          field.onChange(value === "no_season" ? undefined : value);
                        }}
                        value={field.value || "no_season"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select season" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="no_season">None</SelectItem>
                          <SelectItem value="WINTER">Winter</SelectItem>
                          <SelectItem value="SPRING">Spring</SelectItem>
                          <SelectItem value="SUMMER">Summer</SelectItem>
                          <SelectItem value="FALL">Fall</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="anilistId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AniList ID</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="AniList ID" 
                      {...field}
                      value={field.value || ""}
                      onChange={e => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    ID from AniList (will be filled automatically when searching)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 mt-6 border-t pt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Character Management
              </h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel className="text-md font-semibold">Characters</FormLabel>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const characters = form.getValues("characters") || [];
                    form.setValue("characters", [
                      ...characters, 
                      { name: "", image: "", role: "SUPPORTING" }
                    ]);
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add Character
                </Button>
              </div>
              
              <div className="space-y-4 mt-2">
                {form.watch("characters")?.map((character, index) => (
                  <div key={index} className="p-4 md:pt-6 border rounded-md bg-card">
                    <div className="flex justify-between items-start mb-2 md:mb-3">
                      <h4 className="font-medium">Character {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const characters = form.getValues("characters") || [];
                          form.setValue("characters", characters.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
                      <div>
                        <FormField
                          control={form.control}
                          name={`characters.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Character name" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name={`characters.${index}.image`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Image URL</FormLabel>
                              <FormControl>
                                <Input placeholder="Image URL" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name={`characters.${index}.role`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select
                                value={field.value || "unspecified"}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="MAIN">Main</SelectItem>
                                  <SelectItem value="SUPPORTING">Supporting</SelectItem>
                                  <SelectItem value="BACKGROUND">Background</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name={`characters.${index}.age`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Age (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Character age" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`characters.${index}.gender`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gender (Optional)</FormLabel>
                              <Select
                                value={field.value || "unspecified"}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="unspecified">Unspecified</SelectItem>
                                  <SelectItem value="Male">Male</SelectItem>
                                  <SelectItem value="Female">Female</SelectItem>
                                  <SelectItem value="Non-Binary">Non-Binary</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {character.image && (
                        <div className="md:col-span-2 mt-2">
                          <div className="relative w-20 h-20 border rounded-md overflow-hidden">
                            <img 
                              src={character.image} 
                              alt={character.name || 'Character image'} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder-avatar.png';
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rating (0-10)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Rating" 
                    {...field}
                    value={field.value === undefined ? "" : field.value}
                    onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    min="0"
                    max="10"
                    step="0.1"
                  />
                </FormControl>
                <FormDescription>
                  Rating from 0 to 10
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></span>
                  Saving...
                </>
              ) : initialData ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Search Modal */}
      <AnimatePresence>
        {searchModalOpen && (
          <>
            {/* Backdrop */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setSearchModalOpen(false)}
            />
            
            {/* Modal */}
            <m.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/4 md:top-1/3 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-2 md:mx-4 rounded-2xl bg-[#121212] border border-white/10 shadow-2xl overflow-hidden">
                {/* Search header with form */}
                <form onSubmit={(e) => handleSearch(e)} className="relative">
                  <div className="flex items-center p-3 md:p-4">
                    <Search className="h-5 w-5 text-gray-400 mr-2 md:mr-3" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search on ${searchType === "comics" ? "Comic Vine" : "AniList"}...`}
                      className="flex-1 bg-transparent text-white placeholder:text-gray-500 focus:outline-none text-base md:text-lg"
                    />
                    {searchQuery && (
                      <button 
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="p-1 text-gray-400 hover:text-white"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Toggles */}
                  <div className="border-t border-white/5 p-2 md:p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1 md:gap-2">
                      <ToggleButton
                        active={searchType === "manga"}
                        onClick={() => setSearchType("manga")}
                        icon={<BookOpen className="h-4 w-4" />}
                        label="მანგა"
                      />
                      <ToggleButton
                        active={searchType === "comics"}
                        onClick={() => setSearchType("comics")}
                        icon={<Book className="h-4 w-4" />}
                        label="კომიქსი"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      className="py-1.5 px-3 bg-primary text-white rounded-lg flex items-center gap-1 text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={searchQuery.length < 2}
                      onClick={() => handleSearch()}
                    >
                      Search
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </button>
                  </div>
                </form>
                
                {/* Results */}
                <div className="max-h-[50vh] md:max-h-[60vh] overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {isSearching ? (
                      <m.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-8 text-center text-gray-400"
                      >
                        <div className="w-8 h-8 rounded-full border-2 border-t-primary border-r-primary border-b-gray-700 border-l-gray-700 animate-spin mx-auto mb-3"></div>
                        <p>Searching on AniList...</p>
                      </m.div>
                    ) : searchResults.length > 0 ? (
                      <m.div
                        key="results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-1"
                      >
                        <m.div 
                          className="space-y-1"
                          variants={{
                            hidden: { opacity: 1 },
                            show: {
                              opacity: 1,
                              transition: {
                                staggerChildren: 0.05
                              }
                            }
                          }}
                          initial="hidden"
                          animate="show"
                        >
                          {searchResults.map((result) => (
                            <m.div
                              key={result.id}
                              variants={{
                                hidden: { opacity: 0, y: 10 },
                                show: { opacity: 1, y: 0 }
                              }}
                              className="p-2 md:p-3 hover:bg-white/5 rounded-lg cursor-pointer flex items-center gap-2 md:gap-3 transition-colors"
                              onClick={() => handleSelectResult(result.type, result)}
                            >
                              <div className="w-10 h-14 md:w-12 md:h-16 rounded-md bg-gray-800 overflow-hidden flex-shrink-0">
                                <img 
                                  src={result.image} 
                                  alt={result.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-white">{result.title}</h3>
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <span className="capitalize">{result.type}</span>
                                  {result.year && <span>• {result.year}</span>}
                                  {result.type === "comics" && result.publisher && (
                                    <span>• {result.publisher}</span>
                                  )}
                                </p>
                                <div className="mt-1">
                                  <button 
                                    className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded flex items-center gap-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectResult(result.type, result);
                                    }}
                                  >
                                    <Check className="h-3 w-3" /> Select
                                  </button>
                                </div>
                              </div>
                            </m.div>
                          ))}
                        </m.div>
                      </m.div>
                    ) : searchQuery.length >= 2 ? (
                      <m.div
                        key="no-results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-8 text-center text-gray-400"
                      >
                        <p>No results found on AniList</p>
                      </m.div>
                    ) : searchQuery.length > 0 ? (
                      <m.div
                        key="keep-typing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-8 text-center text-gray-400"
                      >
                        <p>Keep typing to search</p>
                      </m.div>
                    ) : (
                      <m.div
                        key="tips"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-8 text-center text-gray-400"
                      >
                        <p>Search for {searchType} on {searchType === "comics" ? "Comic Vine" : "AniList"} to auto-fill form fields</p>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Toggle button component for manga/comics selection
function ToggleButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "py-1.5 px-3 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all",
        active 
          ? "bg-white/10 text-white" 
          : "text-gray-400 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
} 