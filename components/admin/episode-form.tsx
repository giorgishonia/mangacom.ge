"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
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
import { cn } from "@/lib/utils";

// Form schema for episode validation
const episodeSchema = z.object({
  number: z.coerce.number().int().positive("Episode number must be positive"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  thumbnail: z.string().url("Invalid thumbnail URL").optional().or(z.literal("")),
  videoUrl: z.string().url("Invalid video URL").min(1, "Video URL is required"),
  duration: z.coerce.number().int().positive("Duration must be positive").optional(),
  releaseDate: z.date().optional(),
});

type EpisodeFormValues = z.infer<typeof episodeSchema>;

type EpisodeFormProps = {
  initialData?: any;
  contentId: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function EpisodeForm({
  initialData,
  contentId,
  onSuccess,
  onCancel,
}: EpisodeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Set default values for the form
  const defaultValues = initialData ? {
    ...initialData,
    // Convert any string dates to Date objects
    releaseDate: initialData.releaseDate ? new Date(initialData.releaseDate) : undefined,
    // Ensure number fields are numbers
    number: Number(initialData.number),
    duration: initialData.duration ? Number(initialData.duration) : undefined,
  } : {
    number: 1,
    title: "",
    description: "",
    thumbnail: "",
    videoUrl: "",
    duration: undefined,
    releaseDate: undefined,
  };

  const form = useForm<EpisodeFormValues>({
    resolver: zodResolver(episodeSchema),
    defaultValues,
  });

  async function onSubmit(data: EpisodeFormValues) {
    setIsLoading(true);
    
    try {
      // Process data - format the date as ISO string if it exists
      const formattedData = {
        ...data,
        contentId, // Add the contentId
        releaseDate: data.releaseDate ? data.releaseDate.toISOString() : undefined,
      };
      
      // Define the API endpoint and method
      const endpoint = initialData?.id 
        ? `/api/episodes?id=${initialData.id}` 
        : "/api/episodes";
      const method = initialData?.id ? "PUT" : "POST";
      
      // Make the API request
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save episode");
      }
      
      toast.success(initialData ? "Episode updated successfully" : "Episode created successfully");
      onSuccess();
    } catch (error) {
      console.error("Error saving episode:", error);
      toast.error(initialData ? "Failed to update episode" : "Failed to create episode");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Episode Number *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="1" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  The episode number in the series
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="24" 
                    {...field}
                    value={field.value || ""} 
                  />
                </FormControl>
                <FormDescription>
                  The duration of the episode in minutes
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
                <Input placeholder="Enter episode title" {...field} />
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
                  placeholder="Enter episode description" 
                  rows={3}
                  {...field}
                  value={field.value || ""} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  URL for the episode thumbnail image
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
                        {field.value ? (
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
                  The date when this episode was released
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="videoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video URL *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://example.com/video.mp4" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                URL to the episode video file or stream
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : initialData ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 