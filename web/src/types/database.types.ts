export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          slug: string
          domain: string | null
          logo_url: string | null
          billing_email: string | null
          posthog_project_id: number | null
          posthog_api_key_encrypted: string | null
          is_active: boolean
          trial_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          domain?: string | null
          logo_url?: string | null
          billing_email?: string | null
          posthog_project_id?: number | null
          posthog_api_key_encrypted?: string | null
          is_active?: boolean
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          domain?: string | null
          logo_url?: string | null
          billing_email?: string | null
          posthog_project_id?: number | null
          posthog_api_key_encrypted?: string | null
          is_active?: boolean
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          company_id: string | null
          email: string
          name: string | null
          role: string
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          company_id?: string | null
          email: string
          name?: string | null
          role?: string
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          email?: string
          name?: string | null
          role?: string
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          name: string
          description: string | null
          price_cents: number
          currency: string
          interval: string
          max_team_members: number
          ai_insights: boolean
          slack_integration: boolean
          email_digest: boolean
          priority_support: boolean
          is_popular: boolean
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          price_cents: number
          currency?: string
          interval?: string
          max_team_members?: number
          ai_insights?: boolean
          slack_integration?: boolean
          email_digest?: boolean
          priority_support?: boolean
          is_popular?: boolean
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price_cents?: number
          currency?: string
          interval?: string
          max_team_members?: number
          ai_insights?: boolean
          slack_integration?: boolean
          email_digest?: boolean
          priority_support?: boolean
          is_popular?: boolean
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          company_id: string
          plan_id: string
          status: string
          current_period_start: string | null
          current_period_end: string | null
          trial_end: string | null
          cancel_at_period_end: boolean
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          plan_id: string
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          trial_end?: string | null
          cancel_at_period_end?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          plan_id?: string
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          trial_end?: string | null
          cancel_at_period_end?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      analytics_snapshots: {
        Row: {
          id: string
          company_id: string
          date_range: string
          snapshot_date: string
          unique_users: number
          pageviews: number
          conversion_rate: number
          traffic_data: Json | null
          funnel_data: Json | null
          retention_data: Json | null
          device_data: Json | null
          geo_data: Json | null
          lifecycle_data: Json | null
          errors: Json
          comparison_enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          date_range: string
          snapshot_date: string
          unique_users?: number
          pageviews?: number
          conversion_rate?: number
          traffic_data?: Json | null
          funnel_data?: Json | null
          retention_data?: Json | null
          device_data?: Json | null
          geo_data?: Json | null
          lifecycle_data?: Json | null
          errors?: Json
          comparison_enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          date_range?: string
          snapshot_date?: string
          unique_users?: number
          pageviews?: number
          conversion_rate?: number
          traffic_data?: Json | null
          funnel_data?: Json | null
          retention_data?: Json | null
          device_data?: Json | null
          geo_data?: Json | null
          lifecycle_data?: Json | null
          errors?: Json
          comparison_enabled?: boolean
          created_at?: string
        }
      }
      ai_insights: {
        Row: {
          id: string
          company_id: string
          snapshot_id: string
          headline: string | null
          summary: string | null
          recommendations: Json | null
          model_used: string
          tokens_used: number | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          snapshot_id: string
          headline?: string | null
          summary?: string | null
          recommendations?: Json | null
          model_used?: string
          tokens_used?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          snapshot_id?: string
          headline?: string | null
          summary?: string | null
          recommendations?: Json | null
          model_used?: string
          tokens_used?: number | null
          created_at?: string
        }
      }
    }
    Views: {
      company_dashboard: {
        Row: {
          id: string
          name: string
          slug: string
          posthog_project_id: number | null
          is_active: boolean
          trial_ends_at: string | null
          subscription_status: string | null
          current_period_end: string | null
          trial_end: string | null
          plan_name: string | null
          price_cents: number | null
          interval: string | null
          max_team_members: number | null
          ai_insights: boolean | null
          slack_integration: boolean | null
          email_digest: boolean | null
          priority_support: boolean | null
          team_members: number | null
          snapshots_this_month: number | null
          created_at: string
        }
      }
    }
    Functions: {
      start_trial: {
        Args: {
          p_company_id: string
          p_plan_id: string
          p_trial_days?: number
        }
        Returns: string
      }
    }
  }
}
