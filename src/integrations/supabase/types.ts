export type UserRole = "admin" | "distribution" | "marketing" | "sponsorships";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      role_permissions: {
        Row: {
          id: string;
          role: UserRole;
          resource: string;
          can_read: boolean;
          can_write: boolean;
          can_delete: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["role_permissions"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["role_permissions"]["Insert"]>;
      };
      artists: {
        Row: {
          id: string;
          slug: string;
          name: string;
          genre: string | null;
          bio: string | null;
          image_url: string | null;
          spotify_url: string | null;
          apple_music_url: string | null;
          youtube_url: string | null;
          soundcloud_url: string | null;
          instagram_url: string | null;
          featured: boolean;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["artists"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["artists"]["Insert"]>;
      };
      releases: {
        Row: {
          id: string;
          artist_id: string;
          title: string;
          type: "album" | "ep" | "single" | "mixtape";
          release_date: string | null;
          cover_url: string | null;
          spotify_url: string | null;
          apple_music_url: string | null;
          stream_count: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["releases"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["releases"]["Insert"]>;
      };
      social_metrics: {
        Row: {
          id: string;
          artist_id: string | null;
          platform: "instagram" | "youtube" | "spotify" | "tiktok" | "twitter";
          followers: number;
          views_30d: number | null;
          streams_30d: number | null;
          engagement_rate: number | null;
          recorded_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["social_metrics"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["social_metrics"]["Insert"]>;
      };
      events: {
        Row: {
          id: string;
          title: string;
          slug: string;
          venue: string | null;
          city: string | null;
          event_date: string;
          doors_time: string | null;
          ticket_url: string | null;
          flyer_url: string | null;
          description: string | null;
          featured_artist_ids: string[];
          status: "upcoming" | "past" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["events"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
      };
      publications: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          body: string | null;
          cover_url: string | null;
          category: "Business" | "Artists" | "Culture" | "Milestones" | "Industry";
          author: string | null;
          featured: boolean;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["publications"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["publications"]["Insert"]>;
      };
      instagram_posts: {
        Row: {
          id: string;
          instagram_url: string;
          label: string | null;
          display_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["instagram_posts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["instagram_posts"]["Insert"]>;
      };
      bookings: {
        Row: {
          id: string;
          service: "security" | "dj" | "venue" | "promoter";
          name: string;
          email: string;
          phone: string | null;
          event_date: string | null;
          location: string | null;
          notes: string | null;
          set_length: string | null;
          genre: string | null;
          equipment: string | null;
          staff_count: string | null;
          capacity: string | null;
          event_type: string | null;
          amenities: string | null;
          budget_range: string | null;
          marketing_goals: string | null;
          indoor_outdoor: string | null;
          expected_attendance: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bookings"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
      };
      distribution_applications: {
        Row: {
          id: string;
          artist_name: string;
          contact_name: string;
          email: string;
          phone: string | null;
          genre: string | null;
          monthly_listeners: string | null;
          current_distributor: string | null;
          message: string | null;
          status: "pending" | "reviewing" | "approved" | "rejected";
          notes: string | null;
          submitted_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["distribution_applications"]["Row"], "id" | "submitted_at">;
        Update: Partial<Database["public"]["Tables"]["distribution_applications"]["Insert"]>;
      };
      sponsorship_leads: {
        Row: {
          id: string;
          company_name: string;
          contact_name: string;
          email: string;
          phone: string | null;
          website: string | null;
          budget_range: string | null;
          campaign_type: string | null;
          message: string | null;
          stage: "new" | "contacted" | "proposal" | "negotiating" | "closed_won" | "closed_lost";
          assigned_to: string | null;
          value_estimate: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sponsorship_leads"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["sponsorship_leads"]["Insert"]>;
      };
      social_tokens: {
        Row: {
          id: string;
          platform: string;
          access_token: string;
          refresh_token: string | null;
          expires_at: string | null;
          scope: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["social_tokens"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["social_tokens"]["Insert"]>;
      };
      cron_logs: {
        Row: {
          id: string;
          job_name: string;
          status: "success" | "error" | "running";
          message: string | null;
          duration_ms: number | null;
          ran_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["cron_logs"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["cron_logs"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
    };
  };
};
