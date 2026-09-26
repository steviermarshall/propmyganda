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
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          payload: Json | null
          team_member_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          payload?: Json | null
          team_member_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          payload?: Json | null
          team_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          ai_draft: string | null
          approved_by: string | null
          artist_tags: string[] | null
          city_tags: string[] | null
          created_at: string | null
          edited_draft: string | null
          final_text: string | null
          genre_tags: string[] | null
          hero_image_url: string | null
          id: string
          published_at: string | null
          published_url: string | null
          status: string
          title: string
          updated_at: string | null
          written_by: string | null
        }
        Insert: {
          ai_draft?: string | null
          approved_by?: string | null
          artist_tags?: string[] | null
          city_tags?: string[] | null
          created_at?: string | null
          edited_draft?: string | null
          final_text?: string | null
          genre_tags?: string[] | null
          hero_image_url?: string | null
          id?: string
          published_at?: string | null
          published_url?: string | null
          status?: string
          title: string
          updated_at?: string | null
          written_by?: string | null
        }
        Update: {
          ai_draft?: string | null
          approved_by?: string | null
          artist_tags?: string[] | null
          city_tags?: string[] | null
          created_at?: string | null
          edited_draft?: string | null
          final_text?: string | null
          genre_tags?: string[] | null
          hero_image_url?: string | null
          id?: string
          published_at?: string | null
          published_url?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          written_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_written_by_fkey"
            columns: ["written_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_prospects: {
        Row: {
          assigned_to: string | null
          city: string | null
          contact_email: string | null
          contact_method: string | null
          created_at: string | null
          fit_score: number | null
          genre: string | null
          growth_velocity: number | null
          id: string
          ig_followers: number | null
          ig_handle: string | null
          intended_lane: string | null
          last_contact_date: string | null
          name: string
          next_followup_date: string | null
          notes: string | null
          outreach_status: string
          spotify_monthly_listeners: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          city?: string | null
          contact_email?: string | null
          contact_method?: string | null
          created_at?: string | null
          fit_score?: number | null
          genre?: string | null
          growth_velocity?: number | null
          id?: string
          ig_followers?: number | null
          ig_handle?: string | null
          intended_lane?: string | null
          last_contact_date?: string | null
          name: string
          next_followup_date?: string | null
          notes?: string | null
          outreach_status?: string
          spotify_monthly_listeners?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          city?: string | null
          contact_email?: string | null
          contact_method?: string | null
          created_at?: string | null
          fit_score?: number | null
          genre?: string | null
          growth_velocity?: number | null
          id?: string
          ig_followers?: number | null
          ig_handle?: string | null
          intended_lane?: string | null
          last_contact_date?: string | null
          name?: string
          next_followup_date?: string | null
          notes?: string | null
          outreach_status?: string
          spotify_monthly_listeners?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_prospects_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
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
          artist_name: string | null
          budget_range: string | null
          capacity: string | null
          created_at: string | null
          created_by: string | null
          deal_type: string | null
          email: string
          equipment: string | null
          event_at: string | null
          event_date: string | null
          event_type: string | null
          expected_attendance: string | null
          genre: string | null
          id: string
          indoor_outdoor: string | null
          is_free: boolean
          location: string | null
          marketing_budget: string | null
          marketing_goals: string | null
          name: string
          notes: string | null
          partner_name: string | null
          phone: string | null
          platforms: string | null
          release_date: string | null
          release_title: string | null
          revenue_split: string | null
          service: string
          set_length: string | null
          staff_count: string | null
        }
        Insert: {
          amenities?: string | null
          artist_name?: string | null
          budget_range?: string | null
          capacity?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_type?: string | null
          email: string
          equipment?: string | null
          event_at?: string | null
          event_date?: string | null
          event_type?: string | null
          expected_attendance?: string | null
          genre?: string | null
          id?: string
          indoor_outdoor?: string | null
          is_free?: boolean
          location?: string | null
          marketing_budget?: string | null
          marketing_goals?: string | null
          name: string
          notes?: string | null
          partner_name?: string | null
          phone?: string | null
          platforms?: string | null
          release_date?: string | null
          release_title?: string | null
          revenue_split?: string | null
          service: string
          set_length?: string | null
          staff_count?: string | null
        }
        Update: {
          amenities?: string | null
          artist_name?: string | null
          budget_range?: string | null
          capacity?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_type?: string | null
          email?: string
          equipment?: string | null
          event_at?: string | null
          event_date?: string | null
          event_type?: string | null
          expected_attendance?: string | null
          genre?: string | null
          id?: string
          indoor_outdoor?: string | null
          is_free?: boolean
          location?: string | null
          marketing_budget?: string | null
          marketing_goals?: string | null
          name?: string
          notes?: string | null
          partner_name?: string | null
          phone?: string | null
          platforms?: string | null
          release_date?: string | null
          release_title?: string | null
          revenue_split?: string | null
          service?: string
          set_length?: string | null
          staff_count?: string | null
        }
        Relationships: []
      }
      calendar_sync: {
        Row: {
          entity_id: string
          entity_type: string
          etag: string | null
          event_html_link: string | null
          google_calendar_id: string
          google_event_id: string
          id: string
          last_error: string | null
          last_synced_at: string | null
          sync_direction: string | null
        }
        Insert: {
          entity_id: string
          entity_type: string
          etag?: string | null
          event_html_link?: string | null
          google_calendar_id?: string
          google_event_id: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          sync_direction?: string | null
        }
        Update: {
          entity_id?: string
          entity_type?: string
          etag?: string | null
          event_html_link?: string | null
          google_calendar_id?: string
          google_event_id?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          sync_direction?: string | null
        }
        Relationships: []
      }
      crm_bookings: {
        Row: {
          amount_quoted: number | null
          artist_contact: string | null
          artist_name: string
          assigned_to: string | null
          created_at: string | null
          id: string
          notes: string | null
          package: string | null
          shoot_at: string | null
          shoot_date: string | null
          song_or_project: string | null
          source: string | null
          status: string
          stripe_deposit_paid: boolean | null
          updated_at: string | null
        }
        Insert: {
          amount_quoted?: number | null
          artist_contact?: string | null
          artist_name: string
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          package?: string | null
          shoot_at?: string | null
          shoot_date?: string | null
          song_or_project?: string | null
          source?: string | null
          status?: string
          stripe_deposit_paid?: boolean | null
          updated_at?: string | null
        }
        Update: {
          amount_quoted?: number | null
          artist_contact?: string | null
          artist_name?: string
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          package?: string | null
          shoot_at?: string | null
          shoot_date?: string | null
          song_or_project?: string | null
          source?: string | null
          status?: string
          stripe_deposit_paid?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_bookings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
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
      deliverables: {
        Row: {
          assigned_to: string | null
          delivered_at: string | null
          due_at: string | null
          edited_by: string | null
          editor_notes: string | null
          expected_runtime_sec: number | null
          filmed_at: string | null
          format: string
          id: string
          last_review_notes: string | null
          objective: string | null
          platform: string[] | null
          priority: string | null
          revision_count: number | null
          shoot_id: string
          status: string
          updated_at: string | null
          upload_urls: Json | null
        }
        Insert: {
          assigned_to?: string | null
          delivered_at?: string | null
          due_at?: string | null
          edited_by?: string | null
          editor_notes?: string | null
          expected_runtime_sec?: number | null
          filmed_at?: string | null
          format: string
          id?: string
          last_review_notes?: string | null
          objective?: string | null
          platform?: string[] | null
          priority?: string | null
          revision_count?: number | null
          shoot_id: string
          status?: string
          updated_at?: string | null
          upload_urls?: Json | null
        }
        Update: {
          assigned_to?: string | null
          delivered_at?: string | null
          due_at?: string | null
          edited_by?: string | null
          editor_notes?: string | null
          expected_runtime_sec?: number | null
          filmed_at?: string | null
          format?: string
          id?: string
          last_review_notes?: string | null
          objective?: string | null
          platform?: string[] | null
          priority?: string | null
          revision_count?: number | null
          shoot_id?: string
          status?: string
          updated_at?: string | null
          upload_urls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_shoot_id_fkey"
            columns: ["shoot_id"]
            isOneToOne: false
            referencedRelation: "shoots"
            referencedColumns: ["id"]
          },
        ]
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
      distro_artist_members: {
        Row: {
          agreements_email: string | null
          created_at: string | null
          distro_artist_id: string
          distro_email: string | null
          first_name: string
          id: string
          ipi_number: string | null
          is_primary: boolean | null
          last_name: string
          member_role: string
          pro_affiliation: string | null
          pro_other: string | null
          stage_name: string | null
        }
        Insert: {
          agreements_email?: string | null
          created_at?: string | null
          distro_artist_id: string
          distro_email?: string | null
          first_name: string
          id?: string
          ipi_number?: string | null
          is_primary?: boolean | null
          last_name: string
          member_role: string
          pro_affiliation?: string | null
          pro_other?: string | null
          stage_name?: string | null
        }
        Update: {
          agreements_email?: string | null
          created_at?: string | null
          distro_artist_id?: string
          distro_email?: string | null
          first_name?: string
          id?: string
          ipi_number?: string | null
          is_primary?: boolean | null
          last_name?: string
          member_role?: string
          pro_affiliation?: string | null
          pro_other?: string | null
          stage_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distro_artist_members_distro_artist_id_fkey"
            columns: ["distro_artist_id"]
            isOneToOne: false
            referencedRelation: "distro_artists"
            referencedColumns: ["id"]
          },
        ]
      }
      distro_artists: {
        Row: {
          admin_rights: boolean | null
          apple_music_url: string | null
          artist_contact: string | null
          artist_name: string
          chartmetric_url: string | null
          contract_url: string | null
          description: string | null
          dsp_title_approved: boolean | null
          dsp_title_custom: string | null
          id: string
          monthly_streams: number | null
          notes: string | null
          onboarded_at: string | null
          onboarded_by: string | null
          onboarding_status: string
          pmg_share_percent: number | null
          publishing_owned: boolean | null
          side: string
          spotify_url: string | null
          updated_at: string | null
          youtube_url: string | null
        }
        Insert: {
          admin_rights?: boolean | null
          apple_music_url?: string | null
          artist_contact?: string | null
          artist_name: string
          chartmetric_url?: string | null
          contract_url?: string | null
          description?: string | null
          dsp_title_approved?: boolean | null
          dsp_title_custom?: string | null
          id?: string
          monthly_streams?: number | null
          notes?: string | null
          onboarded_at?: string | null
          onboarded_by?: string | null
          onboarding_status?: string
          pmg_share_percent?: number | null
          publishing_owned?: boolean | null
          side: string
          spotify_url?: string | null
          updated_at?: string | null
          youtube_url?: string | null
        }
        Update: {
          admin_rights?: boolean | null
          apple_music_url?: string | null
          artist_contact?: string | null
          artist_name?: string
          chartmetric_url?: string | null
          contract_url?: string | null
          description?: string | null
          dsp_title_approved?: boolean | null
          dsp_title_custom?: string | null
          id?: string
          monthly_streams?: number | null
          notes?: string | null
          onboarded_at?: string | null
          onboarded_by?: string | null
          onboarding_status?: string
          pmg_share_percent?: number | null
          publishing_owned?: boolean | null
          side?: string
          spotify_url?: string | null
          updated_at?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distro_artists_onboarded_by_fkey"
            columns: ["onboarded_by"]
            isOneToOne: false
            referencedRelation: "team_members"
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
      kpi_targets: {
        Row: {
          description: string | null
          id: string
          metric_name: string
          team_member_role: string
          unit: string | null
          weekly_target: number
        }
        Insert: {
          description?: string | null
          id?: string
          metric_name: string
          team_member_role: string
          unit?: string | null
          weekly_target: number
        }
        Update: {
          description?: string | null
          id?: string
          metric_name?: string
          team_member_role?: string
          unit?: string | null
          weekly_target?: number
        }
        Relationships: []
      }
      media_agency_projects: {
        Row: {
          amount: number | null
          artist_contact: string | null
          artist_name: string
          created_at: string | null
          id: string
          notes: string | null
          scope_notes: string | null
          shoot_date: string | null
          sold_by: string | null
          status: string
          stripe_paid: boolean | null
          tier: string | null
          travel_addon: number | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          artist_contact?: string | null
          artist_name: string
          created_at?: string | null
          id?: string
          notes?: string | null
          scope_notes?: string | null
          shoot_date?: string | null
          sold_by?: string | null
          status?: string
          stripe_paid?: boolean | null
          tier?: string | null
          travel_addon?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          artist_contact?: string | null
          artist_name?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          scope_notes?: string | null
          shoot_date?: string | null
          sold_by?: string | null
          status?: string
          stripe_paid?: boolean | null
          tier?: string | null
          travel_addon?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_agency_projects_sold_by_fkey"
            columns: ["sold_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_sends: {
        Row: {
          body: string | null
          click_rate: number | null
          composed_by: string | null
          created_at: string | null
          id: string
          open_rate: number | null
          recipients_count: number | null
          sent_at: string | null
          subject: string | null
        }
        Insert: {
          body?: string | null
          click_rate?: number | null
          composed_by?: string | null
          created_at?: string | null
          id?: string
          open_rate?: number | null
          recipients_count?: number | null
          sent_at?: string | null
          subject?: string | null
        }
        Update: {
          body?: string | null
          click_rate?: number | null
          composed_by?: string | null
          created_at?: string | null
          id?: string
          open_rate?: number | null
          recipients_count?: number | null
          sent_at?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_sends_composed_by_fkey"
            columns: ["composed_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean | null
          source: string | null
          subscribed_at: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean | null
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean | null
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
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
      royalty_payments: {
        Row: {
          artist_id: string | null
          created_at: string | null
          gross_royalty: number
          id: string
          paid_to_artist: number
          period_month: string
          pmg_share: number
          source: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          gross_royalty?: number
          id?: string
          paid_to_artist?: number
          period_month: string
          pmg_share?: number
          source?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          gross_royalty?: number
          id?: string
          paid_to_artist?: number
          period_month?: string
          pmg_share?: number
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "royalty_payments_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "distro_artists"
            referencedColumns: ["id"]
          },
        ]
      }
      shoots: {
        Row: {
          artist_name: string
          assigned_editor_id: string | null
          booking_id: string | null
          created_at: string | null
          duration_hours: number | null
          id: string
          location: string | null
          media_agency_project_id: string | null
          notes: string | null
          scheduled_at: string | null
          shoot_date: string
          shoot_type: string
          shoot_window: string | null
          shooter: string | null
          status: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          artist_name: string
          assigned_editor_id?: string | null
          booking_id?: string | null
          created_at?: string | null
          duration_hours?: number | null
          id?: string
          location?: string | null
          media_agency_project_id?: string | null
          notes?: string | null
          scheduled_at?: string | null
          shoot_date: string
          shoot_type: string
          shoot_window?: string | null
          shooter?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          artist_name?: string
          assigned_editor_id?: string | null
          booking_id?: string | null
          created_at?: string | null
          duration_hours?: number | null
          id?: string
          location?: string | null
          media_agency_project_id?: string | null
          notes?: string | null
          scheduled_at?: string | null
          shoot_date?: string
          shoot_type?: string
          shoot_window?: string | null
          shooter?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shoots_assigned_editor_id_fkey"
            columns: ["assigned_editor_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoots_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "crm_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoots_media_agency_project_id_fkey"
            columns: ["media_agency_project_id"]
            isOneToOne: false
            referencedRelation: "media_agency_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoots_shooter_fkey"
            columns: ["shooter"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
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
      sponsor_activities: {
        Row: {
          activity_type: string
          brand_id: string | null
          contact_id: string | null
          created_by: string | null
          deal_id: string | null
          id: string
          occurred_at: string | null
          summary: string
        }
        Insert: {
          activity_type: string
          brand_id?: string | null
          contact_id?: string | null
          created_by?: string | null
          deal_id?: string | null
          id?: string
          occurred_at?: string | null
          summary: string
        }
        Update: {
          activity_type?: string
          brand_id?: string | null
          contact_id?: string | null
          created_by?: string | null
          deal_id?: string | null
          id?: string
          occurred_at?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_activities_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "sponsor_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "sponsor_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "sponsor_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_brands: {
        Row: {
          activation_style: string[] | null
          annual_budget_estimate: number | null
          brand_colors: Json | null
          brand_guidelines_url: string | null
          created_at: string | null
          fiscal_year_end_month: number | null
          hq_location: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          notes: string | null
          owner_id: string | null
          parent_company: string | null
          previous_sponsorships: string[] | null
          regions: string[] | null
          source: string | null
          status: string | null
          target_demo: Json | null
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          activation_style?: string[] | null
          annual_budget_estimate?: number | null
          brand_colors?: Json | null
          brand_guidelines_url?: string | null
          created_at?: string | null
          fiscal_year_end_month?: number | null
          hq_location?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          parent_company?: string | null
          previous_sponsorships?: string[] | null
          regions?: string[] | null
          source?: string | null
          status?: string | null
          target_demo?: Json | null
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          activation_style?: string[] | null
          annual_budget_estimate?: number | null
          brand_colors?: Json | null
          brand_guidelines_url?: string | null
          created_at?: string | null
          fiscal_year_end_month?: number | null
          hq_location?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          parent_company?: string | null
          previous_sponsorships?: string[] | null
          regions?: string[] | null
          source?: string | null
          status?: string | null
          target_demo?: Json | null
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_brands_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_contacts: {
        Row: {
          birthday: string | null
          brand_id: string
          comms_preference: string | null
          created_at: string | null
          decision_power: string | null
          department: string | null
          email: string | null
          id: string
          last_touch_at: string | null
          linkedin_url: string | null
          name: string
          next_touch_at: string | null
          personal_notes: string | null
          phone: string | null
          reports_to_contact_id: string | null
          title: string | null
          touch_cadence_days: number | null
        }
        Insert: {
          birthday?: string | null
          brand_id: string
          comms_preference?: string | null
          created_at?: string | null
          decision_power?: string | null
          department?: string | null
          email?: string | null
          id?: string
          last_touch_at?: string | null
          linkedin_url?: string | null
          name: string
          next_touch_at?: string | null
          personal_notes?: string | null
          phone?: string | null
          reports_to_contact_id?: string | null
          title?: string | null
          touch_cadence_days?: number | null
        }
        Update: {
          birthday?: string | null
          brand_id?: string
          comms_preference?: string | null
          created_at?: string | null
          decision_power?: string | null
          department?: string | null
          email?: string | null
          id?: string
          last_touch_at?: string | null
          linkedin_url?: string | null
          name?: string
          next_touch_at?: string | null
          personal_notes?: string | null
          phone?: string | null
          reports_to_contact_id?: string | null
          title?: string | null
          touch_cadence_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_contacts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "sponsor_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_contacts_reports_to_contact_id_fkey"
            columns: ["reports_to_contact_id"]
            isOneToOne: false
            referencedRelation: "sponsor_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_deals: {
        Row: {
          brand_id: string
          contact_id: string | null
          created_at: string | null
          end_date: string | null
          exclusivity_terms: string | null
          id: string
          next_action: string | null
          next_action_due: string | null
          notes: string | null
          owner_id: string | null
          payment_schedule: Json | null
          payment_terms: string | null
          property_id: string | null
          renewal_probability: number | null
          renewal_window: string | null
          stage: string | null
          start_date: string | null
          updated_at: string | null
          value_cents: number | null
        }
        Insert: {
          brand_id: string
          contact_id?: string | null
          created_at?: string | null
          end_date?: string | null
          exclusivity_terms?: string | null
          id?: string
          next_action?: string | null
          next_action_due?: string | null
          notes?: string | null
          owner_id?: string | null
          payment_schedule?: Json | null
          payment_terms?: string | null
          property_id?: string | null
          renewal_probability?: number | null
          renewal_window?: string | null
          stage?: string | null
          start_date?: string | null
          updated_at?: string | null
          value_cents?: number | null
        }
        Update: {
          brand_id?: string
          contact_id?: string | null
          created_at?: string | null
          end_date?: string | null
          exclusivity_terms?: string | null
          id?: string
          next_action?: string | null
          next_action_due?: string | null
          notes?: string | null
          owner_id?: string | null
          payment_schedule?: Json | null
          payment_terms?: string | null
          property_id?: string | null
          renewal_probability?: number | null
          renewal_window?: string | null
          stage?: string | null
          start_date?: string | null
          updated_at?: string | null
          value_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_deals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "sponsor_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "sponsor_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_deals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "sponsor_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_deliverables: {
        Row: {
          completed_at: string | null
          created_at: string | null
          deal_id: string
          description: string
          due_date: string | null
          id: string
          proof_urls: string[] | null
          recap_status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          deal_id: string
          description: string
          due_date?: string | null
          id?: string
          proof_urls?: string[] | null
          recap_status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          deal_id?: string
          description?: string
          due_date?: string | null
          id?: string
          proof_urls?: string[] | null
          recap_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_deliverables_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "sponsor_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_pipeline: {
        Row: {
          assigned_to: string | null
          brand_name: string
          category: string
          closed_amount: number | null
          contact_email: string | null
          contact_name: string | null
          contact_role: string | null
          contract_url: string | null
          created_at: string | null
          id: string
          industry: string | null
          last_contact_date: string | null
          next_followup_date: string | null
          notes: string | null
          pitch_amount: number | null
          proposal_url: string | null
          stage: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          brand_name: string
          category?: string
          closed_amount?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_role?: string | null
          contract_url?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          next_followup_date?: string | null
          notes?: string | null
          pitch_amount?: number | null
          proposal_url?: string | null
          stage?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          brand_name?: string
          category?: string
          closed_amount?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_role?: string | null
          contract_url?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          next_followup_date?: string | null
          notes?: string | null
          pitch_amount?: number | null
          proposal_url?: string | null
          stage?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_pipeline_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_properties: {
        Row: {
          audience_size: number | null
          created_at: string | null
          demo_breakdown: Json | null
          engagement_metrics: Json | null
          exclusivity_restrictions: string | null
          geo_split: Json | null
          id: string
          inventory: Json | null
          name: string
          property_type: string | null
          rate_card: Json | null
        }
        Insert: {
          audience_size?: number | null
          created_at?: string | null
          demo_breakdown?: Json | null
          engagement_metrics?: Json | null
          exclusivity_restrictions?: string | null
          geo_split?: Json | null
          id?: string
          inventory?: Json | null
          name: string
          property_type?: string | null
          rate_card?: Json | null
        }
        Update: {
          audience_size?: number | null
          created_at?: string | null
          demo_breakdown?: Json | null
          engagement_metrics?: Json | null
          exclusivity_restrictions?: string | null
          geo_split?: Json | null
          id?: string
          inventory?: Json | null
          name?: string
          property_type?: string | null
          rate_card?: Json | null
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
      store_orders: {
        Row: {
          amount: number | null
          customer_email: string | null
          customer_name: string | null
          fulfillment_status: string
          id: string
          order_number: string | null
          ordered_at: string | null
          product_name: string | null
          quantity: number | null
          shipped_at: string | null
          shipping_carrier: string | null
          source: string | null
          tracking_number: string | null
          variant: string | null
        }
        Insert: {
          amount?: number | null
          customer_email?: string | null
          customer_name?: string | null
          fulfillment_status?: string
          id?: string
          order_number?: string | null
          ordered_at?: string | null
          product_name?: string | null
          quantity?: number | null
          shipped_at?: string | null
          shipping_carrier?: string | null
          source?: string | null
          tracking_number?: string | null
          variant?: string | null
        }
        Update: {
          amount?: number | null
          customer_email?: string | null
          customer_name?: string | null
          fulfillment_status?: string
          id?: string
          order_number?: string | null
          ordered_at?: string | null
          product_name?: string | null
          quantity?: number | null
          shipped_at?: string | null
          shipping_carrier?: string | null
          source?: string | null
          tracking_number?: string | null
          variant?: string | null
        }
        Relationships: []
      }
      streaming_metrics: {
        Row: {
          distro_artist_id: string
          followers: number | null
          id: string
          monthly_listeners: number | null
          notes: string | null
          platform: string
          recorded_at: string | null
          streams_30d: number | null
          url: string | null
        }
        Insert: {
          distro_artist_id: string
          followers?: number | null
          id?: string
          monthly_listeners?: number | null
          notes?: string | null
          platform: string
          recorded_at?: string | null
          streams_30d?: number | null
          url?: string | null
        }
        Update: {
          distro_artist_id?: string
          followers?: number | null
          id?: string
          monthly_listeners?: number | null
          notes?: string | null
          platform?: string
          recorded_at?: string | null
          streams_30d?: number | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "streaming_metrics_distro_artist_id_fkey"
            columns: ["distro_artist_id"]
            isOneToOne: false
            referencedRelation: "distro_artists"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      weekly_kpi_snapshots: {
        Row: {
          actual_value: number | null
          created_at: string | null
          id: string
          metric_name: string
          notes: string | null
          status: string | null
          target_value: number | null
          team_member_id: string | null
          week_ending: string
        }
        Insert: {
          actual_value?: number | null
          created_at?: string | null
          id?: string
          metric_name: string
          notes?: string | null
          status?: string | null
          target_value?: number | null
          team_member_id?: string | null
          week_ending: string
        }
        Update: {
          actual_value?: number | null
          created_at?: string | null
          id?: string
          metric_name?: string
          notes?: string | null
          status?: string | null
          target_value?: number | null
          team_member_id?: string | null
          week_ending?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_kpi_snapshots_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_crm_role: { Args: { _role: string }; Returns: boolean }
      my_crm_role: { Args: never; Returns: string }
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
