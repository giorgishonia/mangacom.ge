import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Map of English genre values to Georgian labels
export const genreTranslations: Record<string, string> = {
  "action": "აქშენი",
  "adventure": "სათავგადასავლო",
  "comedy": "კომედია",
  "drama": "დრამა",
  "fantasy": "ფენტეზი",
  "horror": "საშინელება",
  "mystery": "საიდუმლოება",
  "romance": "რომანტიკა",
  "sci-fi": "მეცნიერული ფანტასტიკა",
  "slice-of-life": "ცხოვრების ნაჭერი",
  "sports": "სპორტი",
  "supernatural": "ზებუნებრივი",
  "thriller": "თრილერი"
};

// Helper function to translate genre from English to Georgian
export function translateGenre(genre: string): string {
  return genreTranslations[genre.toLowerCase()] || genre;
}
