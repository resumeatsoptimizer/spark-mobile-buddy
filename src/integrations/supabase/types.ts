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
            foreignKeyName: "email_logs_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
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
          google_map_embed_code: string | null
          google_map_url: string | null
          id: string
          invitation_code: string | null
          location: string | null
          max_waitlist_size: number | null
          overbooking_percentage: number | null
          promote_window_hours: number | null
          registration_close_date: string | null
          registration_open_date: string | null
          seats_remaining: number
          seats_total: number
          start_date: string
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
          google_map_embed_code?: string | null
          google_map_url?: string | null
          id?: string
          invitation_code?: string | null
          location?: string | null
          max_waitlist_size?: number | null
          overbooking_percentage?: number | null
          promote_window_hours?: number | null
          registration_close_date?: string | null
          registration_open_date?: string | null
          seats_remaining: number
          seats_total: number
          start_date: string
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
          google_map_embed_code?: string | null
          google_map_url?: string | null
          id?: string
          invitation_code?: string | null
          location?: string | null
          max_waitlist_size?: number | null
          overbooking_percentage?: number | null
          promote_window_hours?: number | null
          registration_close_date?: string | null
          registration_open_date?: string | null
          seats_remaining?: number
          seats_total?: number
          start_date?: string
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
            referencedRelation: "profiles"
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
        ]
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
        ]
      }
      payments: {
        Row: {
          amount: number
          card_last4: string | null
          created_at: string
          currency: string
          id: string
          omise_charge_id: string | null
          receipt_url: string | null
          refund_amount: number | null
          refunded_at: string | null
          registration_id: string
          status: string
          updated_at: string
          webhook_data: Json | null
        }
        Insert: {
          amount: number
          card_last4?: string | null
          created_at?: string
          currency?: string
          id?: string
          omise_charge_id?: string | null
          receipt_url?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          registration_id: string
          status?: string
          updated_at?: string
          webhook_data?: Json | null
        }
        Update: {
          amount?: number
          card_last4?: string | null
          created_at?: string
          currency?: string
          id?: string
          omise_charge_id?: string | null
          receipt_url?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          registration_id?: string
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
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          updated_at?: string
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
            foreignKeyName: "scheduled_tasks_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
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
        ]
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
            foreignKeyName: "waitlist_user_id_fkey"
            columns: ["user_id"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
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
