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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      billing_rates: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string
          effective_from: string
          hourly_rate: number
          id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by: string
          effective_from?: string
          hourly_rate?: number
          id?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string
          effective_from?: string
          hourly_rate?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_rates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_rates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_caregiver_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          created_at: string
          expiry_date: string | null
          id: string
          issuer: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          issuer?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          issuer?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string
          care_plan_summary: string
          care_type: string
          created_at: string
          emergency_contact: string
          emergency_phone: string
          id: string
          lat: number | null
          lng: number | null
          name: string
        }
        Insert: {
          address?: string
          care_plan_summary?: string
          care_type?: string
          created_at?: string
          emergency_contact?: string
          emergency_phone?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
        }
        Update: {
          address?: string
          care_plan_summary?: string
          care_type?: string
          created_at?: string
          emergency_contact?: string
          emergency_phone?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          recipient_id: string
          sender_id: string
          shift_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id: string
          sender_id: string
          shift_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id?: string
          sender_id?: string
          shift_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          email_status: string
          id: string
          message: string
          read: boolean
          related_shift_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_status?: string
          id?: string
          message: string
          read?: boolean
          related_shift_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_status?: string
          id?: string
          message?: string
          read?: boolean
          related_shift_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          availability_notes: string | null
          avatar_url: string | null
          bio: string | null
          certifications: string | null
          created_at: string
          date_of_birth: string | null
          drivers_license_number: string | null
          drivers_license_state: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          government_id_number: string | null
          government_id_state: string | null
          id: string
          phone: string | null
          ssn_last4: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          availability_notes?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string | null
          created_at?: string
          date_of_birth?: string | null
          drivers_license_number?: string | null
          drivers_license_state?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          government_id_number?: string | null
          government_id_state?: string | null
          id: string
          phone?: string | null
          ssn_last4?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          availability_notes?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string | null
          created_at?: string
          date_of_birth?: string | null
          drivers_license_number?: string | null
          drivers_license_state?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          government_id_number?: string | null
          government_id_state?: string | null
          id?: string
          phone?: string | null
          ssn_last4?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shift_swap_requests: {
        Row: {
          created_at: string
          id: string
          requester_id: string
          shift_id: string
          status: string
          target_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          requester_id: string
          shift_id: string
          status?: string
          target_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          requester_id?: string
          shift_id?: string
          status?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_swap_requests_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          admin_notes: string
          assignment_status: string
          caregiver_id: string | null
          client_id: string
          clock_in_accuracy: number | null
          clock_in_lat: number | null
          clock_in_lng: number | null
          clock_in_selfie_url: string | null
          clock_in_time: string | null
          clock_out_accuracy: number | null
          clock_out_lat: number | null
          clock_out_lng: number | null
          clock_out_notes: string | null
          clock_out_time: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          start_time: string
          status: string
          timesheet_status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string
          assignment_status?: string
          caregiver_id?: string | null
          client_id: string
          clock_in_accuracy?: number | null
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_in_selfie_url?: string | null
          clock_in_time?: string | null
          clock_out_accuracy?: number | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          clock_out_notes?: string | null
          clock_out_time?: string | null
          created_at?: string
          date: string
          end_time: string
          id?: string
          start_time: string
          status?: string
          timesheet_status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string
          assignment_status?: string
          caregiver_id?: string | null
          client_id?: string
          clock_in_accuracy?: number | null
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_in_selfie_url?: string | null
          clock_in_time?: string | null
          clock_out_accuracy?: number | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          clock_out_notes?: string | null
          clock_out_time?: string | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          start_time?: string
          status?: string
          timesheet_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_caregiver_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      clients_caregiver_safe: {
        Row: {
          address: string | null
          care_type: string | null
          created_at: string | null
          id: string | null
          lat: number | null
          lng: number | null
          name: string | null
        }
        Insert: {
          address?: string | null
          care_type?: string | null
          created_at?: string | null
          id?: string | null
          lat?: number | null
          lng?: number | null
          name?: string | null
        }
        Update: {
          address?: string | null
          care_type?: string | null
          created_at?: string | null
          id?: string | null
          lat?: number | null
          lng?: number | null
          name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_swap_request: { Args: { swap_id: string }; Returns: undefined }
      create_swap_request: {
        Args: { p_shift_id: string; p_target_id?: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
