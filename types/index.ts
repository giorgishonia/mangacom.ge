export interface Content {
  id: string;
  title: string;
  alternative_titles?: string[];
  description: string;
  type: 'manga' | 'comics';
  status: 'ongoing' | 'completed' | 'hiatus';
  thumbnail: string;
  banner_image?: string;
  genres: string[];
  season?: string;
  release_year?: number;
  rating?: number;
  anilist_id?: string;
  mal_id?: string;
  created_at: string;
  updated_at: string;
} 