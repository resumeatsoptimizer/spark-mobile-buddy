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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_insights: {
        Row: {
          confidence_score: number | null
          created_at: string
          event_id: string | null
          expires_at: string | null
          id: string
          insight_data: Json
          insight_type: string
          metadata: Json | null
          status: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          event_id?: string | null
          expires_at?: string | null
          id?: string
          insight_data?: Json
          insight_type: string
          metadata?: Json | null
          status?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          event_id?: string | null
          expires_at?: string | null
          id?: string
          insight_data?: Json
          insight_type?: string
          metadata?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_analytics"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ai_insights_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "registration_health"
            referencedColumns: ["event_id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          alert_channels: Json | null
          condition_config: Json
          created_at: string
          enabled: boolean | null
          id: string
          last_triggered_at: string | null
          rule_name: string
          rule_type: string
          updated_at: string
        }
        Insert: {
          alert_channels?: Json | null
          condition_config: Json
          created_at?: string
          enabled?: boolean | null
          id?: string
          last_triggered_at?: string | null
          rule_name: string
          rule_type: string
          updated_at?: string
        }
        Update: {
          alert_channels?: Json | null
          condition_config?: Json
          created_at?: string
          enabled?: boolean | null
          id?: string
          last_triggered_at?: string | null
          rule_name?: string
          rule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_category: string
          event_data: Json | null
          event_id: string | null
          event_type: string
          id: string
          registration_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_category: string
          event_data?: Json | null
          event_id?: string | null
          event_type: string
          id?: string
          registration_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_category?: string
          event_data?: Json | null
          event_id?: string | null
          event_type?: string
          id?: string
          registration_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_analytics"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "analytics_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "registration_health"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "analytics_events_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          api_key: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_name: string
          last_used_at: string | null
          organization_id: string | null
          permissions: Json
          rate_limit: number | null
          updated_at: string
        }
        Insert: {
          api_key: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name: string
          last_used_at?: string | null
          organization_id?: string | null
          permissions?: Json
          rate_limit?: number | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name?: string
          last_used_at?: string | null
          organization_id?: string | null
          permissions?: Json
          rate_limit?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_trail: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      custom_reports: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean | null
          last_generated_at: string | null
          report_config: Json
          report_name: string
          schedule_config: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean | null
          last_generated_at?: string | null
          report_config?: Json
          report_name: string
          schedule_config?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean | null
          last_generated_at?: string | null
          report_config?: Json
          report_name?: string
          schedule_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      custom_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string | null
          email_type: string
          error_message: string | null
          event_id: string | null
          id: string
          recipient_email: string
          registration_id: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email_type: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          recipient_email: string
          registration_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          recipient_email?: string
          registration_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_analytics"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "email_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "registration_health"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "email_logs_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_category_mapping: {
        Row: {
          category_id: string
          created_at: string
          event_id: string
          id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          event_id: string
          id?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_category_mapping_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_category_mapping_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_category_mapping_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_analytics"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_category_mapping_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "registration_health"
            referencedColumns: ["event_id"]
          },
        ]
      }
      event_check_ins: {
        Row: {
          check_in_method: string
          checked_in_at: string
          checked_in_by: string | null
          created_at: string
          device_info: Json | null
          event_id: string
          id: string
          location_data: Json | null
          registration_id: string
          station_id: string | null
        }
        Insert: {
          check_in_method?: string
          checked_in_at?: string
          checked_in_by?: string | null
          created_at?: string
          device_info?: Json | null
          event_id: string
          id?: string
          location_data?: Json | null
          registration_id: string
          station_id?: string | null
        }
        Update: {
          check_in_method?: string
          checked_in_at?: string
          checked_in_by?: string | null
          created_at?: string
          device_info?: Json | null
          event_id?: string
          id?: string
          location_data?: Json | null
          registration_id?: string
          station_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_check_ins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_check_ins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_analytics"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_check_ins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "registration_health"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_check_ins_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_messages: {
        Row: {
          content: string
          created_at: string
          event_id: string
          id: string
          is_announcement: boolean | null
          message_type: string
          metadata: Json | null
          read_by: Json | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          event_id: string
          id?: string
          is_announcement?: boolean | null
          message_type?: string
          metadata?: Json | null
          read_by?: Json | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          is_announcement?: boolean | null
          message_type?: string
          metadata?: Json | null
          read_by?: Json | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_analytics"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "registration_health"
            referencedColumns: ["event_id"]
          },
        ]
      }
      event_series: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          recurrence_rule: Json
          template_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          recurrence_rule: Json
          template_data: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          recurrence_rule?: Json
          template_data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      event_tag_mapping: {
        Row: {
          created_at: string
          event_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tag_mapping_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tag_mapping_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_analytics"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_tag_mapping_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "registration_health"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_tag_mapping_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "event_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      event_templates: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          template_data: Json
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          template_data: Json
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          template_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          allow_overbooking: boolean | null
          auto_promote_rule: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          custom_fields: Json | null
          description: string | null
          end_date: string
          event_type: string | null
          google_map_embed_code: string | null
          google_map_url: string | null
          id: string
          invitation_code: string | null
          location: string | null
          max_waitlist_size: number | null
          meeting_id: string | null
          meeting_platform: string | null
          meeting_url: string | null
          overbooking_percentage: number | null
          promote_window_hours: number | null
          registration_close_date: string | null
          registration_open_date: string | null
          seats_remaining: number
          seats_total: number
          series_id: string | null
          start_date: string
          template_id: string | null
          title: string
          updated_at: string
          visibility: string | null
          waitlist_enabled: boolean | null
        }
        Insert: {
          allow_overbooking?: boolean | null
          auto_promote_rule?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          custom_fields?: Json | null
          description?: string | null
          end_date: string
          event_type?: string | null
          google_map_embed_code?: string | null
          google_map_url?: string | null
          id?: string
          invitation_code?: string | null
          location?: string | null
          max_waitlist_size?: number | null
          meeting_id?: string | null
          meeting_platform?: string | null
          meeting_url?: string | null
          overbooking_percentage?: number | null
          promote_window_hours?: number | null
          registration_close_date?: string | null
          registration_open_date?: string | null
          seats_remaining: number
          seats_total: number
          series_id?: string | null
          start_date: string
          template_id?: string | null
          title: string
          updated_at?: string
          visibility?: string | null
          waitlist_enabled?: boolean | null
        }
        Update: {
          allow_overbooking?: boolean | null
          auto_promote_rule?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          custom_fields?: Json | null
          description?: string | null
          end_date?: string
          event_type?: string | null
          google_map_embed_code?: string | null
          google_map_url?: string | null
          id?: string
          invitation_code?: string | null
          location?: string | null
          max_waitlist_size?: number | null
          meeting_id?: string | null
          meeting_platform?: string | null
          meeting_url?: string | null
          overbooking_percentage?: number | null
          promote_window_hours?: number | null
          registration_close_date?: string | null
          registration_open_date?: string | null
          seats_remaining?: number
          seats_total?: number
          series_id?: string | null
          start_date?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          visibility?: string | null
          waitlist_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_member_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "event_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      google_sheets_sync: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_id: string | null
          id: string
          last_sync_at: string | null
          sheet_id: string
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          last_sync_at?: string | null
          sheet_id: string
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          last_sync_at?: string | null
          sheet_id?: string
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_sheets_sync_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_sheets_sync_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_analytics"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "google_sheets_sync_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "registration_health"
            referencedColumns: ["event_id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          event_id: string | null
          id: string
          integration_type: string
          request_data: Json | null
          response_data: Json | null
          retry_count: number | null
          status: string
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          integration_type: string
          request_data?: Json | null
          response_data?: Json | null
          retry_count?: number | null
          status: string
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          integration_type?: string
          request_data?: Json | null
          response_data?: Json | null
          retry_count?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_analytics"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "integration_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "registration_health"
            referencedColumns: ["event_id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          access_token: string | null
          config: Json
          created_at: string
          id: string
          integration_type: string
          is_enabled: boolean | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          config?: Json
          created_at?: string
          id?: string
          integration_type: string
          is_enabled?: boolean | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          config?: Json
          created_at?: string
          id?: string
          integration_type?: string
          is_enabled?: boolean | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      member_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          note: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          new_status: string
          old_status: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          new_status: string
          old_status?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          new_status?: string
          old_status?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      member_tags: {
        Row: {
          created_at: string
          id: string
          tag: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          event_id: string | null
          id: string
          notification_type: string
          trigger_config: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          event_id?: string | null
          id?: string
          notification_type: string
          trigger_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          event_id?: string | null
          id?: string
          notification_type?: string
          trigger_config?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_analytics"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "notification_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "registration_health"
            referencedColumns: ["event_id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          authorize_uri: string | null
          card_brand: string | null
          card_last4: string | null
          created_at: string
          currency: string
          failure_code: string | null
          failure_message: string | null
          id: string
          idempotency_key: string | null
          omise_charge_id: string | null
          payment_metadata: Json | null
          payment_method: string | null
          qr_code_data: Json | null
          receipt_url: string | null
          refund_amount: number | null
          refunded_at: string | null
          registration_id: string
          require_3ds: boolean | null
          source_id: string | null
          status: string
          updated_at: string
          webhook_data: Json | null
        }
        Insert: {
          amount: number
          authorize_uri?: string | null
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string
          currency?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          idempotency_key?: string | null
          omise_charge_id?: string | null
          payment_metadata?: Json | null
          payment_method?: string | null
          qr_code_data?: Json | null
          receipt_url?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          registration_id: string
          require_3ds?: boolean | null
          source_id?: string | null
          status?: string
          updated_at?: string
          webhook_data?: Json | null
        }
        Update: {
          amount?: number
          authorize_uri?: string | null
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string
          currency?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          idempotency_key?: string | null
          omise_charge_id?: string | null
          payment_metadata?: Json | null
          payment_method?: string | null
          qr_code_data?: Json | null
          receipt_url?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          registration_id?: string
          require_3ds?: boolean | null
          source_id?: string | null
          status?: string
          updated_at?: string
          webhook_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_models: {
        Row: {
          accuracy_metrics: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          last_trained_at: string | null
          model_type: string
          model_version: string
          training_data: Json
          updated_at: string
        }
        Insert: {
          accuracy_metrics?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_trained_at?: string | null
          model_type: string
          model_version: string
          training_data?: Json
          updated_at?: string
        }
        Update: {
          accuracy_metrics?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_trained_at?: string | null
          model_type?: string
          model_version?: string
          training_data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          phone: string | null
          preferences: Json | null
          social_links: Json | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          social_links?: Json | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          social_links?: Json | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          is_active: boolean | null
          subscription_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          subscription_data: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          subscription_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          confirm_token: string | null
          created_at: string
          event_id: string
          form_data: Json | null
          id: string
          payment_status: string
          priority_score: number | null
          promoted_at: string | null
          promotion_expires_at: string | null
          status: string
          ticket_generated_at: string | null
          ticket_type_id: string | null
          ticket_url: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confirm_token?: string | null
          created_at?: string
          event_id: string
          form_data?: Json | null
          id?: string
          payment_status?: string
          priority_score?: number | null
          promoted_at?: string | null
          promotion_expires_at?: string | null
          status?: string
          ticket_generated_at?: string | null
          ticket_type_id?: string | null
          ticket_url?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confirm_token?: string | null
          created_at?: string
          event_id?: string
          form_data?: Json | null
          id?: string
          payment_status?: string
          priority_score?: number | null
          promoted_at?: string | null
          promotion_expires_at?: string | null
          status?: string
          ticket_generated_at?: string | null
          ticket_type_id?: string | null
          ticket_url?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_analytics"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "registration_health"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "registrations_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_member_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_tasks: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_id: string | null
          id: string
          metadata: Json | null
          registration_id: string | null
          retry_count: number | null
          scheduled_for: string
          status: string | null
          task_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          registration_id?: string | null
          retry_count?: number | null
          scheduled_for: string
          status?: string | null
          task_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          registration_id?: string | null
          retry_count?: number | null
          scheduled_for?: string
          status?: string | null
          task_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_analytics"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scheduled_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "registration_health"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scheduled_tasks_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action_data: Json | null
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      social_media_posts: {
        Row: {
          created_at: string
          engagement_data: Json | null
          event_id: string
          id: string
          platform: string
          post_content: string
          post_id: string | null
          post_url: string | null
          posted_at: string | null
          scheduled_for: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          engagement_data?: Json | null
          event_id: string
          id?: string
          platform: string
          post_content: string
          post_id?: string | null
          post_url?: string | null
          posted_at?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          engagement_data?: Json | null
          event_id?: string
          id?: string
          platform?: string
          post_content?: string
          post_id?: string | null
          post_url?: string | null
          posted_at?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_analytics"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "social_media_posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "registration_health"
            referencedColumns: ["event_id"]
          },
        ]
      }
      system_metrics: {
        Row: {
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          recorded_at: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          recorded_at?: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          metric_value?: number
          recorded_at?: string
        }
        Relationships: []
      }
      team_memberships: {
        Row: {
          created_at: string
          id: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          name: string
          price: number | null
          seats_allocated: number
          seats_remaining: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          name: string
          price?: number | null
          seats_allocated: number
          seats_remaining: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          name?: string
          price?: number | null
          seats_allocated?: number
          seats_remaining?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_analytics"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "registration_health"
            referencedColumns: ["event_id"]
          },
        ]
      }
      user_2fa: {
        Row: {
          backup_codes: Json | null
          created_at: string
          id: string
          is_enabled: boolean | null
          secret: string
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          secret: string
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          secret?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_behavior_analytics: {
        Row: {
          action_data: Json | null
          action_type: string
          created_at: string
          device_info: Json | null
          event_id: string | null
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          created_at?: string
          device_info?: Json | null
          event_id?: string | null
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          created_at?: string
          device_info?: Json | null
          event_id?: string | null
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_behavior_analytics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_behavior_analytics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_analytics"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "user_behavior_analytics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "registration_health"
            referencedColumns: ["event_id"]
          },
        ]
      }
      user_interests: {
        Row: {
          created_at: string
          id: string
          interest_tag: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_tag: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_tag?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_member_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_analytics"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "waitlist_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "registration_health"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "waitlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_member_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "waitlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          events: Json
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          organization_id: string | null
          retry_config: Json | null
          secret_key: string
          updated_at: string
          webhook_name: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          events?: Json
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          organization_id?: string | null
          retry_config?: Json | null
          secret_key: string
          updated_at?: string
          webhook_name: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          events?: Json
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          organization_id?: string | null
          retry_config?: Json | null
          secret_key?: string
          updated_at?: string
          webhook_name?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_member_statistics: {
        Row: {
          activity_level: string | null
          created_at: string | null
          email: string | null
          engagement_score: number | null
          last_login_at: string | null
          last_registration_at: string | null
          name: string | null
          status: string | null
          total_amount_paid: number | null
          total_events_attended: number | null
          total_payments: number | null
          total_registrations: number | null
          user_id: string | null
        }
        Relationships: []
      }
      payment_analytics: {
        Row: {
          avg_payment_amount: number | null
          event_id: string | null
          event_title: string | null
          failed_payments: number | null
          successful_payments: number | null
          total_payments: number | null
          total_refunds: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      registration_health: {
        Row: {
          capacity_utilization_pct: number | null
          confirmed_count: number | null
          event_id: string | null
          event_title: string | null
          paid_count: number | null
          pending_count: number | null
          seats_remaining: number | null
          seats_total: number | null
          start_date: string | null
          total_registrations: number | null
          waitlist_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      archive_old_events: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      calculate_event_popularity: {
        Args: { event_id: string }
        Returns: number
      }
      can_refund_payment: {
        Args: { p_payment_id: string }
        Returns: boolean
      }
      ensure_user_profile: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      get_member_details: {
        Args: { member_id: string }
        Returns: Json
      }
      get_member_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_members: number
          inactive_members: number
          total_members: number
          total_revenue: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_payment_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_payment_id: string
          p_user_id: string
        }
        Returns: string
      }
      recalculate_event_seats: {
        Args: { event_id_param: string }
        Returns: undefined
      }
      refresh_member_statistics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_member_stats_mv: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_member_status: {
        Args: {
          changed_by_id: string
          member_id: string
          new_status: string
          reason_text?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "participant"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "staff", "participant"],
    },
  },
} as const
