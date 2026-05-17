export type UserRole = "admin" | "distribution" | "marketing" | "sponsorships";
export type CrmRole = "admin" | "mike" | "steven" | "jay";

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
          service: "security" | "dj" | "venue" | "promoter" | "event_recap" | "artist" | "bartender";
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
      team_members: {
        Row: {
          id: string;
          auth_user_id: string | null;
          name: string;
          role: CrmRole;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["team_members"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["team_members"]["Insert"]>;
      };
      crm_bookings: {
        Row: {
          id: string;
          artist_name: string;
          artist_contact: string | null;
          song_or_project: string | null;
          package: "550" | "1000" | "1500_premium" | null;
          amount_quoted: number | null;
          status: "inquiry" | "quoted" | "booked" | "shot" | "delivered" | "paid" | "dead";
          stripe_deposit_paid: boolean;
          shoot_date: string | null;
          source: "inbound" | "outbound" | "repeat" | null;
          notes: string | null;
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["crm_bookings"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["crm_bookings"]["Insert"]>;
      };
      artist_prospects: {
        Row: {
          id: string;
          name: string;
          city: string | null;
          genre: string | null;
          spotify_monthly_listeners: number | null;
          ig_followers: number | null;
          ig_handle: string | null;
          contact_email: string | null;
          contact_method: "dm" | "email" | "manager" | null;
          growth_velocity: number | null;
          fit_score: number | null;
          intended_lane: "booking" | "distro_jv" | "distro_pure" | "media_agency" | null;
          outreach_status: "cold" | "pitched" | "replied" | "discovery_call" | "closed" | "dead";
          last_contact_date: string | null;
          next_followup_date: string | null;
          notes: string | null;
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["artist_prospects"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["artist_prospects"]["Insert"]>;
      };
      distro_artists: {
        Row: {
          id: string;
          artist_name: string;
          artist_contact: string | null;
          side: "jv_owned" | "pure_service";
          onboarding_status: "intake" | "docs_pending" | "docs_signed" | "live" | "churned";
          monthly_streams: number | null;
          pmg_share_percent: number | null;
          publishing_owned: boolean;
          admin_rights: boolean;
          contract_url: string | null;
          notes: string | null;
          onboarded_by: string | null;
          onboarded_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["distro_artists"]["Row"], "id" | "onboarded_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["distro_artists"]["Insert"]>;
      };
      royalty_payments: {
        Row: {
          id: string;
          artist_id: string | null;
          period_month: string;
          gross_royalty: number;
          pmg_share: number;
          paid_to_artist: number;
          source: "spotify" | "apple" | "youtube" | "tidal" | "amazon" | "other" | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["royalty_payments"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["royalty_payments"]["Insert"]>;
      };
      sponsor_pipeline: {
        Row: {
          id: string;
          brand_name: string;
          category: "brand" | "event" | "publication";
          contact_name: string | null;
          contact_email: string | null;
          contact_role: string | null;
          industry: string | null;
          pitch_amount: number | null;
          stage: "lead" | "pitched" | "replied" | "discovery_call" | "proposal" | "closed" | "lost";
          last_contact_date: string | null;
          next_followup_date: string | null;
          proposal_url: string | null;
          contract_url: string | null;
          closed_amount: number | null;
          notes: string | null;
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sponsor_pipeline"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["sponsor_pipeline"]["Insert"]>;
      };
      store_orders: {
        Row: {
          id: string;
          order_number: string | null;
          customer_name: string | null;
          customer_email: string | null;
          product_name: string | null;
          variant: string | null;
          quantity: number;
          amount: number | null;
          fulfillment_status: "paid" | "to_ship" | "shipped" | "delivered" | "returned";
          tracking_number: string | null;
          shipping_carrier: string | null;
          ordered_at: string;
          shipped_at: string | null;
          source: "shopify" | "stripe" | "manual" | null;
        };
        Insert: Omit<Database["public"]["Tables"]["store_orders"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["store_orders"]["Insert"]>;
      };
      media_agency_projects: {
        Row: {
          id: string;
          artist_name: string;
          artist_contact: string | null;
          tier: "starter_350" | "release_650" | "campaign_1000" | null;
          amount: number | null;
          travel_addon: number;
          scope_notes: string | null;
          status: "inquiry" | "quoted" | "booked" | "in_production" | "delivered" | "paid" | "dead";
          stripe_paid: boolean;
          shoot_date: string | null;
          notes: string | null;
          sold_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["media_agency_projects"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["media_agency_projects"]["Insert"]>;
      };
      shoots: {
        Row: {
          id: string;
          booking_id: string | null;
          media_agency_project_id: string | null;
          artist_name: string;
          shoot_date: string;
          shoot_window: string | null;
          shoot_type: "pmg_booking" | "media_agency";
          location: string | null;
          status: "scheduled" | "filming" | "edit" | "review" | "delivered";
          notes: string | null;
          shooter: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["shoots"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["shoots"]["Insert"]>;
      };
      deliverables: {
        Row: {
          id: string;
          shoot_id: string;
          format: string;
          status: "filmed" | "editing" | "reviewed" | "uploaded" | "published";
          platform: string[] | null;
          upload_urls: Record<string, string>;
          edited_by: string | null;
          filmed_at: string | null;
          delivered_at: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["deliverables"]["Row"], "id" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["deliverables"]["Insert"]>;
      };
      articles: {
        Row: {
          id: string;
          title: string;
          ai_draft: string | null;
          edited_draft: string | null;
          final_text: string | null;
          status: "ai_drafted" | "mike_editing" | "stevie_review" | "approved" | "published";
          artist_tags: string[];
          genre_tags: string[];
          city_tags: string[];
          hero_image_url: string | null;
          published_url: string | null;
          written_by: string | null;
          approved_by: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["articles"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["articles"]["Insert"]>;
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          source: "site" | "event" | "store" | "discord" | "manual" | null;
          subscribed_at: string;
          unsubscribed_at: string | null;
          is_active: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["newsletter_subscribers"]["Row"], "id" | "subscribed_at">;
        Update: Partial<Database["public"]["Tables"]["newsletter_subscribers"]["Insert"]>;
      };
      newsletter_sends: {
        Row: {
          id: string;
          subject: string | null;
          body: string | null;
          sent_at: string | null;
          recipients_count: number;
          open_rate: number | null;
          click_rate: number | null;
          composed_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["newsletter_sends"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["newsletter_sends"]["Insert"]>;
      };
      weekly_kpi_snapshots: {
        Row: {
          id: string;
          week_ending: string;
          team_member_id: string | null;
          metric_name: string;
          target_value: number | null;
          actual_value: number | null;
          status: "green" | "yellow" | "red" | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["weekly_kpi_snapshots"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["weekly_kpi_snapshots"]["Insert"]>;
      };
      activity_log: {
        Row: {
          id: string;
          team_member_id: string | null;
          entity_type: "crm_booking" | "artist_prospect" | "distro_artist" | "royalty_payment" | "sponsor_pipeline" | "store_order" | "shoot" | "deliverable" | "media_agency_project" | "article" | "newsletter_send";
          entity_id: string;
          action: "created" | "updated" | "status_changed" | "closed" | "contacted" | "pitched" | "assigned" | "deleted";
          payload: Record<string, unknown>;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activity_log"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["activity_log"]["Insert"]>;
      };
      kpi_targets: {
        Row: {
          id: string;
          team_member_role: string;
          metric_name: string;
          weekly_target: number;
          unit: "count" | "dollars" | "hours" | null;
          description: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["kpi_targets"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["kpi_targets"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      crm_role: CrmRole;
    };
  };
};
