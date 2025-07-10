"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Film, 
  BookOpen, 
  Book,
  X, 
  Calendar, 
  CheckSquare, 
  Image as ImageIcon,
  Upload,
  Loader2,
  Search
} from "lucide-react";
import { createContent, updateContent } from "@/lib/content";
import { uploadFile } from "@/lib/upload";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";

type ContentType = "manga" | "comics";

interface ComicVineResult {
  id: number;
  name: string;
  image: {
    original_url: string;
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
    image?: {
      original_url: string;
    };
  }>;
}

interface ContentFormProps {
  initialData?: {
    id?: string;
    title: string;
    description: string;
    thumbnail: string;
    type: ContentType;
    status: string;
    releaseYear: number;
    genres: string[];
    bannerImage: string;
    publisher?: string;
    chapters_count: number;
  };
  mode: "create" | "edit";
}

const statusOptions = {
  Ongoing: "მიმდინარე",
  Completed: "დასრულებული",
  Hiatus: "შეჩერებული",
  Cancelled: "გაუქმებული",
  Upcoming: "მალე"
};

const genreOptions = {
  Action: "მოქმედებითი", Adventure: "სათავგადასავლო", Comedy: "კომედია", Drama: "დრამა", Fantasy: "ფენტეზი", 
  Horror: "საშინელებათა", Mystery: "მისტიკა", Romance: "რომანტიკა", "Sci-Fi": "სამეცნიერო ფანტასტიკა", "Slice of Life": "ცხოვრების ნაწილი", 
  Sports: "სპორტული", Thriller: "თრილერი", Supernatural: "ზებუნებრივი", Mecha: "მექა", Music: "მუსიკალური", 
  Psychological: "ფსიქოლოგიური", Historical: "ისტორიული", School: "სკოლა", Seinen: "სეინენი", Shoujo: "შოუჯო", 
  Shounen: "შონენი", Superhero: "სუპერგმირული", Crime: "კრიმინალური", Suspense: "დაძაბული"
};

// Comic specific genres
const comicsGenreOptions = {
  Superhero: "სუპერგმირული",
  "Sci-Fi": "სამეცნიერო ფანტასტიკა",
  Fantasy: "ფენტეზი",
  Horror: "საშინელებათა",
  Crime: "კრიმინალური",
  Drama: "დრამა",
  Adventure: "სათავგადასავლო",
  Action: "მოქმედებითი",
  Mystery: "მისტიკა",
  Thriller: "თრილერი",
  Historical: "ისტორიული",
  Western: "ვესტერნი",
  Romance: "რომანტიკა",
  Comedy: "კომედია",
  Suspense: "დაძაბული"
};

export default function ContentForm({ initialData, mode }: ContentFormProps) {
  const isEditing = mode === "edit";
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    thumbnail: initialData?.thumbnail || "",
    type: initialData?.type || "manga" as ContentType,
    status: initialData?.status || "Ongoing",
    releaseYear: initialData?.releaseYear || new Date().getFullYear(),
    genres: initialData?.genres || [],
    bannerImage: initialData?.bannerImage || "",
    publisher: initialData?.publisher || "",
    chapters_count: initialData?.chapters_count || 0,
  });
  
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(initialData?.thumbnail || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comicSearchQuery, setComicSearchQuery] = useState("");
  const [comicSearchResults, setComicSearchResults] = useState<ComicVineResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };
  
  const handleTypeChange = (type: ContentType) => {
    setFormData((prev) => ({ ...prev, type }));
  };
  
  const handleGenreToggle = (genre: string) => {
    setFormData((prev) => {
      const currentGenres = [...prev.genres];
      if (currentGenres.includes(genre)) {
        return { ...prev, genres: currentGenres.filter(g => g !== genre) };
      } else {
        return { ...prev, genres: [...currentGenres, genre] };
      }
    });
  };

  // Comic Vine API search function
  const searchComicVineAPI = async (query: string) => {
    if (!query || query.length < 2) return;
    
    setIsSearching(true);
    
    try {
      // Example API endpoint - in real implementation you would need to set up a proxy server
      // since Comic Vine requires an API key and has CORS restrictions
      const response = await fetch(`/api/comic-search?query=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch comics data');
      }
      
      const data = await response.json();
      setComicSearchResults(data.results || []);
    } catch (err) {
      console.error("Error searching Comic Vine:", err);
      setError("Failed to search for comics. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Handle comic search
  const handleComicSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchComicVineAPI(comicSearchQuery);
  };

  // Select comic from search results
  const selectComic = async (comic: ComicVineResult) => {
    setLoading(true);
    
    try {
      // Fetch detailed comic information
      const response = await fetch(`/api/comic-search/${comic.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch comic details');
      }
      
      const comicDetails = await response.json();
      
      // Set form data with the comic details
      setFormData({
        ...formData,
        title: comic.name,
        description: comic.description ? stripHtml(comic.description) : "",
        thumbnail: comic.image?.original_url || "",
        releaseYear: comic.start_year ? parseInt(comic.start_year) : new Date().getFullYear(),
        bannerImage: comicDetails.bannerImage || comic.image?.original_url || "",
        publisher: comic.publisher?.name || comicDetails.publisher || "",
        // If we get genres from the detailed response, use those, otherwise keep current
        genres: comicDetails.genres?.length ? 
          comicDetails.genres.filter((genre: string) => 
            Object.keys(comicsGenreOptions).includes(genre)
          ) : 
          formData.genres
      });
      
      setThumbnailPreview(comic.image?.original_url || null);
      setComicSearchResults([]);
      setComicSearchQuery("");
      
      // Show a success message
      toast.success(`"${comic.name}" has been selected`);
    } catch (err) {
      console.error("Error fetching comic details:", err);
      // Fall back to basic comic data if detailed fetch fails
      setFormData({
        ...formData,
        title: comic.name,
        description: comic.description ? stripHtml(comic.description) : "",
        thumbnail: comic.image?.original_url || "",
        releaseYear: comic.start_year ? parseInt(comic.start_year) : new Date().getFullYear(),
        // Keep current genres
        genres: formData.genres
      });
      
      setThumbnailPreview(comic.image?.original_url || null);
      setComicSearchResults([]);
      setComicSearchQuery("");
    } finally {
      setLoading(false);
    }
  };

  // Strip HTML tags from text
  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    let finalFormData = { ...formData };

    // Validate comic-specific fields
    if (finalFormData.type === "comics" && !finalFormData.publisher) {
      toast.error("გთხოვთ მიუთითოთ გამომცემელი კომიქსებისთვის");
      setLoading(false);
      return;
    }

    // Ensure chapters_count is provided as numbers for manga/comics
    if (finalFormData.type === "manga" || finalFormData.type === "comics") {
      finalFormData.chapters_count = parseInt(String(finalFormData.chapters_count), 10) || 0;
    }

    if (thumbnailFile) {
      const uploadResult = await uploadFile(thumbnailFile, 'thumbnails');
      if (uploadResult.success && uploadResult.url) {
        finalFormData.thumbnail = uploadResult.url;
      } else {
        setError(uploadResult.error || "Failed to upload thumbnail.");
        setLoading(false);
        return;
      }
    }
    
    try {
      if (isEditing && initialData?.id) {
        await updateContent(initialData.id, finalFormData);
        toast.success("კონტენტი წარმატებით განახლდა");
      } else {
        await createContent(finalFormData);
        toast.success("კონტენტი წარმატებით შეიქმნა");
      }
      
      router.push("/admin/content");
      router.refresh();
    } catch (err) {
      console.error("Error saving content:", err);
      setError("Failed to save content. Please try again.");
      toast.error("კონტენტის შენახვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          {isEditing ? "კონტენტის რედაქტირება" : "ახალი კონტენტის დამატება"}
        </h2>
        
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => handleTypeChange("manga")}
            className={`flex items-center px-4 py-2 rounded-lg ${
              formData.type === "manga"
                ? "bg-purple-600 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            <BookOpen className="mr-2 h-5 w-5" />
            მანგა
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange("comics")}
            className={`flex items-center px-4 py-2 rounded-lg ${
              formData.type === "comics"
                ? "bg-purple-600 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            <Book className="mr-2 h-5 w-5" />
            კომიქსები
          </button>
        </div>
      </div>
      
      {/* Comic Search Section - Only show if type is comics */}
      {formData.type === "comics" && (
        <div className="p-4 bg-gray-700 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-3">კომიქსის ძიება</h3>
          
          <div className="flex flex-col space-y-4">
            <form onSubmit={handleComicSearch} className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={comicSearchQuery}
                  onChange={(e) => setComicSearchQuery(e.target.value)}
                  placeholder="შეიყვანეთ კომიქსის სახელი..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white pr-10"
                />
                {comicSearchQuery.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setComicSearchQuery("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching || comicSearchQuery.length < 2}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70 flex items-center"
              >
                {isSearching ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
                <span className="ml-2">ძიება</span>
              </button>
            </form>
            
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-3 text-gray-300">იძებნება კომიქსები...</span>
              </div>
            )}
            
            {!isSearching && comicSearchResults.length === 0 && comicSearchQuery.length >= 2 && (
              <div className="text-center py-8 text-gray-400">
                <p>კომიქსები ვერ მოიძებნა. სცადეთ სხვა საძიებო სიტყვა.</p>
              </div>
            )}
            
            {!isSearching && comicSearchResults.length > 0 && (
              <div className="max-h-80 overflow-y-auto bg-gray-800 rounded-lg p-2">
                {comicSearchResults.map((comic) => (
                  <div 
                    key={comic.id}
                    onClick={() => selectComic(comic)}
                    className="flex items-center space-x-3 p-3 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                  >
                    {comic.image?.original_url ? (
                      <img 
                        src={comic.image.original_url} 
                        alt={comic.name}
                        className="w-16 h-20 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-thumbnail.svg';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-20 bg-gray-700 rounded flex items-center justify-center">
                        <Book className="h-8 w-8 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-white text-lg">{comic.name}</h4>
                      <div className="flex flex-wrap items-center mt-1 text-sm">
                        <span className="text-blue-400">
                          {comic.publisher?.name || "Unknown Publisher"}
                        </span>
                        <span className="mx-2 text-gray-500">•</span>
                        <span className="text-gray-400">
                          {comic.start_year ? `${comic.start_year}` : "Unknown Year"}
                        </span>
                        {comic.volume_count && (
                          <>
                            <span className="mx-2 text-gray-500">•</span>
                            <span className="text-gray-400">
                              {comic.volume_count} {comic.volume_count === 1 ? "Volume" : "Volumes"}
                            </span>
                          </>
                        )}
                      </div>
                      {comic.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {stripHtml(comic.description)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block mb-2 text-sm font-medium text-gray-300">
              სათაური
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block mb-2 text-sm font-medium text-gray-300">
              აღწერა
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block mb-2 text-sm font-medium text-gray-300">
                სტატუსი
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                {Object.entries(statusOptions).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="releaseYear" className="block mb-2 text-sm font-medium text-gray-300">
                გამოშვების წელი
              </label>
              <div className="flex items-center">
                <Calendar className="absolute ml-3 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  id="releaseYear"
                  name="releaseYear"
                  value={formData.releaseYear}
                  onChange={handleChange}
                  min={1900}
                  max={new Date().getFullYear() + 1}
                  className="w-full pl-10 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="chapters_count" className="block mb-2 text-sm font-medium text-gray-300">
              თავების რაოდენობა
            </label>
            <input
              type="number"
              id="chapters_count"
              name="chapters_count"
              value={formData.chapters_count}
              onChange={handleChange}
              min={0}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          
          {/* Publisher field - only visible for comics type */}
          {formData.type === "comics" && (
            <div>
              <label htmlFor="publisher" className="block mb-2 text-sm font-medium text-gray-300">
                გამომცემელი
              </label>
              <input
                type="text"
                id="publisher"
                name="publisher"
                value={formData.publisher}
                onChange={handleChange}
                placeholder="DC Comics, Marvel, Image Comics..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                required={formData.type === "comics"}
              />
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              მინიატურა
            </label>
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-600 rounded-lg bg-gray-700 cursor-pointer">
              {thumbnailPreview ? (
                <div className="relative">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailPreview(null);
                      setThumbnailFile(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-gray-800 rounded-full"
                  >
                    <X className="h-4 w-4 text-gray-300" />
                  </button>
                </div>
              ) : (
                <label htmlFor="thumbnailUpload" className="flex flex-col items-center cursor-pointer">
                  <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-400 mb-1">დააჭირეთ მინიატურის ასატვირთად</p>
                  <p className="text-xs text-gray-500">JPG, PNG ან GIF (მაქს. 2MB)</p>
                  <input
                    id="thumbnailUpload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailChange}
                  />
                </label>
              )}
            </div>
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              ჟანრები
            </label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto bg-gray-700 p-3 rounded-lg">
              {formData.type === "comics" 
                ? Object.entries(comicsGenreOptions).map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleGenreToggle(key)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        formData.genres.includes(key)
                          ? "bg-purple-600 text-white"
                          : "bg-gray-600 text-gray-300"
                      }`}
                    >
                      {value}
                    </button>
                  ))
                : Object.entries(genreOptions).map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleGenreToggle(key)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        formData.genres.includes(key)
                          ? "bg-purple-600 text-white"
                          : "bg-gray-600 text-gray-300"
                      }`}
                    >
                      {value}
                    </button>
                  ))
              }
            </div>
          </div>

          {/* --- Banner Image Input --- */}
          <div>
            <label htmlFor="bannerImage" className="block mb-2 text-sm font-medium text-gray-300">
              ფონის სურათი (URL)
            </label>
            <input
              type="url"
              id="bannerImage"
              name="bannerImage"
              value={formData.bannerImage}
              onChange={handleChange}
              placeholder="https://example.com/banner.jpg"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
            {/* Optional: Preview for the banner image URL */}
            {formData.bannerImage && (
              <div className="mt-2">
                <img 
                  src={formData.bannerImage} 
                  alt="Banner preview" 
                  className="w-full h-32 object-cover rounded-lg border border-gray-600"
                  onError={(e) => { 
                      e.currentTarget.src = '/placeholder-banner.svg';
                      e.currentTarget.alt = 'Invalid Banner URL';
                      console.warn("Invalid banner image URL entered");
                  }} 
                />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-200">
          {error}
        </div>
      )}
      
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
        >
          გაუქმება
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 flex items-center justify-center bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ინახება...
            </>
          ) : isEditing ? (
            "კონტენტის განახლება"
          ) : (
            "კონტენტის შექმნა"
          )}
        </button>
      </div>
    </form>
  );
} 