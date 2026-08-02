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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          status: Database["public"]["Enums"]["application_status"]
          teacher_id: string
          updated_at: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          status?: Database["public"]["Enums"]["application_status"]
          teacher_id: string
          updated_at?: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["document_type"]
          file_size_bytes: number | null
          file_url: string
          id: string
          name: string
          owner_id: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["document_type"]
          file_size_bytes?: number | null
          file_url: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["document_type"]
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      interviews: {
        Row: {
          application_id: string
          created_at: string
          duration_minutes: number
          id: string
          interviewer_name: string | null
          location: string | null
          meeting_url: string | null
          mode: Database["public"]["Enums"]["interview_mode"]
          notes: string | null
          outcome: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["interview_status"]
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          interviewer_name?: string | null
          location?: string | null
          meeting_url?: string | null
          mode?: Database["public"]["Enums"]["interview_mode"]
          notes?: string | null
          outcome?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["interview_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          interviewer_name?: string | null
          location?: string | null
          meeting_url?: string | null
          mode?: Database["public"]["Enums"]["interview_mode"]
          notes?: string | null
          outcome?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["interview_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          due_on: string | null
          id: string
          invoice_number: string
          issued_on: string
          paid_on: string | null
          school_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          due_on?: string | null
          id?: string
          invoice_number: string
          issued_on?: string
          paid_on?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          due_on?: string | null
          id?: string
          invoice_number?: string
          issued_on?: string
          paid_on?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string
          description: string | null
          employment_type: string
          grade: string | null
          id: string
          location: string | null
          min_experience_years: number
          openings: number
          salary_max: number | null
          salary_min: number | null
          salary_range: string | null
          school_id: string
          status: Database["public"]["Enums"]["job_status"]
          subject: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          employment_type?: string
          grade?: string | null
          id?: string
          location?: string | null
          min_experience_years?: number
          openings?: number
          salary_max?: number | null
          salary_min?: number | null
          salary_range?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["job_status"]
          subject?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          employment_type?: string
          grade?: string | null
          id?: string
          location?: string | null
          min_experience_years?: number
          openings?: number
          salary_max?: number | null
          salary_min?: number | null
          salary_range?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["job_status"]
          subject?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          board: string | null
          city: string | null
          contact_email: string | null
          created_at: string
          description: string | null
          hr_name: string | null
          id: string
          name: string
          owner_id: string
          phone: string | null
          principal_name: string | null
          school_type: string | null
          student_count: number | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          board?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          hr_name?: string | null
          id?: string
          name: string
          owner_id: string
          phone?: string | null
          principal_name?: string | null
          school_type?: string | null
          student_count?: number | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          board?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          hr_name?: string | null
          id?: string
          name?: string
          owner_id?: string
          phone?: string | null
          principal_name?: string | null
          school_type?: string | null
          student_count?: number | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      teacher_profiles: {
        Row: {
          available: boolean
          available_from: string | null
          bio: string | null
          city: string | null
          created_at: string
          current_salary: number | null
          current_school: string | null
          email: string | null
          expected_salary: number | null
          experience_years: number
          full_name: string | null
          grades: string[]
          headline: string | null
          languages: string[]
          location: string | null
          notice_period_days: number | null
          phone: string | null
          profile_photo_url: string | null
          qualification: string | null
          resume_url: string | null
          state: string | null
          status: Database["public"]["Enums"]["teacher_status"]
          subjects: string[]
          updated_at: string
          user_id: string
          video_demo_url: string | null
        }
        Insert: {
          available?: boolean
          available_from?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          current_salary?: number | null
          current_school?: string | null
          email?: string | null
          expected_salary?: number | null
          experience_years?: number
          full_name?: string | null
          grades?: string[]
          headline?: string | null
          languages?: string[]
          location?: string | null
          notice_period_days?: number | null
          phone?: string | null
          profile_photo_url?: string | null
          qualification?: string | null
          resume_url?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["teacher_status"]
          subjects?: string[]
          updated_at?: string
          user_id: string
          video_demo_url?: string | null
        }
        Update: {
          available?: boolean
          available_from?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          current_salary?: number | null
          current_school?: string | null
          email?: string | null
          expected_salary?: number | null
          experience_years?: number
          full_name?: string | null
          grades?: string[]
          headline?: string | null
          languages?: string[]
          location?: string | null
          notice_period_days?: number | null
          phone?: string | null
          profile_photo_url?: string | null
          qualification?: string | null
          resume_url?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["teacher_status"]
          subjects?: string[]
          updated_at?: string
          user_id?: string
          video_demo_url?: string | null
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
        Relationships: []
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
      app_role: "teacher" | "school" | "admin"
      application_status:
        | "submitted"
        | "reviewing"
        | "shortlisted"
        | "rejected"
        | "hired"
      document_type:
        | "resume"
        | "certificate"
        | "id_proof"
        | "photo"
        | "video"
        | "other"
      interview_mode: "in_person" | "video" | "phone"
      interview_status: "scheduled" | "completed" | "cancelled" | "no_show"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "void"
      job_status: "draft" | "published" | "closed"
      subscription_status: "trial" | "active" | "past_due" | "cancelled"
      teacher_status: "draft" | "active" | "placed" | "inactive"
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
      app_role: ["teacher", "school", "admin"],
      application_status: [
        "submitted",
        "reviewing",
        "shortlisted",
        "rejected",
        "hired",
      ],
      document_type: [
        "resume",
        "certificate",
        "id_proof",
        "photo",
        "video",
        "other",
      ],
      interview_mode: ["in_person", "video", "phone"],
      interview_status: ["scheduled", "completed", "cancelled", "no_show"],
      invoice_status: ["draft", "sent", "paid", "overdue", "void"],
      job_status: ["draft", "published", "closed"],
      subscription_status: ["trial", "active", "past_due", "cancelled"],
      teacher_status: ["draft", "active", "placed", "inactive"],
    },
  },
} as const
