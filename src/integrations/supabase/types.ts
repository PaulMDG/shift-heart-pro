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
      agency_settings: {
        Row: {
          accuracy_threshold_m: number
          geofence_radius_m: number
          id: string
          is_global: boolean
          repeat_failure_threshold: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accuracy_threshold_m?: number
          geofence_radius_m?: number
          id?: string
          is_global?: boolean
          repeat_failure_threshold?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accuracy_threshold_m?: number
          geofence_radius_m?: number
          id?: string
          is_global?: boolean
          repeat_failure_threshold?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
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
      care_note_audits: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_value: string | null
          old_value: string | null
          shift_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          shift_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          shift_id?: string
        }
        Relationships: []
      }
      care_task_templates: {
        Row: {
          active: boolean
          care_type: string
          created_at: string
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          care_type: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          care_type?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      caregiver_documents: {
        Row: {
          caregiver_id: string
          doc_type: string
          expiry_date: string | null
          file_path: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          caregiver_id: string
          doc_type: string
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          caregiver_id?: string
          doc_type?: string
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
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
      client_documents: {
        Row: {
          client_id: string
          doc_type: string
          expiry_date: string | null
          file_path: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          doc_type: string
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          doc_type?: string
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string
          authorized_hours_per_week: number | null
          backup_caregiver_id: string | null
          billing_contact: string | null
          care_needs: Json
          care_plan_summary: string
          care_type: string
          compliance: Json
          created_at: string
          date_of_birth: string | null
          emergency_contact: string
          emergency_phone: string
          home_safety: Json
          id: string
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          primary_language: string | null
          responsible_party: string | null
          service_start_date: string | null
          service_type: string | null
        }
        Insert: {
          address?: string
          authorized_hours_per_week?: number | null
          backup_caregiver_id?: string | null
          billing_contact?: string | null
          care_needs?: Json
          care_plan_summary?: string
          care_type?: string
          compliance?: Json
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string
          emergency_phone?: string
          home_safety?: Json
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          primary_language?: string | null
          responsible_party?: string | null
          service_start_date?: string | null
          service_type?: string | null
        }
        Update: {
          address?: string
          authorized_hours_per_week?: number | null
          backup_caregiver_id?: string | null
          billing_contact?: string | null
          care_needs?: Json
          care_plan_summary?: string
          care_type?: string
          compliance?: Json
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string
          emergency_phone?: string
          home_safety?: Json
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          primary_language?: string | null
          responsible_party?: string | null
          service_start_date?: string | null
          service_type?: string | null
        }
        Relationships: []
      }
      incident_reports: {
        Row: {
          action_taken: string | null
          attachment_path: string | null
          caregiver_id: string | null
          client_id: string | null
          created_at: string
          description: string
          id: string
          incident_type: string
          occurred_at: string
          reported_by: string
          severity: string
          shift_id: string | null
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          attachment_path?: string | null
          caregiver_id?: string | null
          client_id?: string | null
          created_at?: string
          description: string
          id?: string
          incident_type: string
          occurred_at?: string
          reported_by: string
          severity?: string
          shift_id?: string | null
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          attachment_path?: string | null
          caregiver_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string
          id?: string
          incident_type?: string
          occurred_at?: string
          reported_by?: string
          severity?: string
          shift_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_duration: number | null
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          category: string
          content: string
          converted_to_care_note_at: string | null
          converted_to_care_note_by: string | null
          converted_to_care_note_shift_id: string | null
          created_at: string
          id: string
          mentions: string[]
          pinned: boolean
          reactions: Json
          read: boolean
          recipient_id: string
          sender_id: string
          shift_id: string | null
          voice_transcript: string | null
        }
        Insert: {
          attachment_duration?: number | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          category?: string
          content: string
          converted_to_care_note_at?: string | null
          converted_to_care_note_by?: string | null
          converted_to_care_note_shift_id?: string | null
          created_at?: string
          id?: string
          mentions?: string[]
          pinned?: boolean
          reactions?: Json
          read?: boolean
          recipient_id: string
          sender_id: string
          shift_id?: string | null
          voice_transcript?: string | null
        }
        Update: {
          attachment_duration?: number | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          category?: string
          content?: string
          converted_to_care_note_at?: string | null
          converted_to_care_note_by?: string | null
          converted_to_care_note_shift_id?: string | null
          created_at?: string
          id?: string
          mentions?: string[]
          pinned?: boolean
          reactions?: Json
          read?: boolean
          recipient_id?: string
          sender_id?: string
          shift_id?: string | null
          voice_transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_converted_to_care_note_shift_id_fkey"
            columns: ["converted_to_care_note_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          admin_alerts: boolean
          in_shift_messages: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_alerts?: boolean
          in_shift_messages?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_alerts?: boolean
          in_shift_messages?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          email_payload: Json | null
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
          email_payload?: Json | null
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
          email_payload?: Json | null
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
          active_status: boolean
          address: string | null
          availability_notes: string | null
          avatar_url: string | null
          bio: string | null
          certifications: string | null
          created_at: string
          date_of_birth: string | null
          direct_deposit_on_file: boolean
          drivers_license_number: string | null
          drivers_license_state: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employment_type: string | null
          full_name: string
          government_id_number: string | null
          government_id_state: string | null
          id: string
          pay_rate: number | null
          payroll_method: string | null
          phone: string | null
          position: string | null
          preferred_name: string | null
          skills_availability: Json
          ssn_last4: string | null
          start_date: string | null
          tax_form_status: string | null
          updated_at: string
        }
        Insert: {
          active_status?: boolean
          address?: string | null
          availability_notes?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string | null
          created_at?: string
          date_of_birth?: string | null
          direct_deposit_on_file?: boolean
          drivers_license_number?: string | null
          drivers_license_state?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_type?: string | null
          full_name?: string
          government_id_number?: string | null
          government_id_state?: string | null
          id: string
          pay_rate?: number | null
          payroll_method?: string | null
          phone?: string | null
          position?: string | null
          preferred_name?: string | null
          skills_availability?: Json
          ssn_last4?: string | null
          start_date?: string | null
          tax_form_status?: string | null
          updated_at?: string
        }
        Update: {
          active_status?: boolean
          address?: string | null
          availability_notes?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string | null
          created_at?: string
          date_of_birth?: string | null
          direct_deposit_on_file?: boolean
          drivers_license_number?: string | null
          drivers_license_state?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_type?: string | null
          full_name?: string
          government_id_number?: string | null
          government_id_state?: string | null
          id?: string
          pay_rate?: number | null
          payroll_method?: string | null
          phone?: string | null
          position?: string | null
          preferred_name?: string | null
          skills_availability?: Json
          ssn_last4?: string | null
          start_date?: string | null
          tax_form_status?: string | null
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
      shift_tasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          label: string
          shift_id: string
          sort_order: number
          template_id: string | null
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          label: string
          shift_id: string
          sort_order?: number
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          label?: string
          shift_id?: string
          sort_order?: number
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_tasks_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "care_task_templates"
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
      mark_message_converted: {
        Args: { p_message_id: string; p_shift_id: string }
        Returns: undefined
      }
      seed_shift_tasks: { Args: { p_shift_id: string }; Returns: number }
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
