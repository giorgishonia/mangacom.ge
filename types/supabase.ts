export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      suggestions: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          type: "sticker" | "gif" | "manga"
          image_url: string | null
          vote_count: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          type: "sticker" | "gif" | "manga"
          image_url?: string | null
          vote_count?: number
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          type?: "sticker" | "gif" | "manga"
          image_url?: string | null
          vote_count?: number
          created_at?: string
          updated_at?: string | null
        }
      }
      votes: {
        Row: {
          id: string
          user_id: string
          suggestion_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          suggestion_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          suggestion_id?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string
          suggestion_id: string
          content: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          suggestion_id: string
          content: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          suggestion_id?: string
          content?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          name: string | null
          email: string | null
          image: string | null
          created_at: string
          updated_at: string | null
          banner: string | null
          bio: string | null
          location: string | null
        }
        Insert: {
          id: string
          username?: string | null
          name?: string | null
          email?: string | null
          image?: string | null
          created_at?: string
          updated_at?: string | null
          banner?: string | null
          bio?: string | null
          location?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          name?: string | null
          email?: string | null
          image?: string | null
          created_at?: string
          updated_at?: string | null
          banner?: string | null
          bio?: string | null
          location?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_vote_count: {
        Args: {
          sid: string
        }
        Returns: undefined
      }
      decrement_vote_count: {
        Args: {
          sid: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Functions<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T] 