export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      artists: {
        Row: {
          active: boolean
          apple_music_url: string | null
          bio: string | null
          created_at: string
          featured: boolean
          genre: string | null
          id: string
          image_url: string | null
          instagram_url: string | null
          name: string
          slug: string
          soundcloud_url: string | null
          spotify_url: string | null
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          active?: boolean
          apple_music_url?: string | null
          bio?: string | null
          created_at?: string
          featured?: boolean
          genre?: string | null
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          name: string
          slug: string
          soundcloud_url?: string | null
          spotify_url?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          active?: boolean
          apple_music_url?: string | null
          bio?: string | null
          created_at?: string
          featured?: boolean
          genre?: string | null
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          name?: string
          slug?: string
          soundcloud_url?: string | null
          spotify_url?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          amenities: string | null
          budget_range: string | null
          capacity: string | null
          created_at: string | null
          email: string
          equipment: string | null
          event_date: string | null
          event_type: string | null
          expected_attendance: string | null
          genre: string | null
          id: string
          indoor_outdoor: string | null
          location: string | null
          marketing_goals: string | null
          name: string
          notes: string | null
          phone: string | null
          service: string
          set_length: string | null
          staff_count: string | null
        }
        Insert: {
          amenities?: string | null
          budget_range?: string | null
          capacity?: string | null
          created_at?: string | null
          email: string
          equipment?: string | null
          event_date?: string | null
          event_type?: string | null
          expected_attendance?: string | null
          genre?: string | null
          id?: string
          indoor_outdoor?: string | null
          location?: string | null
          marketing_goals?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          service: string
          set_length?: string | null
          staff_count?: string | null
        }
        Update: {
          amenities?: string | null
          budget_range?: string | null
          capacity?: string | null
          created_at?: string | null
          email?: string
          equipment?: string | null
          event_date?: string | null
          event_type?: string | null
          expected_attendance?: string | null
          genre?: string | null
          id?: string
          indoor_outdoor?: string | null
          location?: string | null
          marketing_goals?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          service?: string
          set_length?: string | null
          staff_count?: string | null
        }
        Relationships: []
      }
      cron_logs: {
        Row: {
          duration_ms: number | null
          id: string
          job_name: string
          message: string | null
          ran_at: string
          status: string
        }
        Insert: {
          duration_ms?: number | null
          id?: string
          job_name: string
          message?: string | null
          ran_at?: string
          status: string
        }
        Update: {
          duration_ms?: number | null
          id?: string
          job_name?: string
          message?: string | null
          ran_at?: string
          status?: string
        }
        Relationships: []
      }
      distribution_applications: {
        Row: {
          artist_name: string
          contact_name: string
          current_distributor: string | null
          email: string
          genre: string | null
          id: string
          message: string | null
          monthly_listeners: string | null
          notes: string | null
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
        }
        Insert: {
          artist_name: string
          contact_name: string
          current_distributor?: string | null
          email: string
          genre?: string | null
          id?: string
          message?: string | null
          monthly_listeners?: string | null
          notes?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
        }
        Update: {
          artist_name?: string
          contact_name?: string
          current_distributor?: string | null
          email?: string
          genre?: string | null
          id?: string
          message?: string | null
          monthly_listeners?: string | null
          notes?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          city: string | null
          created_at: string
          description: string | null
          doors_time: string | null
          event_date: string
          featured_artist_ids: string[]
          flyer_url: string | null
          id: string
          slug: string
          status: string
          ticket_url: string | null
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          description?: string | null
          doors_time?: string | null
          event_date: string
          featured_artist_ids?: string[]
          flyer_url?: string | null
          id?: string
          slug: string
          status?: string
          ticket_url?: string | null
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          description?: string | null
          doors_time?: string | null
          event_date?: string
          featured_artist_ids?: string[]
          flyer_url?: string | null
          id?: string
          slug?: string
          status?: string
          ticket_url?: string | null
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      instagram_posts: {
        Row: {
          active: boolean | null
          created_at: string | null
          display_order: number | null
          id: string
          instagram_url: string
          label: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          instagram_url: string
          label?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          instagram_url?: string
          label?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      publications: {
        Row: {
          author: string | null
          body: string | null
          category: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          featured: boolean
          id: string
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          body?: string | null
          category?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          id?: string
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          body?: string | null
          category?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          id?: string
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      releases: {
        Row: {
          apple_music_url: string | null
          artist_id: string
          cover_url: string | null
          created_at: string
          id: string
          release_date: string | null
          spotify_url: string | null
          stream_count: number
          title: string
          type: string
        }
        Insert: {
          apple_music_url?: string | null
          artist_id: string
          cover_url?: string | null
          created_at?: string
          id?: string
          release_date?: string | null
          spotify_url?: string | null
          stream_count?: number
          title: string
          type: string
        }
        Update: {
          apple_music_url?: string | null
          artist_id?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          release_date?: string | null
          spotify_url?: string | null
          stream_count?: number
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "releases_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_delete: boolean
          can_read: boolean
          can_write: boolean
          id: string
          resource: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          can_delete?: boolean
          can_read?: boolean
          can_write?: boolean
          id?: string
          resource: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          can_delete?: boolean
          can_read?: boolean
          can_write?: boolean
          id?: string
          resource?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      social_metrics: {
        Row: {
          artist_id: string | null
          engagement_rate: number | null
          followers: number
          id: string
          platform: string
          recorded_at: string
          streams_30d: number | null
          views_30d: number | null
        }
        Insert: {
          artist_id?: string | null
          engagement_rate?: number | null
          followers?: number
          id?: string
          platform: string
          recorded_at?: string
          streams_30d?: number | null
          views_30d?: number | null
        }
        Update: {
          artist_id?: string | null
          engagement_rate?: number | null
          followers?: number
          id?: string
          platform?: string
          recorded_at?: string
          streams_30d?: number | null
          views_30d?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_metrics_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      social_tokens: {
        Row: {
          access_token: string
          expires_at: string | null
          id: string
          platform: string
          refresh_token: string | null
          scope: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          expires_at?: string | null
          id?: string
          platform: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          expires_at?: string | null
          id?: string
          platform?: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sponsorship_leads: {
        Row: {
          assigned_to: string | null
          budget_range: string | null
          campaign_type: string | null
          company_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          message: string | null
          phone: string | null
          stage: string
          updated_at: string
          value_estimate: number | null
          website: string | null
        }
        Insert: {
          assigned_to?: string | null
          budget_range?: string | null
          campaign_type?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          phone?: string | null
          stage?: string
          updated_at?: string
          value_estimate?: number | null
          website?: string | null
        }
        Update: {
          assigned_to?: string | null
          budget_range?: string | null
          campaign_type?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          phone?: string | null
          stage?: string
          updated_at?: string
          value_estimate?: number | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      user_role: "admin" | "distribution" | "marketing" | "sponsorships"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "distribution", "marketing", "sponsorships"],
    },
  },
} as const
