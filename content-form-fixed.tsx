"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { MultiSelect } from "@/components/ui/multi-select";
import { createContent, updateContent } from "@/lib/content";

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


// Form schema - only including fields we're certain exist in the database
const contentFormSchema = z.object({
  title: z.string().min(1, {
    message: "სათაური სავალდებულოა",
  }),
  description: z.string().min(1, "აღწერა სავალდებულოა"),
  type: z.enum(["manga", "comics"], {
    required_error: "კონტენტის ტიპი სავალდებულოა",
  }),
  status: z.enum(["ongoing", "completed", "hiatus"], {
    required_error: "სტატუსი სავალდებულოა",
  }),
  thumbnail: z.string().min(1, "მთავარი სურათის URL სავალდებულოა"),
  banner_image: z.string().optional(),
  genres: z.array(z.string()).min(1, "მინიმუმ ერთი ჟანრი სავალდებულოა"),
  season: z.string().optional(),
  release_year: z.coerce.number().min(1900, "არასწორი წელი").max(new Date().getFullYear() + 1, "წელი არ შეიძლება იყოს მომავალში").optional(),
  // content_type field removed as it's not used in the form UI
});

type ContentFormValues = z.infer<typeof contentFormSchema>;

type ContentFormProps = {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function ContentFormFixed({
  initialData,
  onSuccess,
  onCancel,
}: ContentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Set default values for the form - using snake_case field names
  const defaultValues = initialData ? {
    ...initialData,
    // Ensure values are in the right format
    release_year: initialData.release_year ? 
      String(initialData.release_year) : undefined,
  } : {
    title: "",
    description: "",
    type: "manga" as const,
    status: "ongoing" as const,
    thumbnail: "",
    banner_image: "",
    genres: [],
    season: "",
    release_year: new Date().getFullYear(),
  };

  const form = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema),
    defaultValues,
  });

  async function onSubmit(data: ContentFormValues) {
    setIsLoading(true);
    
    try {
      if (initialData?.id) {
        // Update existing content
        await updateContent(initialData.id, data);
        toast.success("კონტენტი წარმატებით განახლდა");
      } else {
        // Create new content
        const result = await createContent(data);
        if (result.success) {
          toast.success("კონტენტი წარმატებით შეიქმნა");
        } else {
          toast.error("კონტენტის შექმნა ვერ მოხერხდა");
        }
      }
      
      onSuccess();
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error(initialData ? "კონტენტის განახლება ვერ მოხერხდა" : "კონტენტის შექმნა ვერ მოხერხდა");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>სათაური</FormLabel>
                <FormControl>
                  <Input placeholder="შეიყვანეთ სათაური" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ტიპი</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="აირჩიეთ ტიპი" />
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
                  <FormLabel>სტატუსი</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="აირჩიეთ სტატუსი" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ongoing">მიმდინარე</SelectItem>
                      <SelectItem value="completed">დასრულებული</SelectItem>
                      <SelectItem value="hiatus">შეჩერებული</SelectItem>
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
                <FormLabel>აღწერა</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="შეიყვანეთ აღწერა" 
                    rows={4}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="thumbnail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>მთავარი სურათის URL</FormLabel>
                  <FormControl>
                    <Input placeholder="შეიყვანეთ მთავარი სურათის URL" {...field} />
                  </FormControl>
                  <FormDescription>
                    მთავარი სურათის URL (რეკომენდებული ასპექტის თანაფარდობა 2:3)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="banner_image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ბანერის სურათის URL (არასავალდებულო)</FormLabel>
                  <FormControl>
                    <Input placeholder="შეიყვანეთ ბანერის სურათის URL" {...field} />
                  </FormControl>
                  <FormDescription>
                    ბანერის სურათის URL (რეკომენდებული ასპექტის თანაფარდობა 16:9)
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
                <FormLabel>ჟანრები</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={genreOptions} // Assuming genreOptions are fine in English for now or will be translated separately if needed
                    placeholder="აირჩიეთ ჟანრები"
                    selected={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="season"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>სეზონი (არასავალდებულო)</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="აირჩიეთ სეზონი" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">არცერთი</SelectItem>
                      <SelectItem value="winter">ზამთარი</SelectItem>
                      <SelectItem value="spring">გაზაფხული</SelectItem>
                      <SelectItem value="summer">ზაფხული</SelectItem>
                      <SelectItem value="fall">შემოდგომა</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="release_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>გამოშვების წელი</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="შეიყვანეთ წელი" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
          >
            გაუქმება
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ინახება...
              </>
            ) : initialData ? (
              "ცვლილებების შენახვა"
            ) : (
              "კონტენტის შექმნა"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 