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
      agent_run_steps: {
        Row: {
          agent_run_id: string
          created_at: string
          finished_at: string | null
          id: string
          meta: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["run_status"]
          step_name: string
          team_id: string
        }
        Insert: {
          agent_run_id: string
          created_at?: string
          finished_at?: string | null
          id?: string
          meta?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          step_name: string
          team_id: string
        }
        Update: {
          agent_run_id?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          meta?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          step_name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_run_steps_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_run_steps_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          created_at: string
          error_text: string | null
          finished_at: string | null
          id: string
          inputs: Json | null
          outputs: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["run_status"]
          team_id: string
          trigger: string
          user_id: string | null
        }
        Insert: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          error_text?: string | null
          finished_at?: string | null
          id?: string
          inputs?: Json | null
          outputs?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          team_id: string
          trigger: string
          user_id?: string | null
        }
        Update: {
          agent_type?: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          error_text?: string | null
          finished_at?: string | null
          id?: string
          inputs?: Json | null
          outputs?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          team_id?: string
          trigger?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_at: string | null
          created_at: string
          id: string
          job_id: string
          next_follow_up_at: string | null
          notes: string | null
          status: Database["public"]["Enums"]["application_status"]
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          id?: string
          job_id: string
          next_follow_up_at?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          id?: string
          job_id?: string
          next_follow_up_at?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      apply_sessions: {
        Row: {
          cover_letter_id: string
          created_at: string
          expires_at: string
          id: string
          job_id: string
          team_id: string
          token_hash: string
          user_id: string
        }
        Insert: {
          cover_letter_id: string
          created_at?: string
          expires_at: string
          id?: string
          job_id: string
          team_id: string
          token_hash: string
          user_id: string
        }
        Update: {
          cover_letter_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          job_id?: string
          team_id?: string
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apply_sessions_cover_letter_id_fkey"
            columns: ["cover_letter_id"]
            isOneToOne: false
            referencedRelation: "cover_letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apply_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apply_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          model: string | null
          role: string
          saved_fields: Json | null
          tokens_used: number | null
          tool_calls: Json | null
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          model?: string | null
          role: string
          saved_fields?: Json | null
          tokens_used?: number | null
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          model?: string | null
          role?: string
          saved_fields?: Json | null
          tokens_used?: number | null
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          created_at: string
          finished_at: string | null
          id: string
          metadata: Json | null
          model: string | null
          prompt_version_id: string | null
          started_at: string
          status: string
          team_id: string
          user_id: string
        }
        Insert: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string | null
          prompt_version_id?: string | null
          started_at?: string
          status?: string
          team_id: string
          user_id: string
        }
        Update: {
          agent_type?: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string | null
          prompt_version_id?: string | null
          started_at?: string
          status?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_letters: {
        Row: {
          content: string
          created_at: string
          id: string
          job_id: string
          model: string | null
          style_preset: string
          team_id: string
          temperature: number
          tokens_used: number | null
          user_id: string
          vocabulary_level: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          job_id: string
          model?: string | null
          style_preset?: string
          team_id: string
          temperature?: number
          tokens_used?: number | null
          user_id: string
          vocabulary_level?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          job_id?: string
          model?: string | null
          style_preset?: string
          team_id?: string
          temperature?: number
          tokens_used?: number | null
          user_id?: string
          vocabulary_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "cover_letters_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cover_letters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          occurred_at: string
          platform: Database["public"]["Enums"]["platform"] | null
          source_json: Json | null
          team_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          occurred_at: string
          platform?: Database["public"]["Enums"]["platform"] | null
          source_json?: Json | null
          team_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          occurred_at?: string
          platform?: Database["public"]["Enums"]["platform"] | null
          source_json?: Json | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earnings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      embeddings: {
        Row: {
          created_at: string
          dims: number
          embedding: string
          entity_id: string
          entity_type: string
          id: string
          meta: Json | null
          model: string
          team_id: string
        }
        Insert: {
          created_at?: string
          dims: number
          embedding: string
          entity_id: string
          entity_type: string
          id?: string
          meta?: Json | null
          model: string
          team_id: string
        }
        Update: {
          created_at?: string
          dims?: number
          embedding?: string
          entity_id?: string
          entity_type?: string
          id?: string
          meta?: Json | null
          model?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          team_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          team_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          application_id: string | null
          category: string | null
          content: string
          created_at: string
          id: string
          message_id: string | null
          resolved_at: string | null
          sentiment: number | null
          status: Database["public"]["Enums"]["feedback_status"]
          team_id: string
        }
        Insert: {
          application_id?: string | null
          category?: string | null
          content: string
          created_at?: string
          id?: string
          message_id?: string | null
          resolved_at?: string | null
          sentiment?: number | null
          status?: Database["public"]["Enums"]["feedback_status"]
          team_id: string
        }
        Update: {
          application_id?: string | null
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          message_id?: string | null
          resolved_at?: string | null
          sentiment?: number | null
          status?: Database["public"]["Enums"]["feedback_status"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_cvs: {
        Row: {
          created_at: string | null
          cv_data: Json
          id: string
          team_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cv_data: Json
          id?: string
          team_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cv_data?: Json
          id?: string
          team_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_cvs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          analysis: Json | null
          context: string | null
          created_at: string
          finished_at: string | null
          id: string
          interview_type: string
          metrics: Json | null
          overall_score: number | null
          started_at: string | null
          status: string
          team_id: string
          transcript: Json | null
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          context?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          interview_type: string
          metrics?: Json | null
          overall_score?: number | null
          started_at?: string | null
          status?: string
          team_id: string
          transcript?: Json | null
          user_id: string
        }
        Update: {
          analysis?: Json | null
          context?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          interview_type?: string
          metrics?: Json | null
          overall_score?: number | null
          started_at?: string | null
          status?: string
          team_id?: string
          transcript?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      job_rankings: {
        Row: {
          agent_run_id: string | null
          breakdown: Json
          created_at: string
          id: string
          job_id: string
          score: number
          team_id: string
          tightness: number
        }
        Insert: {
          agent_run_id?: string | null
          breakdown: Json
          created_at?: string
          id?: string
          job_id: string
          score: number
          team_id: string
          tightness: number
        }
        Update: {
          agent_run_id?: string | null
          breakdown?: Json
          created_at?: string
          id?: string
          job_id?: string
          score?: number
          team_id?: string
          tightness?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_rankings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_rankings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      job_sources: {
        Row: {
          fetched_at: string
          id: string
          platform: Database["public"]["Enums"]["platform"]
          platform_job_id: string
          raw_json: Json | null
          team_id: string
          url: string | null
        }
        Insert: {
          fetched_at?: string
          id?: string
          platform: Database["public"]["Enums"]["platform"]
          platform_job_id: string
          raw_json?: Json | null
          team_id: string
          url?: string | null
        }
        Update: {
          fetched_at?: string
          id?: string
          platform?: Database["public"]["Enums"]["platform"]
          platform_job_id?: string
          raw_json?: Json | null
          team_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_sources_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          apply_url: string
          budget_type: string
          canonical_hash: string
          category: string | null
          client_country: string | null
          client_hires: number | null
          client_payment_verified: boolean | null
          client_rating: number | null
          company_logo_url: string | null
          company_name: string | null
          created_at: string
          currency: string
          description: string
          fetched_at: string
          fixed_budget_max: number | null
          fixed_budget_min: number | null
          hourly_max: number | null
          hourly_min: number | null
          id: string
          platform: Database["public"]["Enums"]["platform"]
          platform_job_id: string
          posted_at: string | null
          seniority: string | null
          skills: string[]
          source_raw: Json | null
          team_id: string
          title: string
        }
        Insert: {
          apply_url: string
          budget_type?: string
          canonical_hash: string
          category?: string | null
          client_country?: string | null
          client_hires?: number | null
          client_payment_verified?: boolean | null
          client_rating?: number | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string
          description: string
          fetched_at?: string
          fixed_budget_max?: number | null
          fixed_budget_min?: number | null
          hourly_max?: number | null
          hourly_min?: number | null
          id?: string
          platform: Database["public"]["Enums"]["platform"]
          platform_job_id: string
          posted_at?: string | null
          seniority?: string | null
          skills?: string[]
          source_raw?: Json | null
          team_id: string
          title: string
        }
        Update: {
          apply_url?: string
          budget_type?: string
          canonical_hash?: string
          category?: string | null
          client_country?: string | null
          client_hires?: number | null
          client_payment_verified?: boolean | null
          client_rating?: number | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string
          description?: string
          fetched_at?: string
          fixed_budget_max?: number | null
          fixed_budget_min?: number | null
          hourly_max?: number | null
          hourly_min?: number | null
          id?: string
          platform?: Database["public"]["Enums"]["platform"]
          platform_job_id?: string
          posted_at?: string | null
          seniority?: string | null
          skills?: string[]
          source_raw?: Json | null
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          from_email: string | null
          id: string
          platform: Database["public"]["Enums"]["platform"] | null
          raw: Json | null
          received_at: string | null
          subject: string | null
          team_id: string
          thread_id: string | null
          to_email: string | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["message_direction"]
          from_email?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["platform"] | null
          raw?: Json | null
          received_at?: string | null
          subject?: string | null
          team_id: string
          thread_id?: string | null
          to_email?: string | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          from_email?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["platform"] | null
          raw?: Json | null
          received_at?: string | null
          subject?: string | null
          team_id?: string
          thread_id?: string | null
          to_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          team_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          team_id: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          team_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_analyses: {
        Row: {
          categories: Json
          conversation_id: string | null
          created_at: string
          detailed_feedback: string
          id: string
          improvements: Json
          overall_score: number
          prompt_version_id: string | null
          strengths: Json
          team_id: string
          user_id: string
        }
        Insert: {
          categories: Json
          conversation_id?: string | null
          created_at?: string
          detailed_feedback: string
          id?: string
          improvements: Json
          overall_score: number
          prompt_version_id?: string | null
          strengths: Json
          team_id: string
          user_id: string
        }
        Update: {
          categories?: Json
          conversation_id?: string | null
          created_at?: string
          detailed_feedback?: string
          id?: string
          improvements?: Json
          overall_score?: number
          prompt_version_id?: string | null
          strengths?: Json
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_analyses_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_analyses_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_analyses_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about: string | null
          analysis_seen_at: string | null
          avatar_url: string | null
          country_code: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          email: string | null
          headline: string | null
          linkedin_url: string | null
          location: string | null
          onboarding_completed_at: string | null
          plan: string
          plan_ends_at: string | null
          profile_completeness_score: number
          team_id: string
          team_mode: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          about?: string | null
          analysis_seen_at?: string | null
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          headline?: string | null
          linkedin_url?: string | null
          location?: string | null
          onboarding_completed_at?: string | null
          plan?: string
          plan_ends_at?: string | null
          profile_completeness_score?: number
          team_id: string
          team_mode?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          about?: string | null
          analysis_seen_at?: string | null
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          headline?: string | null
          linkedin_url?: string | null
          location?: string | null
          onboarding_completed_at?: string | null
          plan?: string
          plan_ends_at?: string | null
          profile_completeness_score?: number
          team_id?: string
          team_mode?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_versions: {
        Row: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          created_at: string
          id: string
          instructions: string
          is_active: boolean
          model: string
          model_settings: Json | null
          name: string
          version: number
        }
        Insert: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          id?: string
          instructions: string
          is_active?: boolean
          model: string
          model_settings?: Json | null
          name: string
          version?: number
        }
        Update: {
          agent_type?: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          id?: string
          instructions?: string
          is_active?: boolean
          model?: string
          model_settings?: Json | null
          name?: string
          version?: number
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          invited_email: string | null
          role: Database["public"]["Enums"]["team_role"]
          status: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          invited_email?: string | null
          role: Database["public"]["Enums"]["team_role"]
          status?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          invited_email?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          status?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_settings: {
        Row: {
          settings_json: Json
          team_id: string
          updated_at: string
        }
        Insert: {
          settings_json?: Json
          team_id: string
          updated_at?: string
        }
        Update: {
          settings_json?: Json
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          count: number
          day: string
          metric: string
          team_id: string
          updated_at: string
        }
        Insert: {
          count?: number
          day: string
          metric: string
          team_id: string
          updated_at?: string
        }
        Update: {
          count?: number
          day?: string
          metric?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_agent_settings: {
        Row: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          settings_json: Json
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          settings_json?: Json
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_type?: Database["public"]["Enums"]["agent_type"]
          settings_json?: Json
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agent_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cv_files: {
        Row: {
          filename: string | null
          id: string
          storage_path: string
          team_id: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          filename?: string | null
          id?: string
          storage_path: string
          team_id: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          filename?: string | null
          id?: string
          storage_path?: string
          team_id?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cv_files_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_educations: {
        Row: {
          created_at: string
          degree: string | null
          end_year: number | null
          field: string | null
          id: string
          school: string | null
          start_year: number | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          degree?: string | null
          end_year?: number | null
          field?: string | null
          id?: string
          school?: string | null
          start_year?: number | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          degree?: string | null
          end_year?: number | null
          field?: string | null
          id?: string
          school?: string | null
          start_year?: number | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_educations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_experiences: {
        Row: {
          company: string | null
          created_at: string
          end_date: string | null
          highlights: string | null
          id: string
          start_date: string | null
          team_id: string
          title: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          end_date?: string | null
          highlights?: string | null
          id?: string
          start_date?: string | null
          team_id: string
          title: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          end_date?: string | null
          highlights?: string | null
          id?: string
          start_date?: string | null
          team_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_experiences_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          content: string
          created_at: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          currency: string
          current_hourly_max: number | null
          current_hourly_min: number | null
          fixed_budget_min: number | null
          hourly_max: number | null
          hourly_min: number | null
          platforms: string[]
          project_types: string[]
          team_id: string
          tightness: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          current_hourly_max?: number | null
          current_hourly_min?: number | null
          fixed_budget_min?: number | null
          hourly_max?: number | null
          hourly_min?: number | null
          platforms?: string[]
          project_types?: string[]
          team_id: string
          tightness?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_hourly_max?: number | null
          current_hourly_min?: number | null
          fixed_budget_min?: number | null
          hourly_max?: number | null
          hourly_min?: number | null
          platforms?: string[]
          project_types?: string[]
          team_id?: string
          tightness?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile_snapshots: {
        Row: {
          created_at: string
          id: string
          parsed_at: string | null
          parsed_json: Json | null
          raw_json: Json | null
          source: string
          source_url: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parsed_at?: string | null
          parsed_json?: Json | null
          raw_json?: Json | null
          source: string
          source_url?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parsed_at?: string | null
          parsed_json?: Json | null
          raw_json?: Json | null
          source?: string
          source_url?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profile_snapshots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skills: {
        Row: {
          created_at: string
          id: string
          level: number
          name: string
          team_id: string
          user_id: string
          years: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          name: string
          team_id: string
          user_id: string
          years?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          name?: string
          team_id?: string
          user_id?: string
          years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      job_rankings_latest: {
        Row: {
          breakdown: Json | null
          created_at: string | null
          job_id: string | null
          score: number | null
          tightness: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_rankings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_team_leader: { Args: { t: string }; Returns: boolean }
      is_team_member: { Args: { t: string }; Returns: boolean }
      upsert_jobs_and_rankings: {
        Args: {
          p_agent_run_id: string
          p_job_sources: Json
          p_jobs: Json
          p_rankings: Json
          p_team_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      agent_type:
        | "job_search"
        | "cover_letter"
        | "dashboard_copilot"
        | "upwork_profile_optimizer"
        | "interview_prep"
        | "profile_parser"
        | "email_ingest"
        | "onboarding"
      application_status:
        | "shortlisted"
        | "ready_to_apply"
        | "applied"
        | "in_conversation"
        | "interviewing"
        | "won"
        | "lost"
        | "archived"
      feedback_status: "action_required" | "resolved"
      message_direction: "inbound" | "outbound"
      platform: "upwork" | "linkedin"
      run_status: "queued" | "running" | "succeeded" | "failed" | "canceled"
      team_role: "leader" | "member"
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
      agent_type: [
        "job_search",
        "cover_letter",
        "dashboard_copilot",
        "upwork_profile_optimizer",
        "interview_prep",
        "profile_parser",
        "email_ingest",
        "onboarding",
      ],
      application_status: [
        "shortlisted",
        "ready_to_apply",
        "applied",
        "in_conversation",
        "interviewing",
        "won",
        "lost",
        "archived",
      ],
      feedback_status: ["action_required", "resolved"],
      message_direction: ["inbound", "outbound"],
      platform: ["upwork", "linkedin"],
      run_status: ["queued", "running", "succeeded", "failed", "canceled"],
      team_role: ["leader", "member"],
    },
  },
} as const
