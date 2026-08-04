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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          detail: string | null
          device: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string | null
          device?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string | null
          device?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      application_attachments: {
        Row: {
          application_id: string
          created_at: string
          file_path: string
          file_size_bytes: number | null
          id: string
          name: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          application_id: string
          created_at?: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          name: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          application_id?: string
          created_at?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          name?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_attachments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_comments: {
        Row: {
          application_id: string
          author_id: string
          body: string
          created_at: string
          id: string
          internal: boolean
          updated_at: string
        }
        Insert: {
          application_id: string
          author_id: string
          body: string
          created_at?: string
          id?: string
          internal?: boolean
          updated_at?: string
        }
        Update: {
          application_id?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          internal?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_comments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_events: {
        Row: {
          actor_id: string | null
          application_id: string
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          summary: string
          to_status: string | null
          updated_at: string
        }
        Insert: {
          actor_id?: string | null
          application_id: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          summary: string
          to_status?: string | null
          updated_at?: string
        }
        Update: {
          actor_id?: string | null
          application_id?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          summary?: string
          to_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          archived: boolean
          assigned_recruiter: string | null
          cover_letter: string | null
          created_at: string
          expected_salary: number | null
          id: string
          job_id: string
          status: Database["public"]["Enums"]["application_status"]
          teacher_id: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          assigned_recruiter?: string | null
          cover_letter?: string | null
          created_at?: string
          expected_salary?: number | null
          id?: string
          job_id: string
          status?: Database["public"]["Enums"]["application_status"]
          teacher_id: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          assigned_recruiter?: string | null
          cover_letter?: string | null
          created_at?: string
          expected_salary?: number | null
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
      calendar_events: {
        Row: {
          assigned_to: string | null
          created_at: string
          end_at: string | null
          event_type: Database["public"]["Enums"]["calendar_event_type"]
          id: string
          notes: string | null
          related_id: string | null
          related_type: string | null
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          id?: string
          notes?: string | null
          related_id?: string | null
          related_type?: string | null
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          id?: string
          notes?: string | null
          related_id?: string | null
          related_type?: string | null
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      communications: {
        Row: {
          attachment_url: string | null
          body: string | null
          channel: Database["public"]["Enums"]["comm_channel"]
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          occurred_at: string
          recruiter_id: string | null
          summary: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          body?: string | null
          channel?: Database["public"]["Enums"]["comm_channel"]
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          occurred_at?: string
          recruiter_id?: string | null
          summary: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          body?: string | null
          channel?: Database["public"]["Enums"]["comm_channel"]
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          occurred_at?: string
          recruiter_id?: string | null
          summary?: string
          updated_at?: string
        }
        Relationships: []
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
          feedback: string | null
          id: string
          interviewer_name: string | null
          location: string | null
          meeting_url: string | null
          mode: Database["public"]["Enums"]["interview_mode"]
          notes: string | null
          outcome: string | null
          rating: number | null
          result: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["interview_status"]
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          duration_minutes?: number
          feedback?: string | null
          id?: string
          interviewer_name?: string | null
          location?: string | null
          meeting_url?: string | null
          mode?: Database["public"]["Enums"]["interview_mode"]
          notes?: string | null
          outcome?: string | null
          rating?: number | null
          result?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["interview_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          duration_minutes?: number
          feedback?: string | null
          id?: string
          interviewer_name?: string | null
          location?: string | null
          meeting_url?: string | null
          mode?: Database["public"]["Enums"]["interview_mode"]
          notes?: string | null
          outcome?: string | null
          rating?: number | null
          result?: string | null
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
          assigned_recruiter: string | null
          benefits: string | null
          board: string | null
          created_at: string
          description: string | null
          employment_type: string
          grade: string | null
          id: string
          location: string | null
          min_experience_years: number
          openings: number
          required_skills: string[]
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
          assigned_recruiter?: string | null
          benefits?: string | null
          board?: string | null
          created_at?: string
          description?: string | null
          employment_type?: string
          grade?: string | null
          id?: string
          location?: string | null
          min_experience_years?: number
          openings?: number
          required_skills?: string[]
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
          assigned_recruiter?: string | null
          benefits?: string | null
          board?: string | null
          created_at?: string
          description?: string | null
          employment_type?: string
          grade?: string | null
          id?: string
          location?: string | null
          min_experience_years?: number
          openings?: number
          required_skills?: string[]
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
      lead_activities: {
        Row: {
          activity_type: string
          author_id: string | null
          body: string
          completed: boolean
          created_at: string
          due_at: string | null
          id: string
          lead_id: string
          updated_at: string
        }
        Insert: {
          activity_type?: string
          author_id?: string | null
          body: string
          completed?: boolean
          created_at?: string
          due_at?: string | null
          id?: string
          lead_id: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          author_id?: string | null
          body?: string
          completed?: boolean
          created_at?: string
          due_at?: string | null
          id?: string
          lead_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          board: string | null
          city: string | null
          contact_person: string | null
          converted_school_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          next_follow_up: string | null
          notes: string | null
          phone: string | null
          priority: Database["public"]["Enums"]["lead_priority"]
          school_name: string
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          board?: string | null
          city?: string | null
          contact_person?: string | null
          converted_school_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          priority?: Database["public"]["Enums"]["lead_priority"]
          school_name: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          board?: string | null
          city?: string | null
          contact_person?: string | null
          converted_school_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          priority?: Database["public"]["Enums"]["lead_priority"]
          school_name?: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_school_id_fkey"
            columns: ["converted_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_application: boolean
          email_interview: boolean
          email_job_match: boolean
          email_offer: boolean
          email_profile: boolean
          inapp_application: boolean
          inapp_interview: boolean
          inapp_job_match: boolean
          inapp_offer: boolean
          inapp_profile: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_application?: boolean
          email_interview?: boolean
          email_job_match?: boolean
          email_offer?: boolean
          email_profile?: boolean
          inapp_application?: boolean
          inapp_interview?: boolean
          inapp_job_match?: boolean
          inapp_offer?: boolean
          inapp_profile?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_application?: boolean
          email_interview?: boolean
          email_job_match?: boolean
          email_offer?: boolean
          email_profile?: boolean
          inapp_application?: boolean
          inapp_interview?: boolean
          inapp_job_match?: boolean
          inapp_offer?: boolean
          inapp_profile?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          archived: boolean
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
          archived?: boolean
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
          archived?: boolean
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
      saved_jobs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_teachers: {
        Row: {
          created_at: string
          id: string
          list_type: string
          school_owner_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_type?: string
          school_owner_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          list_type?: string
          school_owner_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_views: {
        Row: {
          config: Json
          created_at: string
          id: string
          module: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          module: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          module?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      school_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          pinned: boolean
          school_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          pinned?: boolean
          school_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          pinned?: boolean
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_notes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          assigned_recruiter: string | null
          board: string | null
          brand_color: string | null
          city: string | null
          contact_email: string | null
          created_at: string
          description: string | null
          hr_name: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          principal_name: string | null
          school_type: string | null
          student_count: number | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          tagline: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          assigned_recruiter?: string | null
          board?: string | null
          brand_color?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          hr_name?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          principal_name?: string | null
          school_type?: string | null
          student_count?: number | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          tagline?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          assigned_recruiter?: string | null
          board?: string | null
          brand_color?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          hr_name?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          principal_name?: string | null
          school_type?: string | null
          student_count?: number | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          tagline?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          related_id: string | null
          related_type: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          related_id?: string | null
          related_type?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          related_id?: string | null
          related_type?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_profiles: {
        Row: {
          assigned_recruiter: string | null
          available: boolean
          available_from: string | null
          bio: string | null
          boards: string[]
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
          assigned_recruiter?: string | null
          available?: boolean
          available_from?: string | null
          bio?: string | null
          boards?: string[]
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
          assigned_recruiter?: string | null
          available?: boolean
          available_from?: string | null
          bio?: string | null
          boards?: string[]
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
      user_settings: {
        Row: {
          created_at: string
          marketing_emails: boolean
          profile_visibility: string
          searchable: boolean
          show_contact: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          marketing_emails?: boolean
          profile_visibility?: string
          searchable?: boolean
          show_contact?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          marketing_emails?: boolean
          profile_visibility?: string
          searchable?: boolean
          show_contact?: boolean
          updated_at?: string
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
      is_application_teacher: {
        Args: { _application_id: string; _user_id: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      log_communication: {
        Args: {
          _body?: string
          _channel: Database["public"]["Enums"]["comm_channel"]
          _entity_id: string
          _entity_type: string
          _summary: string
        }
        Returns: undefined
      }
      notify_user: {
        Args: {
          _body: string
          _link: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      owns_application_school: {
        Args: { _application_id: string; _user_id: string }
        Returns: boolean
      }
      platform_stats: {
        Args: never
        Returns: {
          live_job_count: number
          school_count: number
          teacher_count: number
        }[]
      }
      school_owner_for_job: { Args: { _job_id: string }; Returns: string }
    }
    Enums: {
      app_role: "teacher" | "school" | "admin" | "recruiter"
      application_status:
        | "submitted"
        | "reviewing"
        | "shortlisted"
        | "rejected"
        | "hired"
        | "screening"
        | "interview_scheduled"
        | "demo_class"
        | "school_review"
        | "offer"
        | "joined"
        | "interview_completed"
        | "offer_accepted"
      calendar_event_type: "call" | "meeting" | "follow_up" | "other"
      comm_channel:
        | "call"
        | "email"
        | "meeting"
        | "whatsapp"
        | "note"
        | "status_change"
        | "interview"
        | "offer"
        | "system"
      document_type:
        | "resume"
        | "certificate"
        | "id_proof"
        | "photo"
        | "video"
        | "other"
      interview_mode: "in_person" | "video" | "phone"
      interview_status:
        | "scheduled"
        | "completed"
        | "cancelled"
        | "no_show"
        | "confirmed"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "void"
      job_status: "draft" | "published" | "closed" | "pending_review"
      lead_priority: "low" | "medium" | "high"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      subscription_status: "trial" | "active" | "past_due" | "cancelled"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "blocked" | "done"
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
      app_role: ["teacher", "school", "admin", "recruiter"],
      application_status: [
        "submitted",
        "reviewing",
        "shortlisted",
        "rejected",
        "hired",
        "screening",
        "interview_scheduled",
        "demo_class",
        "school_review",
        "offer",
        "joined",
        "interview_completed",
        "offer_accepted",
      ],
      calendar_event_type: ["call", "meeting", "follow_up", "other"],
      comm_channel: [
        "call",
        "email",
        "meeting",
        "whatsapp",
        "note",
        "status_change",
        "interview",
        "offer",
        "system",
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
      interview_status: [
        "scheduled",
        "completed",
        "cancelled",
        "no_show",
        "confirmed",
      ],
      invoice_status: ["draft", "sent", "paid", "overdue", "void"],
      job_status: ["draft", "published", "closed", "pending_review"],
      lead_priority: ["low", "medium", "high"],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      subscription_status: ["trial", "active", "past_due", "cancelled"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "blocked", "done"],
      teacher_status: ["draft", "active", "placed", "inactive"],
    },
  },
} as const
