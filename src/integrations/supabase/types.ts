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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          status: string | null
          updated_at: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          status?: string | null
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          status?: string | null
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_jobs: {
        Row: {
          brand_id: string | null
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          error: string | null
          external_task_id: string | null
          id: string
          input: Json
          job_type: string
          model: string | null
          output: Json | null
          progress: number
          provider: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          external_task_id?: string | null
          id?: string
          input?: Json
          job_type: string
          model?: string | null
          output?: Json | null
          progress?: number
          provider: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          external_task_id?: string | null
          id?: string
          input?: Json
          job_type?: string
          model?: string | null
          output?: Json | null
          progress?: number
          provider?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_jobs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tool_calls: {
        Row: {
          conversation_id: string
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          input: Json
          job_id: string | null
          output: Json | null
          status: string
          tool_name: string
          tool_type: string
          trace_id: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json
          job_id?: string | null
          output?: Json | null
          status?: string
          tool_name: string
          tool_type: string
          trace_id?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json
          job_id?: string | null
          output?: Json | null
          status?: string
          tool_name?: string
          tool_type?: string
          trace_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tool_calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_calls_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_usage_logs: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          output_types: Json | null
          session_duration: number | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          output_types?: Json | null
          session_duration?: number | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          output_types?: Json | null
          session_duration?: number | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_usage_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "custom_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workspace_assignments: {
        Row: {
          agent_id: string
          assigned_at: string
          assigned_by: string
          can_edit: boolean
          id: string
          workspace_id: string
        }
        Insert: {
          agent_id: string
          assigned_at?: string
          assigned_by: string
          can_edit?: boolean
          id?: string
          workspace_id: string
        }
        Update: {
          agent_id?: string
          assigned_at?: string
          assigned_by?: string
          can_edit?: boolean
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_workspace_assignments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "custom_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          created_at: string
          id: string
          instructions: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          questions: Json
          updated_at: string
          usage_count: number | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instructions: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          questions?: Json
          updated_at?: string
          usage_count?: number | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          questions?: Json
          updated_at?: string
          usage_count?: number | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      ai_generated_content: {
        Row: {
          campaign_id: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_active: boolean | null
          model: string | null
          provider: string | null
          title: string
        }
        Insert: {
          campaign_id?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          model?: string | null
          provider?: string | null
          title?: string
        }
        Update: {
          campaign_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          model?: string | null
          provider?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generated_content_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_pattern_library: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          pattern_text: string
          pattern_type: string
          style_category: string
          updated_at: string
          usage_frequency: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          pattern_text: string
          pattern_type: string
          style_category: string
          updated_at?: string
          usage_frequency?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          pattern_text?: string
          pattern_type?: string
          style_category?: string
          updated_at?: string
          usage_frequency?: number | null
        }
        Relationships: []
      }
      ai_saved_content: {
        Row: {
          brand_id: string | null
          category: string | null
          content: string
          created_at: string
          id: string
          share_token: string | null
          title: string
          updated_at: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          brand_id?: string | null
          category?: string | null
          content: string
          created_at?: string
          id?: string
          share_token?: string | null
          title: string
          updated_at?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          brand_id?: string | null
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          share_token?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_saved_content_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workflow_inputs: {
        Row: {
          created_at: string
          default_value: string | null
          field_key: string
          field_label: string
          field_order: number
          field_type: string
          help_text: string | null
          id: string
          is_required: boolean
          options: Json | null
          step_id: string
        }
        Insert: {
          created_at?: string
          default_value?: string | null
          field_key: string
          field_label: string
          field_order?: number
          field_type?: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          options?: Json | null
          step_id: string
        }
        Update: {
          created_at?: string
          default_value?: string | null
          field_key?: string
          field_label?: string
          field_order?: number
          field_type?: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          options?: Json | null
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workflow_inputs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "ai_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workflow_runs: {
        Row: {
          brand_id: string | null
          created_at: string
          id: string
          inputs: Json
          outputs: Json
          user_id: string
          workflow_id: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          id?: string
          inputs?: Json
          outputs?: Json
          user_id: string
          workflow_id: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          id?: string
          inputs?: Json
          outputs?: Json
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workflow_runs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "ai_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workflow_steps: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          output_format: string
          prompt_template: string
          step_name: string
          step_order: number
          tool_type: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          output_format?: string
          prompt_template?: string
          step_name: string
          step_order?: number
          tool_type?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          output_format?: string
          prompt_template?: string
          step_name?: string
          step_order?: number
          tool_type?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "ai_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workflows: {
        Row: {
          category: string
          created_at: string
          description: string | null
          difficulty: string
          icon: string | null
          id: string
          is_published: boolean
          name: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          icon?: string | null
          id?: string
          is_published?: boolean
          name: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          icon?: string | null
          id?: string
          is_published?: boolean
          name?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      analyzed_sources: {
        Row: {
          analysis: Json | null
          brand_id: string | null
          content: string | null
          created_at: string
          description: string | null
          id: string
          source_type: string
          title: string | null
          updated_at: string
          url: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          analysis?: Json | null
          brand_id?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          source_type: string
          title?: string | null
          updated_at?: string
          url: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          analysis?: Json | null
          brand_id?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          source_type?: string
          title?: string | null
          updated_at?: string
          url?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analyzed_sources_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyzed_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          api_key_hash: string
          brand_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_name: string
          key_prefix: string
          last_used_at: string | null
          permissions: Json
          user_id: string
        }
        Insert: {
          api_key_hash: string
          brand_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_name: string
          key_prefix: string
          last_used_at?: string | null
          permissions?: Json
          user_id: string
        }
        Update: {
          api_key_hash?: string
          brand_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_name?: string
          key_prefix?: string
          last_used_at?: string | null
          permissions?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      api_token_usage: {
        Row: {
          brand_id: string | null
          completion_tokens: number | null
          cost_usd: number
          created_at: string
          id: string
          model_name: string | null
          prompt_tokens: number | null
          request_data: Json | null
          request_id: string | null
          service_name: string
          tokens_deducted: number
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          completion_tokens?: number | null
          cost_usd?: number
          created_at?: string
          id?: string
          model_name?: string | null
          prompt_tokens?: number | null
          request_data?: Json | null
          request_id?: string | null
          service_name: string
          tokens_deducted?: number
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          brand_id?: string | null
          completion_tokens?: number | null
          cost_usd?: number
          created_at?: string
          id?: string
          model_name?: string | null
          prompt_tokens?: number | null
          request_data?: Json | null
          request_id?: string | null
          service_name?: string
          tokens_deducted?: number
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_token_usage_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          api_key_id: string
          created_at: string
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          response_time_ms: number | null
          status_code: number
          user_agent: string | null
        }
        Insert: {
          api_key_id: string
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: string | null
          method: string
          response_time_ms?: number | null
          status_code: number
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          response_time_ms?: number | null
          status_code?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      app_tools: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      backlink_selected_topics: {
        Row: {
          assigned_internal_link_id: string | null
          blog_post_id: string | null
          brand_id: string | null
          created_at: string
          id: string
          keyword_focus: string | null
          keywords: string[] | null
          status: string
          suggested_topic_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_internal_link_id?: string | null
          blog_post_id?: string | null
          brand_id?: string | null
          created_at?: string
          id?: string
          keyword_focus?: string | null
          keywords?: string[] | null
          status?: string
          suggested_topic_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_internal_link_id?: string | null
          blog_post_id?: string | null
          brand_id?: string | null
          created_at?: string
          id?: string
          keyword_focus?: string | null
          keywords?: string[] | null
          status?: string
          suggested_topic_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backlink_selected_topics_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlink_selected_topics_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlink_selected_topics_suggested_topic_id_fkey"
            columns: ["suggested_topic_id"]
            isOneToOne: false
            referencedRelation: "backlink_suggested_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      backlink_suggested_topics: {
        Row: {
          created_at: string
          description: string | null
          generation_id: string
          id: string
          is_selected: boolean | null
          keyword_focus: string | null
          keywords: string[] | null
          search_intent: string | null
          suggested_internal_link_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          generation_id: string
          id?: string
          is_selected?: boolean | null
          keyword_focus?: string | null
          keywords?: string[] | null
          search_intent?: string | null
          suggested_internal_link_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          generation_id?: string
          id?: string
          is_selected?: boolean | null
          keyword_focus?: string | null
          keywords?: string[] | null
          search_intent?: string | null
          suggested_internal_link_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backlink_suggested_topics_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "backlink_topic_generation"
            referencedColumns: ["id"]
          },
        ]
      }
      backlink_topic_generation: {
        Row: {
          brand_id: string | null
          created_at: string
          error_message: string | null
          id: string
          internal_links: Json
          keywords: Json
          language: string | null
          location: string | null
          status: string
          topics_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          internal_links?: Json
          keywords?: Json
          language?: string | null
          location?: string | null
          status?: string
          topics_number?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          internal_links?: Json
          keywords?: Json
          language?: string | null
          location?: string | null
          status?: string
          topics_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backlink_topic_generation_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      billing: {
        Row: {
          application_id: string | null
          base_cost: number
          billing_period_end: string
          billing_period_start: string
          client_id: string | null
          created_at: string | null
          id: string
          overage_cost: number | null
          resource_percentage: number | null
          status: string
          tier: string
          total_cost: number
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          base_cost: number
          billing_period_end: string
          billing_period_start: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          overage_cost?: number | null
          resource_percentage?: number | null
          status?: string
          tier: string
          total_cost: number
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          base_cost?: number
          billing_period_end?: string
          billing_period_start?: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          overage_cost?: number | null
          resource_percentage?: number | null
          status?: string
          tier?: string
          total_cost?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_articles: {
        Row: {
          brand_id: string | null
          campaign_id: string | null
          content: string
          created_at: string
          id: string
          keywords: string[] | null
          locale: string
          meta_description: string | null
          slug: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          campaign_id?: string | null
          content: string
          created_at?: string
          id?: string
          keywords?: string[] | null
          locale?: string
          meta_description?: string | null
          slug?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          campaign_id?: string | null
          content?: string
          created_at?: string
          id?: string
          keywords?: string[] | null
          locale?: string
          meta_description?: string | null
          slug?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_articles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_post_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_categories_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          created_at: string
          id: string
          post_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string | null
          backlink_anchor_text: string | null
          brand_id: string | null
          campaign_creation_date: string | null
          campaign_id: string | null
          cms_published: boolean | null
          cms_url: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          featured_image_alt: string | null
          id: string
          internal_link_id: string | null
          is_backlink_article: boolean | null
          keywords: string[] | null
          last_shopify_sync_at: string | null
          last_sparti_sync_at: string | null
          last_wordpress_sync_at: string | null
          last_wp_sync_at: string | null
          location_id: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          parent_post_id: string | null
          preview_slug: string | null
          published_at: string | null
          published_date: string | null
          scheduled_date: string | null
          seo_campaign_id: string | null
          shopify_article_id: number | null
          shopify_settings: Json | null
          shopify_sync_error: string | null
          shopify_sync_status: string | null
          shopify_url: string | null
          slug: string | null
          sparti_post_id: number | null
          sparti_settings: Json | null
          sparti_sync_error: string | null
          sparti_sync_status: string | null
          sparti_url: string | null
          status: string
          title: string
          topic_id: string | null
          translations: Json
          updated_at: string
          user_id: string
          website_id: string | null
          wordpress_post_id: number | null
          wordpress_settings: Json | null
          wordpress_sync_error: string | null
          wordpress_sync_status: string | null
          workspace_id: string | null
          wp_modified_date: string | null
          wp_sync_status: string | null
        }
        Insert: {
          author?: string | null
          backlink_anchor_text?: string | null
          brand_id?: string | null
          campaign_creation_date?: string | null
          campaign_id?: string | null
          cms_published?: boolean | null
          cms_url?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          featured_image_alt?: string | null
          id?: string
          internal_link_id?: string | null
          is_backlink_article?: boolean | null
          keywords?: string[] | null
          last_shopify_sync_at?: string | null
          last_sparti_sync_at?: string | null
          last_wordpress_sync_at?: string | null
          last_wp_sync_at?: string | null
          location_id?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          parent_post_id?: string | null
          preview_slug?: string | null
          published_at?: string | null
          published_date?: string | null
          scheduled_date?: string | null
          seo_campaign_id?: string | null
          shopify_article_id?: number | null
          shopify_settings?: Json | null
          shopify_sync_error?: string | null
          shopify_sync_status?: string | null
          shopify_url?: string | null
          slug?: string | null
          sparti_post_id?: number | null
          sparti_settings?: Json | null
          sparti_sync_error?: string | null
          sparti_sync_status?: string | null
          sparti_url?: string | null
          status?: string
          title: string
          topic_id?: string | null
          translations?: Json
          updated_at?: string
          user_id: string
          website_id?: string | null
          wordpress_post_id?: number | null
          wordpress_settings?: Json | null
          wordpress_sync_error?: string | null
          wordpress_sync_status?: string | null
          workspace_id?: string | null
          wp_modified_date?: string | null
          wp_sync_status?: string | null
        }
        Update: {
          author?: string | null
          backlink_anchor_text?: string | null
          brand_id?: string | null
          campaign_creation_date?: string | null
          campaign_id?: string | null
          cms_published?: boolean | null
          cms_url?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          featured_image_alt?: string | null
          id?: string
          internal_link_id?: string | null
          is_backlink_article?: boolean | null
          keywords?: string[] | null
          last_shopify_sync_at?: string | null
          last_sparti_sync_at?: string | null
          last_wordpress_sync_at?: string | null
          last_wp_sync_at?: string | null
          location_id?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          parent_post_id?: string | null
          preview_slug?: string | null
          published_at?: string | null
          published_date?: string | null
          scheduled_date?: string | null
          seo_campaign_id?: string | null
          shopify_article_id?: number | null
          shopify_settings?: Json | null
          shopify_sync_error?: string | null
          shopify_sync_status?: string | null
          shopify_url?: string | null
          slug?: string | null
          sparti_post_id?: number | null
          sparti_settings?: Json | null
          sparti_sync_error?: string | null
          sparti_sync_status?: string | null
          sparti_url?: string | null
          status?: string
          title?: string
          topic_id?: string | null
          translations?: Json
          updated_at?: string
          user_id?: string
          website_id?: string | null
          wordpress_post_id?: number | null
          wordpress_settings?: Json | null
          wordpress_sync_error?: string | null
          wordpress_sync_status?: string | null
          workspace_id?: string | null
          wp_modified_date?: string | null
          wp_sync_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "brand_website_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "seo_topic_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "brand_websites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      bot_sessions: {
        Row: {
          channel: string
          created_at: string
          ended_at: string | null
          external_thread_id: string | null
          id: string
          instance_id: string
          last_active_at: string
          metadata: Json
          started_at: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          ended_at?: string | null
          external_thread_id?: string | null
          id?: string
          instance_id: string
          last_active_at?: string
          metadata?: Json
          started_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          ended_at?: string | null
          external_thread_id?: string | null
          id?: string
          instance_id?: string
          last_active_at?: string
          metadata?: Json
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_sessions_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_additional_instructions: {
        Row: {
          brand_id: string
          copilot_type: string | null
          created_at: string | null
          id: string
          instructions: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand_id: string
          copilot_type?: string | null
          created_at?: string | null
          id?: string
          instructions?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand_id?: string
          copilot_type?: string | null
          created_at?: string | null
          id?: string
          instructions?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_additional_instructions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_analysis: {
        Row: {
          backlinks: Json | null
          brand_description: string | null
          brand_id: string
          brand_name: string | null
          competitors: Json | null
          created_at: string
          id: string
          key_selling_points: string[] | null
          keywords: string[] | null
          sitemap_url: string | null
          target_audience: string | null
          total_sitemap_links: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          backlinks?: Json | null
          brand_description?: string | null
          brand_id: string
          brand_name?: string | null
          competitors?: Json | null
          created_at?: string
          id?: string
          key_selling_points?: string[] | null
          keywords?: string[] | null
          sitemap_url?: string | null
          target_audience?: string | null
          total_sitemap_links?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          backlinks?: Json | null
          brand_description?: string | null
          brand_id?: string
          brand_name?: string | null
          competitors?: Json | null
          created_at?: string
          id?: string
          key_selling_points?: string[] | null
          keywords?: string[] | null
          sitemap_url?: string | null
          target_audience?: string | null
          total_sitemap_links?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_analysis_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_commerce_settings: {
        Row: {
          brand_id: string
          created_at: string
          default_country_code: string | null
          default_currency: string
          medusa_base_url: string | null
          medusa_publishable_key: string | null
          medusa_sales_channel_id: string | null
          medusa_secret_key: string | null
          metadata: Json
          store_id: string | null
          stripe_account_id: string | null
          stripe_publishable_key: string | null
          stripe_secret_key: string | null
          stripe_webhook_secret: string | null
          tax_inclusive_pricing: boolean
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          default_country_code?: string | null
          default_currency?: string
          medusa_base_url?: string | null
          medusa_publishable_key?: string | null
          medusa_sales_channel_id?: string | null
          medusa_secret_key?: string | null
          metadata?: Json
          store_id?: string | null
          stripe_account_id?: string | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          stripe_webhook_secret?: string | null
          tax_inclusive_pricing?: boolean
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          default_country_code?: string | null
          default_currency?: string
          medusa_base_url?: string | null
          medusa_publishable_key?: string | null
          medusa_sales_channel_id?: string | null
          medusa_secret_key?: string | null
          metadata?: Json
          store_id?: string | null
          stripe_account_id?: string | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          stripe_webhook_secret?: string | null
          tax_inclusive_pricing?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_commerce_settings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_commerce_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "brand_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_custom_databases: {
        Row: {
          brand_id: string
          connection_url: string
          created_at: string
          engine: string
          id: string
          label: string | null
          last_connected_at: string | null
          notes: string | null
          purpose: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          connection_url: string
          created_at?: string
          engine?: string
          id?: string
          label?: string | null
          last_connected_at?: string | null
          notes?: string | null
          purpose?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          connection_url?: string
          created_at?: string
          engine?: string
          id?: string
          label?: string | null
          last_connected_at?: string | null
          notes?: string | null
          purpose?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_custom_databases_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_domains: {
        Row: {
          blog_page_id: string | null
          blog_slug_prefix: string
          brand_id: string
          cname_token: string | null
          created_at: string
          hostname: string
          id: string
          index_page_id: string | null
          is_subdomain: boolean
          railway_dns_records: Json | null
          railway_domain_id: string | null
          railway_last_checked_at: string | null
          railway_last_status: Json | null
          shop_page_id: string | null
          updated_at: string
          user_id: string
          verification_token: string | null
          verified: boolean
          website_id: string | null
        }
        Insert: {
          blog_page_id?: string | null
          blog_slug_prefix?: string
          brand_id: string
          cname_token?: string | null
          created_at?: string
          hostname: string
          id?: string
          index_page_id?: string | null
          is_subdomain?: boolean
          railway_dns_records?: Json | null
          railway_domain_id?: string | null
          railway_last_checked_at?: string | null
          railway_last_status?: Json | null
          shop_page_id?: string | null
          updated_at?: string
          user_id: string
          verification_token?: string | null
          verified?: boolean
          website_id?: string | null
        }
        Update: {
          blog_page_id?: string | null
          blog_slug_prefix?: string
          brand_id?: string
          cname_token?: string | null
          created_at?: string
          hostname?: string
          id?: string
          index_page_id?: string | null
          is_subdomain?: boolean
          railway_dns_records?: Json | null
          railway_domain_id?: string | null
          railway_last_checked_at?: string | null
          railway_last_status?: Json | null
          shop_page_id?: string | null
          updated_at?: string
          user_id?: string
          verification_token?: string | null
          verified?: boolean
          website_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_domains_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_domains_index_page_id_fkey"
            columns: ["index_page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_domains_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "brand_websites"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_email_domains: {
        Row: {
          brand_id: string
          created_at: string
          dkim_verified: boolean
          dmarc_verified: boolean
          dns_records: Json
          domain: string
          id: string
          last_checked_at: string | null
          mx_verified: boolean
          provider: string
          provider_domain_id: string | null
          provider_registered: boolean
          spf_verified: boolean
          tracking_verified: boolean
          updated_at: string
          user_id: string
          validation_log: string | null
          verified: boolean
        }
        Insert: {
          brand_id: string
          created_at?: string
          dkim_verified?: boolean
          dmarc_verified?: boolean
          dns_records?: Json
          domain: string
          id?: string
          last_checked_at?: string | null
          mx_verified?: boolean
          provider?: string
          provider_domain_id?: string | null
          provider_registered?: boolean
          spf_verified?: boolean
          tracking_verified?: boolean
          updated_at?: string
          user_id: string
          validation_log?: string | null
          verified?: boolean
        }
        Update: {
          brand_id?: string
          created_at?: string
          dkim_verified?: boolean
          dmarc_verified?: boolean
          dns_records?: Json
          domain?: string
          id?: string
          last_checked_at?: string | null
          mx_verified?: boolean
          provider?: string
          provider_domain_id?: string | null
          provider_registered?: boolean
          spf_verified?: boolean
          tracking_verified?: boolean
          updated_at?: string
          user_id?: string
          validation_log?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "brand_email_domains_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_form_submissions: {
        Row: {
          created_at: string
          data: Json
          form_id: string
          id: string
          page_id: string | null
          read_at: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          form_id: string
          id?: string
          page_id?: string | null
          read_at?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          form_id?: string
          id?: string
          page_id?: string | null
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "brand_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_form_submissions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_forms: {
        Row: {
          brand_id: string | null
          created_at: string | null
          email_config: Json | null
          fields: Json | null
          id: string
          name: string
          page_id: string | null
          theme_id: string | null
          type: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          email_config?: Json | null
          fields?: Json | null
          id?: string
          name: string
          page_id?: string | null
          theme_id?: string | null
          type?: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          email_config?: Json | null
          fields?: Json | null
          id?: string
          name?: string
          page_id?: string | null
          theme_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_forms_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_forms_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_forms_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_global_product_options: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
          values: Json
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
          values?: Json
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "brand_global_product_options_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_notes: {
        Row: {
          brand_id: string
          content: string | null
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          label: string | null
          tag: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          label?: string | null
          tag?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          label?: string | null
          tag?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_notes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_order_enquiries: {
        Row: {
          brand_id: string | null
          created_at: string
          currency: string
          email: string
          full_name: string
          id: string
          items: Json
          notes: string | null
          phone: string | null
          shipping_address: Json | null
          source_path: string | null
          status: string
          subtotal_cents: number
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          currency?: string
          email: string
          full_name: string
          id?: string
          items?: Json
          notes?: string | null
          phone?: string | null
          shipping_address?: Json | null
          source_path?: string | null
          status?: string
          subtotal_cents?: number
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          currency?: string
          email?: string
          full_name?: string
          id?: string
          items?: Json
          notes?: string | null
          phone?: string | null
          shipping_address?: Json | null
          source_path?: string | null
          status?: string
          subtotal_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_order_enquiries_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_payment_gateways: {
        Row: {
          api_key: string
          api_secret: string | null
          brand_id: string
          created_at: string
          id: string
          is_live: boolean
          label: string | null
          last_connected_at: string | null
          notes: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          api_secret?: string | null
          brand_id: string
          created_at?: string
          id?: string
          is_live?: boolean
          label?: string | null
          last_connected_at?: string | null
          notes?: string | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          api_secret?: string | null
          brand_id?: string
          created_at?: string
          id?: string
          is_live?: boolean
          label?: string | null
          last_connected_at?: string | null
          notes?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_payment_gateways_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_store_websites: {
        Row: {
          created_at: string
          store_id: string
          website_id: string
        }
        Insert: {
          created_at?: string
          store_id: string
          website_id: string
        }
        Update: {
          created_at?: string
          store_id?: string
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_store_websites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "brand_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_store_websites_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "brand_websites"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_stores: {
        Row: {
          brand_id: string
          created_at: string
          default_country_code: string | null
          default_currency: string
          id: string
          is_default: boolean
          medusa_base_url: string | null
          medusa_publishable_key: string | null
          medusa_sales_channel_id: string | null
          medusa_secret_key: string | null
          metadata: Json
          name: string
          stripe_account_id: string | null
          stripe_publishable_key: string | null
          stripe_secret_key: string | null
          stripe_webhook_secret: string | null
          tax_inclusive_pricing: boolean
          updated_at: string
          website_id: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          default_country_code?: string | null
          default_currency?: string
          id?: string
          is_default?: boolean
          medusa_base_url?: string | null
          medusa_publishable_key?: string | null
          medusa_sales_channel_id?: string | null
          medusa_secret_key?: string | null
          metadata?: Json
          name: string
          stripe_account_id?: string | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          stripe_webhook_secret?: string | null
          tax_inclusive_pricing?: boolean
          updated_at?: string
          website_id?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          default_country_code?: string | null
          default_currency?: string
          id?: string
          is_default?: boolean
          medusa_base_url?: string | null
          medusa_publishable_key?: string | null
          medusa_sales_channel_id?: string | null
          medusa_secret_key?: string | null
          metadata?: Json
          name?: string
          stripe_account_id?: string | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          stripe_webhook_secret?: string | null
          tax_inclusive_pricing?: boolean
          updated_at?: string
          website_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_stores_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_stores_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "brand_websites"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_user_invites: {
        Row: {
          admin_role: string | null
          brand_id: string
          created_at: string
          email: string
          expires_at: string
          first_name: string | null
          id: string
          last_name: string | null
          role: string
          token: string
        }
        Insert: {
          admin_role?: string | null
          brand_id: string
          created_at?: string
          email: string
          expires_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string
          token: string
        }
        Update: {
          admin_role?: string | null
          brand_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_user_invites_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_user_sessions: {
        Row: {
          brand_user_id: string
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          revoked_at: string | null
          token_hash: string
          user_agent: string | null
        }
        Insert: {
          brand_user_id: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          token_hash: string
          user_agent?: string | null
        }
        Update: {
          brand_user_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          token_hash?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_user_sessions_brand_user_id_fkey"
            columns: ["brand_user_id"]
            isOneToOne: false
            referencedRelation: "brand_users"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_users: {
        Row: {
          admin_role: string | null
          auth_user_id: string | null
          brand_id: string
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          last_name: string | null
          password_hash: string
          role: string
          updated_at: string
        }
        Insert: {
          admin_role?: string | null
          auth_user_id?: string | null
          brand_id: string
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_name?: string | null
          password_hash: string
          role?: string
          updated_at?: string
        }
        Update: {
          admin_role?: string | null
          auth_user_id?: string | null
          brand_id?: string
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_name?: string | null
          password_hash?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_users_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_views: {
        Row: {
          brand_id: string
          city: string | null
          country: string | null
          id: string
          referrer: string | null
          session_id: string | null
          viewed_at: string
          viewer_ip: string | null
          viewer_user_agent: string | null
        }
        Insert: {
          brand_id: string
          city?: string | null
          country?: string | null
          id?: string
          referrer?: string | null
          session_id?: string | null
          viewed_at?: string
          viewer_ip?: string | null
          viewer_user_agent?: string | null
        }
        Update: {
          brand_id?: string
          city?: string | null
          country?: string | null
          id?: string
          referrer?: string | null
          session_id?: string | null
          viewed_at?: string
          viewer_ip?: string | null
          viewer_user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_views_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_website_locations: {
        Row: {
          country_codes: string[]
          created_at: string
          geo_redirect: boolean
          id: string
          is_default: boolean
          name: string
          slug: string
          updated_at: string
          website_id: string
        }
        Insert: {
          country_codes?: string[]
          created_at?: string
          geo_redirect?: boolean
          id?: string
          is_default?: boolean
          name: string
          slug: string
          updated_at?: string
          website_id: string
        }
        Update: {
          country_codes?: string[]
          created_at?: string
          geo_redirect?: boolean
          id?: string
          is_default?: boolean
          name?: string
          slug?: string
          updated_at?: string
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_website_locations_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "brand_websites"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_websites: {
        Row: {
          brand_id: string
          created_at: string
          footer_page_id: string | null
          header_page_id: string | null
          id: string
          is_default: boolean
          name: string
          slug: string | null
          theme_id: string | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          footer_page_id?: string | null
          header_page_id?: string | null
          id?: string
          is_default?: boolean
          name: string
          slug?: string | null
          theme_id?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          footer_page_id?: string | null
          header_page_id?: string | null
          id?: string
          is_default?: boolean
          name?: string
          slug?: string | null
          theme_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_websites_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_websites_footer_page_id_fkey"
            columns: ["footer_page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_websites_header_page_id_fkey"
            columns: ["header_page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_websites_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          ahrefs_target: string | null
          brand_voice: string | null
          copilot_type: string | null
          country: string | null
          created_at: string
          data_source: string
          dataforseo_domain: string | null
          description: string | null
          design_system: string | null
          favicon_url: string | null
          footer_logo_url: string | null
          ga4_property_id: string | null
          gsc_site_url: string | null
          id: string
          industry: string | null
          is_public_shared: boolean | null
          key_selling_points: string[] | null
          language: string | null
          languages: Json | null
          logo_dark_url: string | null
          logo_light_url: string | null
          logo_url: string | null
          medusa_base_url: string | null
          medusa_publishable_key: string | null
          name: string
          selected_theme_id: string | null
          share_slug: string | null
          shared_at: string | null
          tagline: string | null
          target_audience: string | null
          timezone: string | null
          updated_at: string
          url: string | null
          use_brand_logo: boolean | null
          user_id: string
          website: string | null
          workspace_id: string | null
        }
        Insert: {
          ahrefs_target?: string | null
          brand_voice?: string | null
          copilot_type?: string | null
          country?: string | null
          created_at?: string
          data_source?: string
          dataforseo_domain?: string | null
          description?: string | null
          design_system?: string | null
          favicon_url?: string | null
          footer_logo_url?: string | null
          ga4_property_id?: string | null
          gsc_site_url?: string | null
          id?: string
          industry?: string | null
          is_public_shared?: boolean | null
          key_selling_points?: string[] | null
          language?: string | null
          languages?: Json | null
          logo_dark_url?: string | null
          logo_light_url?: string | null
          logo_url?: string | null
          medusa_base_url?: string | null
          medusa_publishable_key?: string | null
          name: string
          selected_theme_id?: string | null
          share_slug?: string | null
          shared_at?: string | null
          tagline?: string | null
          target_audience?: string | null
          timezone?: string | null
          updated_at?: string
          url?: string | null
          use_brand_logo?: boolean | null
          user_id: string
          website?: string | null
          workspace_id?: string | null
        }
        Update: {
          ahrefs_target?: string | null
          brand_voice?: string | null
          copilot_type?: string | null
          country?: string | null
          created_at?: string
          data_source?: string
          dataforseo_domain?: string | null
          description?: string | null
          design_system?: string | null
          favicon_url?: string | null
          footer_logo_url?: string | null
          ga4_property_id?: string | null
          gsc_site_url?: string | null
          id?: string
          industry?: string | null
          is_public_shared?: boolean | null
          key_selling_points?: string[] | null
          language?: string | null
          languages?: Json | null
          logo_dark_url?: string | null
          logo_light_url?: string | null
          logo_url?: string | null
          medusa_base_url?: string | null
          medusa_publishable_key?: string | null
          name?: string
          selected_theme_id?: string | null
          share_slug?: string | null
          shared_at?: string | null
          tagline?: string | null
          target_audience?: string | null
          timezone?: string | null
          updated_at?: string
          url?: string | null
          use_brand_logo?: boolean | null
          user_id?: string
          website?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_selected_theme_id_fkey"
            columns: ["selected_theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brands_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          account_email: string | null
          account_id: string | null
          attendees: Json
          calendar_id: string | null
          conference_provider: string | null
          created_at: string
          description: string | null
          end_at: string
          end_timezone: string | null
          google_event_id: string | null
          google_recurring_event_id: string | null
          ical_uid: string | null
          id: string
          is_all_day: boolean
          is_deleted: boolean
          location: string | null
          meet_url: string | null
          organizer_email: string | null
          organizer_name: string | null
          raw: Json | null
          response_status: string | null
          source: string
          start_at: string
          start_timezone: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_email?: string | null
          account_id?: string | null
          attendees?: Json
          calendar_id?: string | null
          conference_provider?: string | null
          created_at?: string
          description?: string | null
          end_at: string
          end_timezone?: string | null
          google_event_id?: string | null
          google_recurring_event_id?: string | null
          ical_uid?: string | null
          id?: string
          is_all_day?: boolean
          is_deleted?: boolean
          location?: string | null
          meet_url?: string | null
          organizer_email?: string | null
          organizer_name?: string | null
          raw?: Json | null
          response_status?: string | null
          source?: string
          start_at: string
          start_timezone?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_email?: string | null
          account_id?: string | null
          attendees?: Json
          calendar_id?: string | null
          conference_provider?: string | null
          created_at?: string
          description?: string | null
          end_at?: string
          end_timezone?: string | null
          google_event_id?: string | null
          google_recurring_event_id?: string | null
          ical_uid?: string | null
          id?: string
          is_all_day?: boolean
          is_deleted?: boolean
          location?: string | null
          meet_url?: string | null
          organizer_email?: string | null
          organizer_name?: string | null
          raw?: Json | null
          response_status?: string | null
          source?: string
          start_at?: string
          start_timezone?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_share_articles: {
        Row: {
          created_at: string
          post_id: string
          share_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          share_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          share_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_share_articles_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_share_articles_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "campaign_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_shares: {
        Row: {
          brand_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          group_date: string
          id: string
          is_active: boolean
          permissions: Json
          slug: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          group_date: string
          id?: string
          is_active?: boolean
          permissions?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          group_date?: string
          id?: string
          is_active?: boolean
          permissions?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_shares_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          brand_id: string | null
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_mentions: {
        Row: {
          chat_type: string
          created_at: string
          created_by: string
          id: string
          mentioned_user_id: string
          message_id: string
          step_id: string | null
          task_id: string
        }
        Insert: {
          chat_type?: string
          created_at?: string
          created_by?: string
          id?: string
          mentioned_user_id: string
          message_id: string
          step_id?: string | null
          task_id: string
        }
        Update: {
          chat_type?: string
          created_at?: string
          created_by?: string
          id?: string
          mentioned_user_id?: string
          message_id?: string
          step_id?: string | null
          task_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
          website_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
          website_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          website_id?: string | null
        }
        Relationships: []
      }
      checklist_item_time_logs: {
        Row: {
          action_type: string
          checklist_item_id: string
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          session_id: string
          timestamp: string
          user_id: string
        }
        Insert: {
          action_type: string
          checklist_item_id: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          session_id?: string
          timestamp?: string
          user_id: string
        }
        Update: {
          action_type?: string
          checklist_item_id?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          session_id?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_item_time_logs_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "task_subtask_checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      claude_token_usage: {
        Row: {
          completion_tokens: number
          cost_usd: number
          created_at: string
          id: string
          model: string
          prompt_tokens: number
          request_id: string
          total_tokens: number
          user_id: string
        }
        Insert: {
          completion_tokens: number
          cost_usd: number
          created_at?: string
          id?: string
          model: string
          prompt_tokens: number
          request_id: string
          total_tokens: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          id?: string
          model?: string
          prompt_tokens?: number
          request_id?: string
          total_tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      clickup_brand_map: {
        Row: {
          brand_id: string | null
          clickup_tag: string
          created_at: string
          id: string
          is_skipped: boolean
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          clickup_tag: string
          created_at?: string
          id?: string
          is_skipped?: boolean
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          clickup_tag?: string
          created_at?: string
          id?: string
          is_skipped?: boolean
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clickup_brand_map_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_field_meta: {
        Row: {
          id: string
          name: string
          source: string
          type: string | null
          type_config: Json | null
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          source?: string
          type?: string | null
          type_config?: Json | null
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          source?: string
          type?: string | null
          type_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      client_access: {
        Row: {
          client_id: string | null
          created_at: string | null
          granted_by: string | null
          id: string
          permissions: Json
          resource_id: string
          resource_type: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          granted_by?: string | null
          id?: string
          permissions?: Json
          resource_id: string
          resource_type: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          granted_by?: string | null
          id?: string
          permissions?: Json
          resource_id?: string
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      composio_connections: {
        Row: {
          auth_config_id: string | null
          brand_id: string | null
          connection_id: string | null
          connection_request_id: string | null
          created_at: string
          display_name: string | null
          id: string
          status: string
          toolkit_slug: string
          updated_at: string
          upsert_scope_key: string | null
          user_id: string
        }
        Insert: {
          auth_config_id?: string | null
          brand_id?: string | null
          connection_id?: string | null
          connection_request_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          status?: string
          toolkit_slug: string
          updated_at?: string
          upsert_scope_key?: string | null
          user_id: string
        }
        Update: {
          auth_config_id?: string | null
          brand_id?: string | null
          connection_id?: string | null
          connection_request_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          status?: string
          toolkit_slug?: string
          updated_at?: string
          upsert_scope_key?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "composio_connections_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_websites: {
        Row: {
          analysis_frequency: string | null
          brand_id: string | null
          created_at: string
          description: string | null
          domain: string
          id: string
          industry: string | null
          is_active: boolean
          language_code: string | null
          last_analyzed_at: string | null
          location_code: number | null
          name: string | null
          updated_at: string
          user_id: string
          website_url: string
          workspace_id: string | null
        }
        Insert: {
          analysis_frequency?: string | null
          brand_id?: string | null
          created_at?: string
          description?: string | null
          domain: string
          id?: string
          industry?: string | null
          is_active?: boolean
          language_code?: string | null
          last_analyzed_at?: string | null
          location_code?: number | null
          name?: string | null
          updated_at?: string
          user_id: string
          website_url: string
          workspace_id?: string | null
        }
        Update: {
          analysis_frequency?: string | null
          brand_id?: string | null
          created_at?: string
          description?: string | null
          domain?: string
          id?: string
          industry?: string | null
          is_active?: boolean
          language_code?: string | null
          last_analyzed_at?: string | null
          location_code?: number | null
          name?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connected_websites_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      content_page_visibility: {
        Row: {
          content_id: string
          created_at: string
          page_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          page_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_page_visibility_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_page_visibility_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      content_settings: {
        Row: {
          brand_description: string | null
          brand_id: string
          brand_mentions: string
          brand_name: string | null
          competitor_mentions: string
          content_images: string | null
          content_language: string | null
          content_model: string | null
          created_at: string
          custom_instructions: string | null
          exclusions: string | null
          external_links: string
          external_search: boolean
          featured_image: boolean | null
          id: string
          image_model: string | null
          image_style: string
          internal_links: string
          key_selling_points: string[] | null
          target_audience: string | null
          target_country: string | null
          updated_at: string
          use_brand_info: boolean
          user_id: string
          website_url: string | null
        }
        Insert: {
          brand_description?: string | null
          brand_id: string
          brand_mentions?: string
          brand_name?: string | null
          competitor_mentions?: string
          content_images?: string | null
          content_language?: string | null
          content_model?: string | null
          created_at?: string
          custom_instructions?: string | null
          exclusions?: string | null
          external_links?: string
          external_search?: boolean
          featured_image?: boolean | null
          id?: string
          image_model?: string | null
          image_style?: string
          internal_links?: string
          key_selling_points?: string[] | null
          target_audience?: string | null
          target_country?: string | null
          updated_at?: string
          use_brand_info?: boolean
          user_id: string
          website_url?: string | null
        }
        Update: {
          brand_description?: string | null
          brand_id?: string
          brand_mentions?: string
          brand_name?: string | null
          competitor_mentions?: string
          content_images?: string | null
          content_language?: string | null
          content_model?: string | null
          created_at?: string
          custom_instructions?: string | null
          exclusions?: string | null
          external_links?: string
          external_search?: boolean
          featured_image?: boolean | null
          id?: string
          image_model?: string | null
          image_style?: string
          internal_links?: string
          key_selling_points?: string[] | null
          target_audience?: string | null
          target_country?: string | null
          updated_at?: string
          use_brand_info?: boolean
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      context_memories: {
        Row: {
          brand_id: string | null
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          source: string
          title: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          category?: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          source?: string
          title: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          brand_id?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          source?: string
          title?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      conversation_sources: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          file_id: string | null
          id: string
          label: string
          metadata: Json
          source_type: string
          url: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          file_id?: string | null
          id?: string
          label: string
          metadata?: Json
          source_type: string
          url?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          file_id?: string | null
          id?: string
          label?: string
          metadata?: Json
          source_type?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_sources_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_sources_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "file_attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_id: string | null
          brand_id: string | null
          conversation_type: string | null
          created_at: string
          id: string
          is_pinned: boolean
          last_message_at: string
          source_workflow_run_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          brand_id?: string | null
          conversation_type?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean
          last_message_at?: string
          source_workflow_run_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          brand_id?: string | null
          conversation_type?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean
          last_message_at?: string
          source_workflow_run_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "custom_instruction_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_source_workflow_run_id_fkey"
            columns: ["source_workflow_run_id"]
            isOneToOne: true
            referencedRelation: "ai_workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_instances: {
        Row: {
          brand_id: string | null
          created_at: string | null
          custom_configuration: Json | null
          custom_prompts: Json | null
          id: string
          name: string
          status: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          custom_configuration?: Json | null
          custom_prompts?: Json | null
          id?: string
          name: string
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          custom_configuration?: Json | null
          custom_prompts?: Json | null
          id?: string
          name?: string
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "copilot_instances_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "copilot_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_templates: {
        Row: {
          base_copilot_type: string
          configuration: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_admin_only: boolean | null
          is_template: boolean | null
          name: string
          prompt_templates: Json | null
          slug: string
          updated_at: string | null
          workflow_config: Json | null
        }
        Insert: {
          base_copilot_type: string
          configuration?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_admin_only?: boolean | null
          is_template?: boolean | null
          name: string
          prompt_templates?: Json | null
          slug: string
          updated_at?: string | null
          workflow_config?: Json | null
        }
        Update: {
          base_copilot_type?: string
          configuration?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_admin_only?: boolean | null
          is_template?: boolean | null
          name?: string
          prompt_templates?: Json | null
          slug?: string
          updated_at?: string | null
          workflow_config?: Json | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string | null
          flag_emoji: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          flag_emoji?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          flag_emoji?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_agents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          instructions: Json
          is_active: boolean
          last_used_at: string | null
          name: string
          questions: Json
          updated_at: string
          usage_count: number
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          instructions?: Json
          is_active?: boolean
          last_used_at?: string | null
          name: string
          questions?: Json
          updated_at?: string
          usage_count?: number
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          instructions?: Json
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          questions?: Json
          updated_at?: string
          usage_count?: number
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      custom_instruction_prompts: {
        Row: {
          brand_id: string | null
          category: string
          content: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
          visibility: string
          workflow_type: string | null
          workspace_id: string | null
        }
        Insert: {
          brand_id?: string | null
          category?: string
          content: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
          visibility?: string
          workflow_type?: string | null
          workspace_id?: string | null
        }
        Update: {
          brand_id?: string | null
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string
          workflow_type?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_instruction_prompts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_instruction_prompts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      data_report_snapshots: {
        Row: {
          created_at: string
          id: string
          processed_kpis: Json | null
          raw_data: Json
          report_id: string
          row_count: number
          snapshot_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          processed_kpis?: Json | null
          raw_data?: Json
          report_id: string
          row_count?: number
          snapshot_date?: string
        }
        Update: {
          created_at?: string
          id?: string
          processed_kpis?: Json | null
          raw_data?: Json
          report_id?: string
          row_count?: number
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_report_snapshots_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "data_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_report_snapshots_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      data_reports: {
        Row: {
          account_id: string | null
          brand_id: string | null
          chart_configuration: Json | null
          column_mappings: Json | null
          created_at: string
          description: string | null
          google_sheets_url: string
          id: string
          import_error_message: string | null
          kpi_configuration: Json | null
          last_import_at: string | null
          name: string
          sheet_gid: string | null
          sheet_name: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          account_id?: string | null
          brand_id?: string | null
          chart_configuration?: Json | null
          column_mappings?: Json | null
          created_at?: string
          description?: string | null
          google_sheets_url: string
          id?: string
          import_error_message?: string | null
          kpi_configuration?: Json | null
          last_import_at?: string | null
          name: string
          sheet_gid?: string | null
          sheet_name?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          account_id?: string | null
          brand_id?: string | null
          chart_configuration?: Json | null
          column_mappings?: Json | null
          created_at?: string
          description?: string | null
          google_sheets_url?: string
          id?: string
          import_error_message?: string | null
          kpi_configuration?: Json | null
          last_import_at?: string | null
          name?: string
          sheet_gid?: string | null
          sheet_name?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_reports_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_reports_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      data_source_mappings: {
        Row: {
          column_mappings: Json
          created_at: string | null
          data_source_id: string
          id: string
          kpi_mappings: Json
          report_name: string
          updated_at: string | null
        }
        Insert: {
          column_mappings: Json
          created_at?: string | null
          data_source_id: string
          id?: string
          kpi_mappings: Json
          report_name: string
          updated_at?: string | null
        }
        Update: {
          column_mappings?: Json
          created_at?: string | null
          data_source_id?: string
          id?: string
          kpi_mappings?: Json
          report_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_source_mappings_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_source_mappings_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "kpi_report_view"
            referencedColumns: ["data_source_id"]
          },
          {
            foreignKeyName: "data_source_mappings_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "report_data_sources"
            referencedColumns: ["data_source_id"]
          },
        ]
      }
      data_sources: {
        Row: {
          columns_count: number | null
          configuration: Json | null
          created_at: string | null
          header_row: number | null
          id: string
          is_active: boolean | null
          last_import_at: string | null
          name: string
          rows_count: number | null
          type: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          columns_count?: number | null
          configuration?: Json | null
          created_at?: string | null
          header_row?: number | null
          id?: string
          is_active?: boolean | null
          last_import_at?: string | null
          name: string
          rows_count?: number | null
          type: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          columns_count?: number | null
          configuration?: Json | null
          created_at?: string | null
          header_row?: number | null
          id?: string
          is_active?: boolean | null
          last_import_at?: string | null
          name?: string
          rows_count?: number | null
          type?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      data_studio_account_map: {
        Row: {
          account_id: string
          account_name: string | null
          brand_id: string
          channel: string
          created_at: string
          id: number
          platform: string
          updated_at: string
        }
        Insert: {
          account_id: string
          account_name?: string | null
          brand_id: string
          channel: string
          created_at?: string
          id?: number
          platform: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_name?: string | null
          brand_id?: string
          channel?: string
          created_at?: string
          id?: number
          platform?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_studio_account_map_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      data_studio_breakdowns: {
        Row: {
          account_id: string
          brand_id: string
          channel: string
          clicks: number
          conversions: number
          cost: number
          created_at: string
          date: string
          dimension: string
          id: number
          impressions: number
          platform: string
          revenue: number
          updated_at: string
          value: string
        }
        Insert: {
          account_id: string
          brand_id: string
          channel: string
          clicks?: number
          conversions?: number
          cost?: number
          created_at?: string
          date: string
          dimension: string
          id?: number
          impressions?: number
          platform: string
          revenue?: number
          updated_at?: string
          value: string
        }
        Update: {
          account_id?: string
          brand_id?: string
          channel?: string
          clicks?: number
          conversions?: number
          cost?: number
          created_at?: string
          date?: string
          dimension?: string
          id?: number
          impressions?: number
          platform?: string
          revenue?: number
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_studio_breakdowns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      data_studio_daily_metrics: {
        Row: {
          account_id: string
          brand_id: string
          channel: string
          clicks: number
          conversions: number
          cost: number
          created_at: string
          currency: string | null
          date: string
          id: number
          impressions: number
          platform: string
          revenue: number
          updated_at: string
        }
        Insert: {
          account_id: string
          brand_id: string
          channel: string
          clicks?: number
          conversions?: number
          cost?: number
          created_at?: string
          currency?: string | null
          date: string
          id?: number
          impressions?: number
          platform: string
          revenue?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          brand_id?: string
          channel?: string
          clicks?: number
          conversions?: number
          cost?: number
          created_at?: string
          currency?: string | null
          date?: string
          id?: number
          impressions?: number
          platform?: string
          revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_studio_daily_metrics_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      design_library: {
        Row: {
          aspect_ratio: string | null
          brand_name: string | null
          campaign_goal: string | null
          created_at: string
          created_by: string | null
          design_notes: string | null
          format: string | null
          hook_text: string | null
          id: string
          image_data: string | null
          image_url: string
          is_active: boolean | null
          style_name: string | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          aspect_ratio?: string | null
          brand_name?: string | null
          campaign_goal?: string | null
          created_at?: string
          created_by?: string | null
          design_notes?: string | null
          format?: string | null
          hook_text?: string | null
          id?: string
          image_data?: string | null
          image_url: string
          is_active?: boolean | null
          style_name?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          aspect_ratio?: string | null
          brand_name?: string | null
          campaign_goal?: string | null
          created_at?: string
          created_by?: string | null
          design_notes?: string | null
          format?: string | null
          hook_text?: string | null
          id?: string
          image_data?: string | null
          image_url?: string
          is_active?: boolean | null
          style_name?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      dimension_data: {
        Row: {
          created_at: string | null
          date: string | null
          dimension_id: string
          id: string
          metadata: Json | null
          report_id: string
          text_value: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          dimension_id: string
          id?: string
          metadata?: Json | null
          report_id: string
          text_value?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          dimension_id?: string
          id?: string
          metadata?: Json | null
          report_id?: string
          text_value?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dimension_data_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dimension_data_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "data_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dimension_data_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      dimensions: {
        Row: {
          availability: string | null
          created_at: string | null
          formula: string | null
          id: string
          is_system: boolean | null
          name: string
          report_id: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          availability?: string | null
          created_at?: string | null
          formula?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          report_id?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          availability?: string | null
          created_at?: string | null
          formula?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          report_id?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dimensions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "data_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dimensions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_workspaces: {
        Row: {
          created_at: string | null
          domain: string
          domain_verified: boolean | null
          id: string
          owner_email: string
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          domain_verified?: boolean | null
          id?: string
          owner_email: string
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          domain_verified?: boolean | null
          id?: string
          owner_email?: string
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      featured_image_gallery: {
        Row: {
          brand_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string
          name: string
          topics: string[] | null
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          name: string
          topics?: string[] | null
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          name?: string
          topics?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_image_gallery_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      file_attachments: {
        Row: {
          brand_id: string | null
          conversation_id: string | null
          created_at: string
          extracted_text: string | null
          extraction_status: string
          file_name: string
          file_size_bytes: number | null
          id: string
          metadata: Json
          mime_type: string
          public_url: string
          storage_path: string
          theme_id: string | null
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          conversation_id?: string | null
          created_at?: string
          extracted_text?: string | null
          extraction_status?: string
          file_name: string
          file_size_bytes?: number | null
          id?: string
          metadata?: Json
          mime_type: string
          public_url: string
          storage_path: string
          theme_id?: string | null
          user_id: string
        }
        Update: {
          brand_id?: string | null
          conversation_id?: string | null
          created_at?: string
          extracted_text?: string | null
          extraction_status?: string
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          metadata?: Json
          mime_type?: string
          public_url?: string
          storage_path?: string
          theme_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_attachments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_attachments_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      forecasts: {
        Row: {
          average_daily_rate: number | null
          breakdown_data: Json | null
          commission_rate: number | null
          conversion_rate: number | null
          cost_of_sell: number | null
          created_at: string | null
          direct_bookings_target: number | null
          email: string | null
          id: string
          name: string
          occupancy_rate: number | null
          report_id: string
          rooms: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_daily_rate?: number | null
          breakdown_data?: Json | null
          commission_rate?: number | null
          conversion_rate?: number | null
          cost_of_sell?: number | null
          created_at?: string | null
          direct_bookings_target?: number | null
          email?: string | null
          id?: string
          name: string
          occupancy_rate?: number | null
          report_id: string
          rooms?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_daily_rate?: number | null
          breakdown_data?: Json | null
          commission_rate?: number | null
          conversion_rate?: number | null
          cost_of_sell?: number | null
          created_at?: string | null
          direct_bookings_target?: number | null
          email?: string | null
          id?: string
          name?: string
          occupancy_rate?: number | null
          report_id?: string
          rooms?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      form_messages: {
        Row: {
          content: string
          created_at: string
          form_id: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          form_id: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          form_id?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_messages_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "form_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_page_links: {
        Row: {
          created_at: string
          form_id: string
          page_id: string
        }
        Insert: {
          created_at?: string
          form_id: string
          page_id: string
        }
        Update: {
          created_at?: string
          form_id?: string
          page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_page_links_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "brand_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_page_links_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      form_questions: {
        Row: {
          choices: Json | null
          created_at: string
          form_id: string
          id: string
          order_index: number
          prompt: string
          required: boolean
          updated_at: string
        }
        Insert: {
          choices?: Json | null
          created_at?: string
          form_id: string
          id?: string
          order_index?: number
          prompt: string
          required?: boolean
          updated_at?: string
        }
        Update: {
          choices?: Json | null
          created_at?: string
          form_id?: string
          id?: string
          order_index?: number
          prompt?: string
          required?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_questions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_sessions: {
        Row: {
          brand_name: string | null
          company: string | null
          created_at: string
          email: string | null
          form_id: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          brand_name?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          form_id: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          brand_name?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          form_id?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_sessions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string
          email: string
          form_type: string
          id: string
          message: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          form_type?: string
          id?: string
          message: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          form_type?: string
          id?: string
          message?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      forms: {
        Row: {
          brand_id: string | null
          category: string | null
          created_at: string
          id: string
          prompt: string | null
          slug: string
          title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          brand_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          prompt?: string | null
          slug: string
          title: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          brand_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          prompt?: string | null
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      generated_articles: {
        Row: {
          content: string
          created_at: string
          id: string
          keywords: string[] | null
          meta_description: string | null
          published_to_wordpress: boolean | null
          status: string
          title: string
          updated_at: string
          user_id: string
          wordpress_post_id: number | null
          wordpress_post_url: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          published_to_wordpress?: boolean | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          wordpress_post_id?: number | null
          wordpress_post_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          published_to_wordpress?: boolean | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          wordpress_post_id?: number | null
          wordpress_post_url?: string | null
        }
        Relationships: []
      }
      generated_deck_pages: {
        Row: {
          archetype: string | null
          created_at: string
          deck_id: string
          description: string | null
          error_message: string | null
          id: string
          image_url: string | null
          page_index: number
          prompt: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          archetype?: string | null
          created_at?: string
          deck_id: string
          description?: string | null
          error_message?: string | null
          id?: string
          image_url?: string | null
          page_index?: number
          prompt?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          archetype?: string | null
          created_at?: string
          deck_id?: string
          description?: string | null
          error_message?: string | null
          id?: string
          image_url?: string | null
          page_index?: number
          prompt?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_deck_pages_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "generated_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_decks: {
        Row: {
          brand_id: string | null
          conversation_id: string | null
          created_at: string
          deck_type: string
          design_system: Json | null
          format: string | null
          id: string
          logo_url: string | null
          sources_context: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          conversation_id?: string | null
          created_at?: string
          deck_type: string
          design_system?: Json | null
          format?: string | null
          id?: string
          logo_url?: string | null
          sources_context?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          conversation_id?: string | null
          created_at?: string
          deck_type?: string
          design_system?: Json | null
          format?: string | null
          id?: string
          logo_url?: string | null
          sources_context?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_decks_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_decks_conversation_id_conversations_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_page_versions: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          layout_json: Json | null
          meta: Json
          page_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          layout_json?: Json | null
          meta?: Json
          page_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          layout_json?: Json | null
          meta?: Json
          page_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_page_versions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_pages: {
        Row: {
          brand_id: string
          chrome_inlined_at: string | null
          content: Json
          created_at: string
          design_system: Json | null
          error_message: string | null
          id: string
          is_locked: boolean
          layout_json: Json | null
          layout_json_pre_chrome_inline: Json | null
          locale: string
          location_id: string | null
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          page_category: string | null
          parent_page_id: string | null
          prompt: string
          seo_index: boolean
          slug: string | null
          status: string
          system_page_id: string | null
          template_id: string
          theme: string
          theme_id: string
          title: string
          translations: Json
          updated_at: string
          user_id: string
          visibility_scope: string
          website_id: string | null
        }
        Insert: {
          brand_id: string
          chrome_inlined_at?: string | null
          content?: Json
          created_at?: string
          design_system?: Json | null
          error_message?: string | null
          id?: string
          is_locked?: boolean
          layout_json?: Json | null
          layout_json_pre_chrome_inline?: Json | null
          locale?: string
          location_id?: string | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          page_category?: string | null
          parent_page_id?: string | null
          prompt: string
          seo_index?: boolean
          slug?: string | null
          status?: string
          system_page_id?: string | null
          template_id: string
          theme?: string
          theme_id: string
          title: string
          translations?: Json
          updated_at?: string
          user_id: string
          visibility_scope?: string
          website_id?: string | null
        }
        Update: {
          brand_id?: string
          chrome_inlined_at?: string | null
          content?: Json
          created_at?: string
          design_system?: Json | null
          error_message?: string | null
          id?: string
          is_locked?: boolean
          layout_json?: Json | null
          layout_json_pre_chrome_inline?: Json | null
          locale?: string
          location_id?: string | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          page_category?: string | null
          parent_page_id?: string | null
          prompt?: string
          seo_index?: boolean
          slug?: string | null
          status?: string
          system_page_id?: string | null
          template_id?: string
          theme?: string
          theme_id?: string
          title?: string
          translations?: Json
          updated_at?: string
          user_id?: string
          visibility_scope?: string
          website_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_pages_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_pages_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "brand_website_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_pages_parent_page_id_fkey"
            columns: ["parent_page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_pages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "page_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_pages_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_pages_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "brand_websites"
            referencedColumns: ["id"]
          },
        ]
      }
      global_ai_token_usage: {
        Row: {
          created_at: string
          estimated_cost_usd: number
          id: string
          input_tokens: number
          metadata: Json | null
          model: string
          output_tokens: number
          provider: string
          request_id: string
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          estimated_cost_usd: number
          id?: string
          input_tokens: number
          metadata?: Json | null
          model: string
          output_tokens: number
          provider: string
          request_id: string
          total_tokens: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model?: string
          output_tokens?: number
          provider?: string
          request_id?: string
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: []
      }
      history_items: {
        Row: {
          brand_id: string | null
          category: string
          content: string
          created_at: string
          date: string
          id: string
          prompt: string
          share_id: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          brand_id?: string | null
          category: string
          content: string
          created_at?: string
          date?: string
          id?: string
          prompt: string
          share_id?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          brand_id?: string | null
          category?: string
          content?: string
          created_at?: string
          date?: string
          id?: string
          prompt?: string
          share_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "history_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      humanize_references: {
        Row: {
          content: string
          created_at: string
          id: string
          language: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          language?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          language?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      image_uploads: {
        Row: {
          compressed_size: number | null
          created_at: string
          file_size: number
          filename: string
          height: number | null
          id: string
          mime_type: string
          original_name: string
          storage_path: string
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          compressed_size?: number | null
          created_at?: string
          file_size: number
          filename: string
          height?: number | null
          id?: string
          mime_type: string
          original_name: string
          storage_path: string
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          compressed_size?: number | null
          created_at?: string
          file_size?: number
          filename?: string
          height?: number | null
          id?: string
          mime_type?: string
          original_name?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      instance_token_usage: {
        Row: {
          completion_tokens: number
          created_at: string
          estimated_cost_usd: number
          id: string
          instance_id: string
          model: string
          prompt_tokens: number
          session_id: string | null
          source: string | null
          total_tokens: number
          user_id: string
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          instance_id: string
          model: string
          prompt_tokens?: number
          session_id?: string | null
          source?: string | null
          total_tokens?: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          instance_id?: string
          model?: string
          prompt_tokens?: number
          session_id?: string | null
          source?: string | null
          total_tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instance_token_usage_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instance_token_usage_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bot_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      instances: {
        Row: {
          access_token: string | null
          bot_connected_at: string | null
          bot_version: string | null
          created_at: string
          gateway_url: string | null
          id: string
          name: string
          public_url: string | null
          railway_env_id: string | null
          railway_service_id: string | null
          status: string
          supabase_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          bot_connected_at?: string | null
          bot_version?: string | null
          created_at?: string
          gateway_url?: string | null
          id?: string
          name: string
          public_url?: string | null
          railway_env_id?: string | null
          railway_service_id?: string | null
          status?: string
          supabase_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          bot_connected_at?: string | null
          bot_version?: string | null
          created_at?: string
          gateway_url?: string | null
          id?: string
          name?: string
          public_url?: string | null
          railway_env_id?: string | null
          railway_service_id?: string | null
          status?: string
          supabase_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      instruction_shares: {
        Row: {
          created_at: string
          id: string
          instruction_id: string
          shared_by: string
          source_workspace_id: string
          target_workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instruction_id: string
          shared_by: string
          source_workspace_id: string
          target_workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instruction_id?: string
          shared_by?: string
          source_workspace_id?: string
          target_workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instruction_shares_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: false
            referencedRelation: "instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      instructions: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          brand_id: string
          category: string
          content: string
          created_at: string
          file_url: string | null
          id: string
          is_active: boolean
          name: string
          source_id: string | null
          source_type: string
          source_url: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          brand_id: string
          category?: string
          content: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          source_id?: string | null
          source_type?: string
          source_url?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          brand_id?: string
          category?: string
          content?: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          source_id?: string | null
          source_type?: string
          source_url?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      learning_workflow_steps: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          prompt_template: string
          step_name: string
          step_order: number
          updated_at: string
          workflow_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          prompt_template?: string
          step_name: string
          step_order: number
          updated_at?: string
          workflow_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          prompt_template?: string
          step_name?: string
          step_order?: number
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "learning_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_workflows: {
        Row: {
          category: string
          created_at: string
          description: string | null
          difficulty: string
          id: string
          is_published: boolean
          name: string
          tools: Json
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          id?: string
          is_published?: boolean
          name: string
          tools?: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          id?: string
          is_published?: boolean
          name?: string
          tools?: Json
          updated_at?: string
        }
        Relationships: []
      }
      live_transcription_segments: {
        Row: {
          confidence: number | null
          created_at: string
          end_time: number | null
          id: string
          is_final: boolean | null
          meeting_id: string
          segment_text: string
          start_time: number | null
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          end_time?: number | null
          id?: string
          is_final?: boolean | null
          meeting_id: string
          segment_text: string
          start_time?: number | null
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          end_time?: number | null
          id?: string
          is_final?: boolean | null
          meeting_id?: string
          segment_text?: string
          start_time?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_transcription_segments_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_metrics: {
        Row: {
          ad_name: string
          adgroup: string
          campaign: string
          channel: string
          clicks: number | null
          client: string
          conversions: number | null
          cost: number | null
          created_at: string
          date: string
          id: string
          impressions: number | null
          keyword: string
          other_metrics: Json
          platform: string | null
          report_id: string | null
          revenue: number | null
          sheet_gid: string | null
          source_name: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          ad_name?: string
          adgroup?: string
          campaign?: string
          channel: string
          clicks?: number | null
          client: string
          conversions?: number | null
          cost?: number | null
          created_at?: string
          date: string
          id?: string
          impressions?: number | null
          keyword?: string
          other_metrics?: Json
          platform?: string | null
          report_id?: string | null
          revenue?: number | null
          sheet_gid?: string | null
          source_name: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          ad_name?: string
          adgroup?: string
          campaign?: string
          channel?: string
          clicks?: number | null
          client?: string
          conversions?: number | null
          cost?: number | null
          created_at?: string
          date?: string
          id?: string
          impressions?: number | null
          keyword?: string
          other_metrics?: Json
          platform?: string | null
          report_id?: string | null
          revenue?: number | null
          sheet_gid?: string | null
          source_name?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      mc_agents: {
        Row: {
          board_id: string | null
          created_at: string
          id: string
          last_seen_at: string | null
          metadata: Json
          name: string
          role: string
          sparti_agent_id: string | null
          sparti_agent_source: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          board_id?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json
          name: string
          role?: string
          sparti_agent_id?: string | null
          sparti_agent_source?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          board_id?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json
          name?: string
          role?: string
          sparti_agent_id?: string | null
          sparti_agent_source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mc_agents_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "mc_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_approval_requests: {
        Row: {
          action_type: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          payload: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          payload?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          payload?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mc_audit_events: {
        Row: {
          actor: string
          created_at: string
          event_type: string
          id: string
          instance_id: string | null
          payload: Json
          user_id: string
        }
        Insert: {
          actor?: string
          created_at?: string
          event_type: string
          id?: string
          instance_id?: string | null
          payload?: Json
          user_id: string
        }
        Update: {
          actor?: string
          created_at?: string
          event_type?: string
          id?: string
          instance_id?: string | null
          payload?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mc_audit_events_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_board_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mc_boards: {
        Row: {
          created_at: string
          description: string | null
          group_id: string | null
          id: string
          name: string
          sparti_brand_id: string | null
          sparti_project_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          name: string
          sparti_brand_id?: string | null
          sparti_project_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          name?: string
          sparti_brand_id?: string | null
          sparti_project_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mc_boards_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "mc_board_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      mc_prompts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          payload: Json
          slug: string
          type: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          payload?: Json
          slug: string
          type?: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          payload?: Json
          slug?: string
          type?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      mc_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mc_tasks: {
        Row: {
          assignee_agent: string | null
          board_id: string
          column_status: string
          created_at: string
          description: string | null
          id: string
          priority: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignee_agent?: string | null
          board_id: string
          column_status?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignee_agent?: string | null
          board_id?: string
          column_status?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mc_tasks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "mc_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_action_items: {
        Row: {
          completed: boolean | null
          content: string
          created_at: string
          id: string
          meeting_id: string
        }
        Insert: {
          completed?: boolean | null
          content: string
          created_at?: string
          id?: string
          meeting_id: string
        }
        Update: {
          completed?: boolean | null
          content?: string
          created_at?: string
          id?: string
          meeting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_labels: {
        Row: {
          created_at: string
          id: string
          label: string
          meeting_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          meeting_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          meeting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_labels_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          meeting_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          meeting_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          meeting_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string
          id: string
          initials: string
          meeting_id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          initials: string
          meeting_id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          initials?: string
          meeting_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_transcripts: {
        Row: {
          bookmarked: boolean | null
          created_at: string
          id: string
          is_highlighted: boolean | null
          meeting_id: string
          speaker_id: string
          speaker_name: string
          text: string
          timestamp: string
        }
        Insert: {
          bookmarked?: boolean | null
          created_at?: string
          id?: string
          is_highlighted?: boolean | null
          meeting_id: string
          speaker_id: string
          speaker_name: string
          text: string
          timestamp: string
        }
        Update: {
          bookmarked?: boolean | null
          created_at?: string
          id?: string
          is_highlighted?: boolean | null
          meeting_id?: string
          speaker_id?: string
          speaker_name?: string
          text?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_transcripts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          audio_url: string | null
          brand_id: string | null
          created_at: string
          date: string
          duration: number
          id: string
          is_live_recording: boolean | null
          title: string
          transcription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          brand_id?: string | null
          created_at?: string
          date?: string
          duration?: number
          id?: string
          is_live_recording?: boolean | null
          title: string
          transcription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          brand_id?: string | null
          created_at?: string
          date?: string
          duration?: number
          id?: string
          is_live_recording?: boolean | null
          title?: string
          transcription_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_categories: {
        Row: {
          brand_id: string | null
          created_at: string
          id: string
          is_custom: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          id?: string
          is_custom?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          id?: string
          is_custom?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_categories_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_items: {
        Row: {
          brand_id: string | null
          category: string | null
          content: string
          created_at: string
          id: string
          is_custom_category: boolean | null
          last_used_at: string | null
          tags: string[] | null
          title: string
          updated_at: string
          used_by_claude: boolean | null
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          category?: string | null
          content: string
          created_at?: string
          id?: string
          is_custom_category?: boolean | null
          last_used_at?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          used_by_claude?: boolean | null
          user_id: string
        }
        Update: {
          brand_id?: string | null
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          is_custom_category?: boolean | null
          last_used_at?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          used_by_claude?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_user: boolean
          timestamp: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_user: boolean
          timestamp?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_user?: boolean
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_token_usage: {
        Row: {
          created_at: string | null
          id: string
          month_year: string
          tokens_limit: number
          tokens_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          month_year: string
          tokens_limit: number
          tokens_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          month_year?: string
          tokens_limit?: number
          tokens_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      page_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          kind: string
          name: string
          preview_image_url: string | null
          schema: Json
          slug: string
          theme_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          preview_image_url?: string | null
          schema?: Json
          slug: string
          theme_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          preview_image_url?: string | null
          schema?: Json
          slug?: string
          theme_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_templates_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      pinned_tasks: {
        Row: {
          created_at: string
          id: string
          is_today: boolean
          pinned_at: string
          pinned_by: string
          step_id: string | null
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_today?: boolean
          pinned_at?: string
          pinned_by: string
          step_id?: string | null
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_today?: boolean
          pinned_at?: string
          pinned_by?: string
          step_id?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean | null
          brand_limit: number | null
          created_at: string
          features: string[]
          free_trial: number | null
          id: string
          name: string
          price: number
          stripe_price_id: string | null
          subscription_type:
            | Database["public"]["Enums"]["subscription_type"]
            | null
          token_limit: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          brand_limit?: number | null
          created_at?: string
          features: string[]
          free_trial?: number | null
          id: string
          name: string
          price: number
          stripe_price_id?: string | null
          subscription_type?:
            | Database["public"]["Enums"]["subscription_type"]
            | null
          token_limit?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          brand_limit?: number | null
          created_at?: string
          features?: string[]
          free_trial?: number | null
          id?: string
          name?: string
          price?: number
          stripe_price_id?: string | null
          subscription_type?:
            | Database["public"]["Enums"]["subscription_type"]
            | null
          token_limit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          billing_cycle_day: number | null
          created_at: string
          domain_workspace_id: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          plan_id: string | null
          preferences: Json
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_created_at: string | null
          subscription_status: string | null
          subscription_updated_at: string | null
          tokens: number | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          billing_cycle_day?: number | null
          created_at?: string
          domain_workspace_id?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          plan_id?: string | null
          preferences?: Json
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_created_at?: string | null
          subscription_status?: string | null
          subscription_updated_at?: string | null
          tokens?: number | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          billing_cycle_day?: number | null
          created_at?: string
          domain_workspace_id?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          plan_id?: string | null
          preferences?: Json
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_created_at?: string | null
          subscription_status?: string | null
          subscription_updated_at?: string | null
          tokens?: number | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_domain_workspace_id_fkey"
            columns: ["domain_workspace_id"]
            isOneToOne: false
            referencedRelation: "domain_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          assignee_task_user_id: string | null
          assignee_user_id: string | null
          brand_id: string | null
          category: string | null
          comment_count: number | null
          content: Json | null
          created_at: string
          description: string | null
          due_date: string | null
          external_archived: boolean | null
          external_assignees: Json | null
          external_comments: Json | null
          external_custom_fields: Json | null
          external_date_closed: string | null
          external_date_created: string | null
          external_date_done: string | null
          external_date_updated: string | null
          external_folder: string | null
          external_id: string | null
          external_list: string | null
          external_parent_id: string | null
          external_priority: string | null
          external_raw: Json | null
          external_source: string | null
          external_space: string | null
          external_status: string | null
          external_status_color: string | null
          external_status_type: string | null
          external_synced_at: string | null
          external_tags: string[] | null
          external_url: string | null
          external_watchers: Json | null
          global_prompt: string | null
          id: string
          is_active: boolean | null
          position: number | null
          priority: string | null
          project_knowledge: Json | null
          service: string | null
          start_date: string | null
          status: string | null
          time_estimate_ms: number | null
          time_spent_ms: number | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignee_task_user_id?: string | null
          assignee_user_id?: string | null
          brand_id?: string | null
          category?: string | null
          comment_count?: number | null
          content?: Json | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          external_archived?: boolean | null
          external_assignees?: Json | null
          external_comments?: Json | null
          external_custom_fields?: Json | null
          external_date_closed?: string | null
          external_date_created?: string | null
          external_date_done?: string | null
          external_date_updated?: string | null
          external_folder?: string | null
          external_id?: string | null
          external_list?: string | null
          external_parent_id?: string | null
          external_priority?: string | null
          external_raw?: Json | null
          external_source?: string | null
          external_space?: string | null
          external_status?: string | null
          external_status_color?: string | null
          external_status_type?: string | null
          external_synced_at?: string | null
          external_tags?: string[] | null
          external_url?: string | null
          external_watchers?: Json | null
          global_prompt?: string | null
          id?: string
          is_active?: boolean | null
          position?: number | null
          priority?: string | null
          project_knowledge?: Json | null
          service?: string | null
          start_date?: string | null
          status?: string | null
          time_estimate_ms?: number | null
          time_spent_ms?: number | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignee_task_user_id?: string | null
          assignee_user_id?: string | null
          brand_id?: string | null
          category?: string | null
          comment_count?: number | null
          content?: Json | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          external_archived?: boolean | null
          external_assignees?: Json | null
          external_comments?: Json | null
          external_custom_fields?: Json | null
          external_date_closed?: string | null
          external_date_created?: string | null
          external_date_done?: string | null
          external_date_updated?: string | null
          external_folder?: string | null
          external_id?: string | null
          external_list?: string | null
          external_parent_id?: string | null
          external_priority?: string | null
          external_raw?: Json | null
          external_source?: string | null
          external_space?: string | null
          external_status?: string | null
          external_status_color?: string | null
          external_status_type?: string | null
          external_synced_at?: string | null
          external_tags?: string[] | null
          external_url?: string | null
          external_watchers?: Json | null
          global_prompt?: string | null
          id?: string
          is_active?: boolean | null
          position?: number | null
          priority?: string | null
          project_knowledge?: Json | null
          service?: string | null
          start_date?: string | null
          status?: string | null
          time_estimate_ms?: number | null
          time_spent_ms?: number | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_rules: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_public: boolean
          metadata: Json | null
          scope: string
          slug: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          metadata?: Json | null
          scope: string
          slug: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          metadata?: Json | null
          scope?: string
          slug?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      query_performance_logs: {
        Row: {
          created_at: string | null
          execution_time_ms: number
          function_name: string
          id: string
          parameters: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          execution_time_ms: number
          function_name: string
          id?: string
          parameters?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          execution_time_ms?: number
          function_name?: string
          id?: string
          parameters?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      refunds: {
        Row: {
          ai_confidence: number
          calculated_refund: number
          created_at: string
          customer: string
          date: string
          deleted_at: string | null
          id: string
          order_date: string
          order_id: string
          original_amount: number
          pdf_url: string | null
          qty: number
          reason_of_return: string
          return_fee: number
          sheet_page_key: string | null
          sheet_product_names: Json | null
          shop_domain: string | null
          shopify_credential_id: string | null
          shopify_fetch_error: string | null
          shopify_fetch_status: string | null
          shopify_numeric_order_id: string | null
          shopify_products: Json | null
          shopify_refund_attempted_at: string | null
          shopify_refund_error: string | null
          shopify_refund_id: string | null
          skus: Json
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_confidence?: number
          calculated_refund?: number
          created_at?: string
          customer?: string
          date?: string
          deleted_at?: string | null
          id: string
          order_date: string
          order_id: string
          original_amount?: number
          pdf_url?: string | null
          qty?: number
          reason_of_return?: string
          return_fee?: number
          sheet_page_key?: string | null
          sheet_product_names?: Json | null
          shop_domain?: string | null
          shopify_credential_id?: string | null
          shopify_fetch_error?: string | null
          shopify_fetch_status?: string | null
          shopify_numeric_order_id?: string | null
          shopify_products?: Json | null
          shopify_refund_attempted_at?: string | null
          shopify_refund_error?: string | null
          shopify_refund_id?: string | null
          skus?: Json
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_confidence?: number
          calculated_refund?: number
          created_at?: string
          customer?: string
          date?: string
          deleted_at?: string | null
          id?: string
          order_date?: string
          order_id?: string
          original_amount?: number
          pdf_url?: string | null
          qty?: number
          reason_of_return?: string
          return_fee?: number
          sheet_page_key?: string | null
          sheet_product_names?: Json | null
          shop_domain?: string | null
          shopify_credential_id?: string | null
          shopify_fetch_error?: string | null
          shopify_fetch_status?: string | null
          shopify_numeric_order_id?: string | null
          shopify_products?: Json | null
          shopify_refund_attempted_at?: string | null
          shopify_refund_error?: string | null
          shopify_refund_id?: string | null
          skus?: Json
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_shopify_credential_id_fkey"
            columns: ["shopify_credential_id"]
            isOneToOne: false
            referencedRelation: "shopify_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      report_shares: {
        Row: {
          access_count: number | null
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          permissions: Json | null
          report_id: string
          share_slug: string
          updated_at: string | null
        }
        Insert: {
          access_count?: number | null
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          report_id: string
          share_slug: string
          updated_at?: string | null
        }
        Update: {
          access_count?: number | null
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          report_id?: string
          share_slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_shares_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "data_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_shares_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_views: {
        Row: {
          created_at: string | null
          id: string
          is_authenticated: boolean | null
          is_default: boolean | null
          name: string | null
          referrer: string | null
          report_id: string
          session_id: string | null
          user_id: string | null
          viewed_at: string | null
          viewer_ip: string | null
          viewer_user_agent: string | null
          visible_dimensions: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_authenticated?: boolean | null
          is_default?: boolean | null
          name?: string | null
          referrer?: string | null
          report_id: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string | null
          viewer_ip?: string | null
          viewer_user_agent?: string | null
          visible_dimensions?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_authenticated?: boolean | null
          is_default?: boolean | null
          name?: string | null
          referrer?: string | null
          report_id?: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string | null
          viewer_ip?: string | null
          viewer_user_agent?: string | null
          visible_dimensions?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "report_views_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "data_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_views_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_kpis: {
        Row: {
          bookings: number | null
          clicks: number | null
          cost: number | null
          created_at: string | null
          date: string
          id: string
          metadata: Json | null
          report_name: string
          revenue: number | null
          updated_at: string | null
        }
        Insert: {
          bookings?: number | null
          clicks?: number | null
          cost?: number | null
          created_at?: string | null
          date: string
          id?: string
          metadata?: Json | null
          report_name: string
          revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          bookings?: number | null
          clicks?: number | null
          cost?: number | null
          created_at?: string | null
          date?: string
          id?: string
          metadata?: Json | null
          report_name?: string
          revenue?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      resource_usage: {
        Row: {
          application_id: string | null
          bandwidth_mb: number | null
          cpu_usage: number | null
          created_at: string | null
          disk_usage_gb: number | null
          id: string
          ram_usage_mb: number | null
          requests_count: number | null
          response_time_ms: number | null
          server_id: string | null
          timestamp: string | null
        }
        Insert: {
          application_id?: string | null
          bandwidth_mb?: number | null
          cpu_usage?: number | null
          created_at?: string | null
          disk_usage_gb?: number | null
          id?: string
          ram_usage_mb?: number | null
          requests_count?: number | null
          response_time_ms?: number | null
          server_id?: string | null
          timestamp?: string | null
        }
        Update: {
          application_id?: string | null
          bandwidth_mb?: number | null
          cpu_usage?: number | null
          created_at?: string | null
          disk_usage_gb?: number | null
          id?: string
          ram_usage_mb?: number | null
          requests_count?: number | null
          response_time_ms?: number | null
          server_id?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      saved_content_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_contents: {
        Row: {
          brand_id: string | null
          category: string | null
          chat_history: Json | null
          content: string
          created_at: string
          id: string
          model: string | null
          original_prompt: string | null
          provider: string | null
          share_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          category?: string | null
          chat_history?: Json | null
          content: string
          created_at?: string
          id?: string
          model?: string | null
          original_prompt?: string | null
          provider?: string | null
          share_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          category?: string | null
          chat_history?: Json | null
          content?: string
          created_at?: string
          id?: string
          model?: string | null
          original_prompt?: string | null
          provider?: string | null
          share_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_contents_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_sem_campaigns: {
        Row: {
          bidding_strategy: string
          brand_id: string | null
          budget: number
          campaign_content: string
          chat_messages: Json | null
          created_at: string
          id: string
          landing_page_url: string
          language: string
          location: string
          name: string
          status: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          bidding_strategy?: string
          brand_id?: string | null
          budget?: number
          campaign_content: string
          chat_messages?: Json | null
          created_at?: string
          id?: string
          landing_page_url: string
          language?: string
          location: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          bidding_strategy?: string
          brand_id?: string | null
          budget?: number
          campaign_content?: string
          chat_messages?: Json | null
          created_at?: string
          id?: string
          landing_page_url?: string
          language?: string
          location?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_sem_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_sem_campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_configs: {
        Row: {
          brand_id: string
          created_at: string
          enabled: boolean
          frequency: string
          id: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
          params: Json | null
          prompt: string
          steps: Json
          template_id: string
          updated_at: string
          user_id: string
          variables: Json
        }
        Insert: {
          brand_id: string
          created_at?: string
          enabled?: boolean
          frequency?: string
          id?: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          params?: Json | null
          prompt: string
          steps?: Json
          template_id: string
          updated_at?: string
          user_id: string
          variables?: Json
        }
        Update: {
          brand_id?: string
          created_at?: string
          enabled?: boolean
          frequency?: string
          id?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          params?: Json | null
          prompt?: string
          steps?: Json
          template_id?: string
          updated_at?: string
          user_id?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "schedule_configs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_runs: {
        Row: {
          brand_id: string
          completed_at: string | null
          error_message: string | null
          id: string
          results: Json | null
          schedule_id: string
          started_at: string
          status: string
          step_status: Json | null
          user_id: string
        }
        Insert: {
          brand_id: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          results?: Json | null
          schedule_id: string
          started_at?: string
          status?: string
          step_status?: Json | null
          user_id: string
        }
        Update: {
          brand_id?: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          results?: Json | null
          schedule_id?: string
          started_at?: string
          status?: string
          step_status?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_runs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_runs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedule_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      scrapping_google_map_results: {
        Row: {
          activity: string
          address: string | null
          brand_id: string
          business_name: string
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          phone: string | null
          rating: number | null
          raw: Json | null
          run_id: string
          user_id: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          activity: string
          address?: string | null
          brand_id: string
          business_name: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          rating?: number | null
          raw?: Json | null
          run_id?: string
          user_id: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          activity?: string
          address?: string | null
          brand_id?: string
          business_name?: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          rating?: number | null
          raw?: Json | null
          run_id?: string
          user_id?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrapping_google_map_results_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      scrapping_run_metadata: {
        Row: {
          activity: string
          brand_id: string | null
          city: string
          completed_at: string | null
          conversation_id: string | null
          country: string
          created_at: string
          error_message: string | null
          id: string
          lobstr_run_hash: string
          results_count: number | null
          results_nb: number
          run_id: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          activity: string
          brand_id?: string | null
          city: string
          completed_at?: string | null
          conversation_id?: string | null
          country: string
          created_at?: string
          error_message?: string | null
          id?: string
          lobstr_run_hash: string
          results_count?: number | null
          results_nb?: number
          run_id: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          activity?: string
          brand_id?: string | null
          city?: string
          completed_at?: string | null
          conversation_id?: string | null
          country?: string
          created_at?: string
          error_message?: string | null
          id?: string
          lobstr_run_hash?: string
          results_count?: number | null
          results_nb?: number
          run_id?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrapping_run_metadata_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrapping_run_metadata_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      selected_topics_shares: {
        Row: {
          brand_id: string
          brand_name: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          share_slug: string
          topics: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          brand_name: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          share_slug: string
          topics?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          brand_name?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          share_slug?: string
          topics?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selected_topics_shares_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_ad_copies: {
        Row: {
          ad_group_id: string
          created_at: string
          descriptions: Json
          headlines: Json
          id: string
          updated_at: string
        }
        Insert: {
          ad_group_id: string
          created_at?: string
          descriptions?: Json
          headlines?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          ad_group_id?: string
          created_at?: string
          descriptions?: Json
          headlines?: Json
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sem_ad_copies_ad_group_id_fkey"
            columns: ["ad_group_id"]
            isOneToOne: false
            referencedRelation: "sem_ad_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_ad_group_templates: {
        Row: {
          ad_copy: Json | null
          bid_amount: number | null
          campaign_id: string | null
          created_at: string | null
          daily_budget: number | null
          id: string
          landing_page_url: string | null
          match_types: Json | null
          name: string
          status: string | null
          target_keywords: string[] | null
          updated_at: string | null
        }
        Insert: {
          ad_copy?: Json | null
          bid_amount?: number | null
          campaign_id?: string | null
          created_at?: string | null
          daily_budget?: number | null
          id?: string
          landing_page_url?: string | null
          match_types?: Json | null
          name: string
          status?: string | null
          target_keywords?: string[] | null
          updated_at?: string | null
        }
        Update: {
          ad_copy?: Json | null
          bid_amount?: number | null
          campaign_id?: string | null
          created_at?: string | null
          daily_budget?: number | null
          id?: string
          landing_page_url?: string | null
          match_types?: Json | null
          name?: string
          status?: string | null
          target_keywords?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sem_ad_group_templates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sem_campaign_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_ad_groups: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          main_keyword: string
          name: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          main_keyword: string
          name: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          main_keyword?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sem_campaign_templates: {
        Row: {
          ad_copy_variations: Json | null
          audience_targeting: Json | null
          bidding_strategy: string | null
          brand_id: string | null
          budget: number | null
          business_description: string
          campaign_objective: string | null
          competitor_analysis: Json | null
          created_at: string | null
          current_step: string | null
          custom_prompts: Json | null
          error_message: string | null
          extracted_keywords: Json | null
          id: string
          keyword_groups: Json | null
          landing_page_url: string
          name: string
          progress: number | null
          status: string | null
          target_language: string | null
          target_location: string | null
          updated_at: string | null
          user_id: string
          workflow_config: Json | null
          workspace_id: string | null
        }
        Insert: {
          ad_copy_variations?: Json | null
          audience_targeting?: Json | null
          bidding_strategy?: string | null
          brand_id?: string | null
          budget?: number | null
          business_description: string
          campaign_objective?: string | null
          competitor_analysis?: Json | null
          created_at?: string | null
          current_step?: string | null
          custom_prompts?: Json | null
          error_message?: string | null
          extracted_keywords?: Json | null
          id?: string
          keyword_groups?: Json | null
          landing_page_url: string
          name: string
          progress?: number | null
          status?: string | null
          target_language?: string | null
          target_location?: string | null
          updated_at?: string | null
          user_id: string
          workflow_config?: Json | null
          workspace_id?: string | null
        }
        Update: {
          ad_copy_variations?: Json | null
          audience_targeting?: Json | null
          bidding_strategy?: string | null
          brand_id?: string | null
          budget?: number | null
          business_description?: string
          campaign_objective?: string | null
          competitor_analysis?: Json | null
          created_at?: string | null
          current_step?: string | null
          custom_prompts?: Json | null
          error_message?: string | null
          extracted_keywords?: Json | null
          id?: string
          keyword_groups?: Json | null
          landing_page_url?: string
          name?: string
          progress?: number | null
          status?: string | null
          target_language?: string | null
          target_location?: string | null
          updated_at?: string | null
          user_id?: string
          workflow_config?: Json | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sem_campaign_templates_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_campaign_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_keyword_templates: {
        Row: {
          ad_group_id: string | null
          campaign_id: string | null
          competition_level: string | null
          created_at: string | null
          id: string
          keyword: string
          match_type: string | null
          quality_score: number | null
          search_volume: number | null
          status: string | null
          suggested_bid: number | null
          updated_at: string | null
        }
        Insert: {
          ad_group_id?: string | null
          campaign_id?: string | null
          competition_level?: string | null
          created_at?: string | null
          id?: string
          keyword: string
          match_type?: string | null
          quality_score?: number | null
          search_volume?: number | null
          status?: string | null
          suggested_bid?: number | null
          updated_at?: string | null
        }
        Update: {
          ad_group_id?: string | null
          campaign_id?: string | null
          competition_level?: string | null
          created_at?: string | null
          id?: string
          keyword?: string
          match_type?: string | null
          quality_score?: number | null
          search_volume?: number | null
          status?: string | null
          suggested_bid?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sem_keyword_templates_ad_group_id_fkey"
            columns: ["ad_group_id"]
            isOneToOne: false
            referencedRelation: "sem_ad_group_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_keyword_templates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sem_campaign_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_keywords: {
        Row: {
          ad_group_id: string
          created_at: string
          id: string
          is_long_tail: boolean
          match_type: string
          text: string
        }
        Insert: {
          ad_group_id: string
          created_at?: string
          id?: string
          is_long_tail?: boolean
          match_type: string
          text: string
        }
        Update: {
          ad_group_id?: string
          created_at?: string
          id?: string
          is_long_tail?: boolean
          match_type?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "sem_keywords_ad_group_id_fkey"
            columns: ["ad_group_id"]
            isOneToOne: false
            referencedRelation: "sem_ad_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_landing_page_analysis: {
        Row: {
          campaign_id: string
          content: string
          created_at: string
          description: string
          id: string
          keywords: Json
          title: string
        }
        Insert: {
          campaign_id: string
          content: string
          created_at?: string
          description: string
          id?: string
          keywords?: Json
          title: string
        }
        Update: {
          campaign_id?: string
          content?: string
          created_at?: string
          description?: string
          id?: string
          keywords?: Json
          title?: string
        }
        Relationships: []
      }
      seo_articles: {
        Row: {
          brand_id: string | null
          content: string
          content_plan_id: string | null
          created_at: string
          featured_image: string | null
          id: string
          keywords: string[] | null
          meta_description: string | null
          outline: Json | null
          title: string
          updated_at: string
          user_id: string
          website_references: Json | null
          word_count: number
        }
        Insert: {
          brand_id?: string | null
          content: string
          content_plan_id?: string | null
          created_at?: string
          featured_image?: string | null
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          outline?: Json | null
          title: string
          updated_at?: string
          user_id: string
          website_references?: Json | null
          word_count?: number
        }
        Update: {
          brand_id?: string | null
          content?: string
          content_plan_id?: string | null
          created_at?: string
          featured_image?: string | null
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          outline?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
          website_references?: Json | null
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "seo_articles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_articles_content_plan_id_fkey"
            columns: ["content_plan_id"]
            isOneToOne: false
            referencedRelation: "seo_content_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_backlink_snapshots: {
        Row: {
          backlinks_count: number
          brand_id: string
          created_at: string
          domain_rank: number | null
          id: string
          organic_count: number | null
          organic_etv: number | null
          raw: Json | null
          referring_domains: number | null
          snapshot_at: string
          source: string | null
        }
        Insert: {
          backlinks_count?: number
          brand_id: string
          created_at?: string
          domain_rank?: number | null
          id?: string
          organic_count?: number | null
          organic_etv?: number | null
          raw?: Json | null
          referring_domains?: number | null
          snapshot_at?: string
          source?: string | null
        }
        Update: {
          backlinks_count?: number
          brand_id?: string
          created_at?: string
          domain_rank?: number | null
          id?: string
          organic_count?: number | null
          organic_etv?: number | null
          raw?: Json | null
          referring_domains?: number | null
          snapshot_at?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_backlink_snapshots_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_content_plans: {
        Row: {
          brand_id: string | null
          created_at: string
          id: string
          publish_date: string | null
          status: string
          target_keywords: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          id?: string
          publish_date?: string | null
          status?: string
          target_keywords?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          id?: string
          publish_date?: string | null
          status?: string
          target_keywords?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_content_plans_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_gsc_daily: {
        Row: {
          brand_id: string
          clicks: number
          created_at: string
          ctr: number | null
          date: string
          id: string
          impressions: number
          position: number | null
          site_url: string | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          clicks?: number
          created_at?: string
          ctr?: number | null
          date: string
          id?: string
          impressions?: number
          position?: number | null
          site_url?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          clicks?: number
          created_at?: string
          ctr?: number | null
          date?: string
          id?: string
          impressions?: number
          position?: number | null
          site_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_gsc_daily_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_keyword_rank_snapshots: {
        Row: {
          brand_id: string
          checked_at: string
          country: string | null
          created_at: string
          id: string
          keyword: string
          position: number | null
          position_prev: number | null
          ranking_url: string | null
          seo_keyword_research_id: string | null
        }
        Insert: {
          brand_id: string
          checked_at?: string
          country?: string | null
          created_at?: string
          id?: string
          keyword: string
          position?: number | null
          position_prev?: number | null
          ranking_url?: string | null
          seo_keyword_research_id?: string | null
        }
        Update: {
          brand_id?: string
          checked_at?: string
          country?: string | null
          created_at?: string
          id?: string
          keyword?: string
          position?: number | null
          position_prev?: number | null
          ranking_url?: string | null
          seo_keyword_research_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_keyword_rank_snapshots_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_keyword_rank_snapshots_seo_keyword_research_id_fkey"
            columns: ["seo_keyword_research_id"]
            isOneToOne: false
            referencedRelation: "seo_keyword_research"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_keyword_research: {
        Row: {
          brand_id: string | null
          competitors: Json | null
          country: string | null
          cpc: number | null
          created_at: string
          difficulty: number | null
          id: string
          is_tracked: boolean | null
          keyword: string
          search_intent: string[] | null
          search_volume: number | null
          secondary_keywords: string[] | null
          source: string | null
          trend: string | null
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          competitors?: Json | null
          country?: string | null
          cpc?: number | null
          created_at?: string
          difficulty?: number | null
          id?: string
          is_tracked?: boolean | null
          keyword: string
          search_intent?: string[] | null
          search_volume?: number | null
          secondary_keywords?: string[] | null
          source?: string | null
          trend?: string | null
          user_id: string
        }
        Update: {
          brand_id?: string | null
          competitors?: Json | null
          country?: string | null
          cpc?: number | null
          created_at?: string
          difficulty?: number | null
          id?: string
          is_tracked?: boolean | null
          keyword?: string
          search_intent?: string[] | null
          search_volume?: number | null
          secondary_keywords?: string[] | null
          source?: string | null
          trend?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_keyword_research_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_keywords: {
        Row: {
          brand_id: string | null
          campaign_id: string | null
          created_at: string
          difficulty: number | null
          id: string
          keyword: string
          search_volume: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          campaign_id?: string | null
          created_at?: string
          difficulty?: number | null
          id?: string
          keyword: string
          search_volume?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          campaign_id?: string | null
          created_at?: string
          difficulty?: number | null
          id?: string
          keyword?: string
          search_volume?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_keywords_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_topic_ideas: {
        Row: {
          backlinks_suggestions: string[] | null
          brand_id: string | null
          campaign_id: string | null
          created_at: string
          estimated_word_count: number
          id: string
          keywords: string[]
          search_intents: string[]
          search_volume: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          backlinks_suggestions?: string[] | null
          brand_id?: string | null
          campaign_id?: string | null
          created_at?: string
          estimated_word_count?: number
          id?: string
          keywords?: string[]
          search_intents?: string[]
          search_volume?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          backlinks_suggestions?: string[] | null
          brand_id?: string | null
          campaign_id?: string | null
          created_at?: string
          estimated_word_count?: number
          id?: string
          keywords?: string[]
          search_intents?: string[]
          search_volume?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_topic_ideas_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          is_global: boolean | null
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          is_global?: boolean | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          is_global?: boolean | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          access_count: number | null
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          permissions: Json | null
          resource_id: string
          resource_type: string
          share_token: string
          updated_at: string | null
        }
        Insert: {
          access_count?: number | null
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          permissions?: Json | null
          resource_id: string
          resource_type: string
          share_token: string
          updated_at?: string | null
        }
        Update: {
          access_count?: number | null
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          permissions?: Json | null
          resource_id?: string
          resource_type?: string
          share_token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shared_access: {
        Row: {
          brand_id: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          permissions: Json | null
          share_type: string | null
          slug: string
          views_count: number | null
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          share_type?: string | null
          slug: string
          views_count?: number | null
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          share_type?: string | null
          slug?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_access_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_articles: {
        Row: {
          articles: Json
          attached_files: Json | null
          created_at: string
          id: string
          share_id: string | null
        }
        Insert: {
          articles?: Json
          attached_files?: Json | null
          created_at?: string
          id?: string
          share_id?: string | null
        }
        Update: {
          articles?: Json
          attached_files?: Json | null
          created_at?: string
          id?: string
          share_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_articles_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shared_access"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_contents: {
        Row: {
          contents: Json
          created_at: string
          id: string
          share_id: string
          updated_at: string
        }
        Insert: {
          contents: Json
          created_at?: string
          id?: string
          share_id: string
          updated_at?: string
        }
        Update: {
          contents?: Json
          created_at?: string
          id?: string
          share_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_shared_contents_share_id"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shared_access"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_deliverable_comments: {
        Row: {
          author_email: string | null
          author_name: string
          checklist_item_id: string
          content: string
          created_at: string
          id: string
          is_guest: boolean
          reply_to_comment_id: string | null
          shared_deliverable_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          author_email?: string | null
          author_name: string
          checklist_item_id: string
          content: string
          created_at?: string
          id?: string
          is_guest?: boolean
          reply_to_comment_id?: string | null
          shared_deliverable_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          author_email?: string | null
          author_name?: string
          checklist_item_id?: string
          content?: string
          created_at?: string
          id?: string
          is_guest?: boolean
          reply_to_comment_id?: string | null
          shared_deliverable_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_deliverable_comments_reply_to_comment_id_fkey"
            columns: ["reply_to_comment_id"]
            isOneToOne: false
            referencedRelation: "shared_deliverable_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_deliverable_comments_shared_deliverable_id_fkey"
            columns: ["shared_deliverable_id"]
            isOneToOne: false
            referencedRelation: "shared_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_deliverables: {
        Row: {
          access_count: number | null
          access_level: Database["public"]["Enums"]["access_level"]
          brand_name: string | null
          checklist_id: string
          created_at: string
          created_by: string | null
          deliverables: Json
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          share_token: string | null
          step_title: string
          task_id: string | null
          task_title: string
          updated_at: string
        }
        Insert: {
          access_count?: number | null
          access_level?: Database["public"]["Enums"]["access_level"]
          brand_name?: string | null
          checklist_id: string
          created_at?: string
          created_by?: string | null
          deliverables?: Json
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          share_token?: string | null
          step_title: string
          task_id?: string | null
          task_title: string
          updated_at?: string
        }
        Update: {
          access_count?: number | null
          access_level?: Database["public"]["Enums"]["access_level"]
          brand_name?: string | null
          checklist_id?: string
          created_at?: string
          created_by?: string | null
          deliverables?: Json
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          share_token?: string | null
          step_title?: string
          task_id?: string | null
          task_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_keywords: {
        Row: {
          created_at: string
          id: string
          keywords: Json
          share_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          keywords?: Json
          share_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          keywords?: Json
          share_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_keywords_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shared_access"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_saved_content: {
        Row: {
          content: string
          content_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          share_token: string
          title: string | null
          view_count: number | null
        }
        Insert: {
          content: string
          content_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          share_token?: string
          title?: string | null
          view_count?: number | null
        }
        Update: {
          content?: string
          content_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          share_token?: string
          title?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      shared_slideshows: {
        Row: {
          created_at: string
          deck_id: string | null
          id: string
          output_type: string
          slides: Json
          slug: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deck_id?: string | null
          id?: string
          output_type?: string
          slides?: Json
          slug: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deck_id?: string | null
          id?: string
          output_type?: string
          slides?: Json
          slug?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_slideshows_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "generated_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_steps: {
        Row: {
          created_at: string
          id: string
          share_id: string
          step_content: string
          step_metadata: Json | null
          step_title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          share_id: string
          step_content: string
          step_metadata?: Json | null
          step_title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          share_id?: string
          step_content?: string
          step_metadata?: Json | null
          step_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_steps_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shared_access"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_data: {
        Row: {
          created_at: string | null
          data_source_id: string | null
          id: string
          imported_at: string | null
          report_id: string
          row_data: Json
          row_index: number | null
          sheet_gid: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_source_id?: string | null
          id?: string
          imported_at?: string | null
          report_id: string
          row_data?: Json
          row_index?: number | null
          sheet_gid?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_source_id?: string | null
          id?: string
          imported_at?: string | null
          report_id?: string
          row_data?: Json
          row_index?: number | null
          sheet_gid?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sheet_data_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_data_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "kpi_report_view"
            referencedColumns: ["data_source_id"]
          },
          {
            foreignKeyName: "sheet_data_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "report_data_sources"
            referencedColumns: ["data_source_id"]
          },
          {
            foreignKeyName: "sheet_data_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "data_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_data_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_credentials: {
        Row: {
          access_token: string
          brand_id: string | null
          id: string
          shop_domain: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          brand_id?: string | null
          id?: string
          shop_domain: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          brand_id?: string | null
          id?: string
          shop_domain?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_credentials_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_import_images: {
        Row: {
          attempts: number
          brand_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          import_id: string
          position: number
          reference_parent: string | null
          shopify_media_id: string | null
          shopify_product_id: string | null
          shopify_product_name: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          brand_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          import_id: string
          position?: number
          reference_parent?: string | null
          shopify_media_id?: string | null
          shopify_product_id?: string | null
          shopify_product_name?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          brand_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          import_id?: string
          position?: number
          reference_parent?: string | null
          shopify_media_id?: string | null
          shopify_product_id?: string | null
          shopify_product_name?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_import_images_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_import_images_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports_with_list_preview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_import_images_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "shopify_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_import_images_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "shopify_imports_with_preview"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_imports: {
        Row: {
          batch_name: string
          brand_id: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          source_import_id: string | null
          source_project: string | null
          status: string
          updated_at: string
          upload_mode: string
          webhook_url: string | null
        }
        Insert: {
          batch_name: string
          brand_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          source_import_id?: string | null
          source_project?: string | null
          status?: string
          updated_at?: string
          upload_mode?: string
          webhook_url?: string | null
        }
        Update: {
          batch_name?: string
          brand_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          source_import_id?: string | null
          source_project?: string | null
          status?: string
          updated_at?: string
          upload_mode?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_imports_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_integrations: {
        Row: {
          api_secret_key: string
          brand_id: string
          created_at: string
          id: string
          is_connected: boolean
          last_sync_at: string | null
          store_url: string
          updated_at: string
        }
        Insert: {
          api_secret_key: string
          brand_id: string
          created_at?: string
          id?: string
          is_connected?: boolean
          last_sync_at?: string | null
          store_url: string
          updated_at?: string
        }
        Update: {
          api_secret_key?: string
          brand_id?: string
          created_at?: string
          id?: string
          is_connected?: boolean
          last_sync_at?: string | null
          store_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_integrations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_metadata: {
        Row: {
          brand_id: string
          created_at: string
          handle: string | null
          id: string
          metadata_type: string
          name: string
          shopify_id: number
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          handle?: string | null
          id?: string
          metadata_type: string
          name: string
          shopify_id: number
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          handle?: string | null
          id?: string
          metadata_type?: string
          name?: string
          shopify_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_metadata_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_reference_product_cache: {
        Row: {
          brand_id: string
          product_id: string
          product_title: string | null
          reference_parent: string
          verified_at: string
        }
        Insert: {
          brand_id: string
          product_id: string
          product_title?: string | null
          reference_parent: string
          verified_at?: string
        }
        Update: {
          brand_id?: string
          product_id?: string
          product_title?: string | null
          reference_parent?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_reference_product_cache_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_marketplace: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          installed_on: string
          is_active: boolean
          name: string
          pack: string | null
          risk: string
          slug: string
          source: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          installed_on?: string
          is_active?: boolean
          name: string
          pack?: string | null
          risk?: string
          slug: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          installed_on?: string
          is_active?: boolean
          name?: string
          pack?: string | null
          risk?: string
          slug?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sop_templates: {
        Row: {
          brand_id: string | null
          category: string
          created_at: string
          id: string
          steps: Json
          task_count: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          category?: string
          created_at?: string
          id?: string
          steps?: Json
          task_count?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          category?: string
          created_at?: string
          id?: string
          steps?: Json
          task_count?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_templates_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      sparti_integrations: {
        Row: {
          access_key: string
          brand_id: string
          created_at: string | null
          id: string
          is_connected: boolean | null
          last_sync_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_key: string
          brand_id: string
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_key?: string
          brand_id?: string
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sparti_integrations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_tasks: {
        Row: {
          added_at: string
          id: string
          sprint_id: string
          task_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          sprint_id: string
          task_id: string
        }
        Update: {
          added_at?: string
          id?: string
          sprint_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_trial: boolean | null
          stripe_customer_id: string | null
          subscribed: boolean | null
          subscription_end: string | null
          subscription_tier: string | null
          trial_end: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_trial?: boolean | null
          stripe_customer_id?: string | null
          subscribed?: boolean | null
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_trial?: boolean | null
          stripe_customer_id?: string | null
          subscribed?: boolean | null
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          stripe_event_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          stripe_event_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          stripe_event_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subtask_chat_messages: {
        Row: {
          content: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_read: boolean | null
          read_by: Json | null
          reply_to_message_id: string | null
          sender_email: string | null
          sender_id: string
          subtask_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          read_by?: Json | null
          reply_to_message_id?: string | null
          sender_email?: string | null
          sender_id: string
          subtask_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          read_by?: Json | null
          reply_to_message_id?: string | null
          sender_email?: string | null
          sender_id?: string
          subtask_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtask_chat_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "subtask_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      subtask_custom_statuses: {
        Row: {
          color: string
          created_at: string
          created_by: string
          description: string | null
          gradient: string
          id: string
          is_active: boolean
          name: string
          order_index: number
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          created_by: string
          description?: string | null
          gradient?: string
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          description?: string | null
          gradient?: string
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subtask_custom_statuses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subtask_time_logs: {
        Row: {
          action_type: string
          created_at: string
          id: string
          notes: string | null
          session_id: string
          subtask_id: string
          timestamp: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          notes?: string | null
          session_id?: string
          subtask_id: string
          timestamp?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          session_id?: string
          subtask_id?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtask_time_logs_subtask_id_fkey"
            columns: ["subtask_id"]
            isOneToOne: false
            referencedRelation: "subtasks"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          is_pinned: boolean | null
          link: string | null
          parent_task_id: string
          pinned_at: string | null
          priority: string
          status: string
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_pinned?: boolean | null
          link?: string | null
          parent_task_id: string
          pinned_at?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_pinned?: boolean | null
          link?: string | null
          parent_task_id?: string
          pinned_at?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      talentfb_leads: {
        Row: {
          brand_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          source_path: string | null
          utm: Json | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone: string
          source_path?: string | null
          utm?: Json | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          source_path?: string | null
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "talentfb_leads_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      talentfb_orders: {
        Row: {
          amount_cents: number
          brand_id: string | null
          country: string | null
          created_at: string
          currency: string
          email: string
          full_name: string
          id: string
          paid_at: string | null
          payment_provider: string | null
          payment_ref: string | null
          phone: string | null
          product_handle: string
          product_title: string
          status: string
        }
        Insert: {
          amount_cents: number
          brand_id?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          email: string
          full_name: string
          id?: string
          paid_at?: string | null
          payment_provider?: string | null
          payment_ref?: string | null
          phone?: string | null
          product_handle: string
          product_title: string
          status?: string
        }
        Update: {
          amount_cents?: number
          brand_id?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          email?: string
          full_name?: string
          id?: string
          paid_at?: string | null
          payment_provider?: string | null
          payment_ref?: string | null
          phone?: string | null
          product_handle?: string
          product_title?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "talentfb_orders_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      task_chat_messages: {
        Row: {
          content: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          images: Json | null
          is_read: boolean | null
          read_by: Json | null
          reply_to_message_id: string | null
          sender_email: string
          sender_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          images?: Json | null
          is_read?: boolean | null
          read_by?: Json | null
          reply_to_message_id?: string | null
          sender_email: string
          sender_id: string
          task_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          images?: Json | null
          is_read?: boolean | null
          read_by?: Json | null
          reply_to_message_id?: string | null
          sender_email?: string
          sender_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_chat_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "task_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_chat_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_logs: {
        Row: {
          action_type: string
          created_at: string
          duration_minutes: number | null
          id: string
          logged_at: string | null
          session_id: string
          step_id: string | null
          task_id: string
          timestamp: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          logged_at?: string | null
          session_id?: string
          step_id?: string | null
          task_id: string
          timestamp?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          logged_at?: string | null
          session_id?: string
          step_id?: string | null
          task_id?: string
          timestamp?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_task_logs_task_id"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_task_logs_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_owners: {
        Row: {
          created_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_task_owners_task_id"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_sprints: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          sprint_id: string
          task_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          sprint_id: string
          task_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          sprint_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_sprints_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_sprints_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_statuses: {
        Row: {
          color: string
          created_at: string
          description: string | null
          gradient: string | null
          id: string
          is_active: boolean | null
          name: string
          order: number
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          gradient?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order?: number
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          gradient?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order?: number
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      task_step_chat_messages: {
        Row: {
          checklist_id: string | null
          content: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          files: Json | null
          id: string
          images: Json | null
          is_read: boolean | null
          read_by: Json | null
          reply_to_message_id: string | null
          sender_email: string
          sender_id: string
          step_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          checklist_id?: string | null
          content: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          files?: Json | null
          id?: string
          images?: Json | null
          is_read?: boolean | null
          read_by?: Json | null
          reply_to_message_id?: string | null
          sender_email: string
          sender_id: string
          step_id: string
          task_id: string
          updated_at?: string
        }
        Update: {
          checklist_id?: string | null
          content?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          files?: Json | null
          id?: string
          images?: Json | null
          is_read?: boolean | null
          read_by?: Json | null
          reply_to_message_id?: string | null
          sender_email?: string
          sender_id?: string
          step_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_step_chat_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "task_step_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_step_chat_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subtask_chat_messages: {
        Row: {
          content: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          files: Json | null
          id: string
          images: Json | null
          is_read: boolean | null
          read_by: Json | null
          reply_to_message_id: string | null
          sender_email: string | null
          sender_id: string
          task_subtask_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          files?: Json | null
          id?: string
          images?: Json | null
          is_read?: boolean | null
          read_by?: Json | null
          reply_to_message_id?: string | null
          sender_email?: string | null
          sender_id: string
          task_subtask_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          files?: Json | null
          id?: string
          images?: Json | null
          is_read?: boolean | null
          read_by?: Json | null
          reply_to_message_id?: string | null
          sender_email?: string | null
          sender_id?: string
          task_subtask_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_subtask_chat_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "task_subtask_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_subtask_chat_messages_task_subtask_id_fkey"
            columns: ["task_subtask_id"]
            isOneToOne: false
            referencedRelation: "task_subtasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subtask_checklist_item_chat_messages: {
        Row: {
          content: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          files: Json | null
          id: string
          images: Json | null
          is_read: boolean | null
          read_by: Json | null
          reply_to_message_id: string | null
          sender_email: string | null
          sender_id: string
          task_subtask_checklist_item_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          files?: Json | null
          id?: string
          images?: Json | null
          is_read?: boolean | null
          read_by?: Json | null
          reply_to_message_id?: string | null
          sender_email?: string | null
          sender_id: string
          task_subtask_checklist_item_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          files?: Json | null
          id?: string
          images?: Json | null
          is_read?: boolean | null
          read_by?: Json | null
          reply_to_message_id?: string | null
          sender_email?: string | null
          sender_id?: string
          task_subtask_checklist_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_subtask_checklist_item_c_task_subtask_checklist_item__fkey"
            columns: ["task_subtask_checklist_item_id"]
            isOneToOne: false
            referencedRelation: "task_subtask_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_subtask_checklist_item_chat_messa_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "task_subtask_checklist_item_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subtask_checklist_item_owners: {
        Row: {
          checklist_item_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          checklist_item_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          checklist_item_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_subtask_checklist_item_owners_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "task_subtask_checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subtask_checklist_items: {
        Row: {
          checklist_id: string
          completed: boolean
          created_at: string
          created_by: string
          due_date: string | null
          estimated_hours: number | null
          id: string
          order_index: number
          owner: string | null
          start_date: string | null
          status: string
          text: string
          timeline_settings: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          checklist_id: string
          completed?: boolean
          created_at?: string
          created_by: string
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          order_index?: number
          owner?: string | null
          start_date?: string | null
          status?: string
          text: string
          timeline_settings?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          checklist_id?: string
          completed?: boolean
          created_at?: string
          created_by?: string
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          order_index?: number
          owner?: string | null
          start_date?: string | null
          status?: string
          text?: string
          timeline_settings?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_subtask_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "task_subtask_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subtask_checklists: {
        Row: {
          created_at: string
          created_by: string
          id: string
          order_index: number
          task_subtask_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          order_index?: number
          task_subtask_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          order_index?: number
          task_subtask_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_subtask_checklists_task_subtask_id_fkey"
            columns: ["task_subtask_id"]
            isOneToOne: false
            referencedRelation: "task_subtasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subtask_owners: {
        Row: {
          created_at: string | null
          id: string
          task_subtask_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          task_subtask_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          task_subtask_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_subtask_owners_task_subtask_id_fkey"
            columns: ["task_subtask_id"]
            isOneToOne: false
            referencedRelation: "task_subtasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subtasks: {
        Row: {
          completed: boolean
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          link: string | null
          order_index: number
          owner: string | null
          start_date: string | null
          status: string
          task_id: string
          timeline_settings: Json | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          link?: string | null
          order_index?: number
          owner?: string | null
          start_date?: string | null
          status?: string
          task_id: string
          timeline_settings?: Json | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          link?: string | null
          order_index?: number
          owner?: string | null
          start_date?: string | null
          status?: string
          task_id?: string
          timeline_settings?: Json | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          estimated_hours: number | null
          id: string
          is_active: boolean | null
          name: string
          priority: string | null
          steps: Json | null
          tags: string[] | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: string | null
          steps?: Json | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: string | null
          steps?: Json | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      task_views: {
        Row: {
          column_ids: string[]
          created_at: string
          group_primary: string | null
          group_secondary: string | null
          id: string
          is_default: boolean
          name: string
          position: number | null
          selected_brand_ids: string[] | null
          sort_key: string | null
          updated_at: string
          user_id: string
          view_type: string
        }
        Insert: {
          column_ids?: string[]
          created_at?: string
          group_primary?: string | null
          group_secondary?: string | null
          id?: string
          is_default?: boolean
          name: string
          position?: number | null
          selected_brand_ids?: string[] | null
          sort_key?: string | null
          updated_at?: string
          user_id: string
          view_type?: string
        }
        Update: {
          column_ids?: string[]
          created_at?: string
          group_primary?: string | null
          group_secondary?: string | null
          id?: string
          is_default?: boolean
          name?: string
          position?: number | null
          selected_brand_ids?: string[] | null
          sort_key?: string | null
          updated_at?: string
          user_id?: string
          view_type?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          archived: boolean | null
          brand_id: string | null
          categories: string[] | null
          category: string
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          link: string | null
          manual_days: number | null
          manual_hours: number | null
          manual_minutes: number | null
          owner: string | null
          position: number | null
          priority: string
          share_id: string | null
          start_date: string | null
          status: string
          status_id: string | null
          steps: Json | null
          title: string
          updated_at: string
          use_manual_time: boolean | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          archived?: boolean | null
          brand_id?: string | null
          categories?: string[] | null
          category?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          link?: string | null
          manual_days?: number | null
          manual_hours?: number | null
          manual_minutes?: number | null
          owner?: string | null
          position?: number | null
          priority?: string
          share_id?: string | null
          start_date?: string | null
          status?: string
          status_id?: string | null
          steps?: Json | null
          title: string
          updated_at?: string
          use_manual_time?: boolean | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          archived?: boolean | null
          brand_id?: string | null
          categories?: string[] | null
          category?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          link?: string | null
          manual_days?: number | null
          manual_hours?: number | null
          manual_minutes?: number | null
          owner?: string | null
          position?: number | null
          priority?: string
          share_id?: string | null
          start_date?: string | null
          status?: string
          status_id?: string | null
          steps?: Json | null
          title?: string
          updated_at?: string
          use_manual_time?: boolean | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "task_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tasks_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invitation_token: string
          invited_at: string
          name: string | null
          role: string | null
          status: string
          team_owner_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invitation_token?: string
          invited_at?: string
          name?: string | null
          role?: string | null
          status: string
          team_owner_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invitation_token?: string
          invited_at?: string
          name?: string | null
          role?: string | null
          status?: string
          team_owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          domain: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      template_blog_posts: {
        Row: {
          author: string | null
          brand_id: string | null
          campaign_id: string | null
          cms_published: boolean | null
          cms_url: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          featured_image: string | null
          featured_image_alt: string | null
          id: string
          keywords: string[] | null
          last_wordpress_sync_at: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          original_post_reference: string | null
          published_at: string | null
          published_date: string | null
          scheduled_date: string | null
          shopify_settings: Json | null
          slug: string | null
          status: string | null
          template_mode: boolean | null
          title: string
          topic_id: string | null
          updated_at: string | null
          user_id: string
          wordpress_post_id: number | null
          wordpress_settings: Json | null
          wordpress_sync_error: string | null
          wordpress_sync_status: string | null
        }
        Insert: {
          author?: string | null
          brand_id?: string | null
          campaign_id?: string | null
          cms_published?: boolean | null
          cms_url?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          featured_image_alt?: string | null
          id?: string
          keywords?: string[] | null
          last_wordpress_sync_at?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          original_post_reference?: string | null
          published_at?: string | null
          published_date?: string | null
          scheduled_date?: string | null
          shopify_settings?: Json | null
          slug?: string | null
          status?: string | null
          template_mode?: boolean | null
          title: string
          topic_id?: string | null
          updated_at?: string | null
          user_id: string
          wordpress_post_id?: number | null
          wordpress_settings?: Json | null
          wordpress_sync_error?: string | null
          wordpress_sync_status?: string | null
        }
        Update: {
          author?: string | null
          brand_id?: string | null
          campaign_id?: string | null
          cms_published?: boolean | null
          cms_url?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          featured_image_alt?: string | null
          id?: string
          keywords?: string[] | null
          last_wordpress_sync_at?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          original_post_reference?: string | null
          published_at?: string | null
          published_date?: string | null
          scheduled_date?: string | null
          shopify_settings?: Json | null
          slug?: string | null
          status?: string | null
          template_mode?: boolean | null
          title?: string
          topic_id?: string | null
          updated_at?: string | null
          user_id?: string
          wordpress_post_id?: number | null
          wordpress_settings?: Json | null
          wordpress_sync_error?: string | null
          wordpress_sync_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_blog_posts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_blog_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "template_seo_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_blog_posts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "template_seo_topic_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      template_seo_campaigns: {
        Row: {
          article_length: string | null
          article_type: string | null
          brand_id: string | null
          business_description: string
          created_at: string | null
          current_step: string | null
          error_message: string | null
          extracted_keywords: Json | null
          id: string
          keywords_cluster: string | null
          language: string | null
          lobstr_run_id: string | null
          name: string
          number_of_articles: number | null
          organic_keywords: Json | null
          original_campaign_reference: string | null
          progress: number | null
          quick_setup_data: Json | null
          scraped_articles: Json | null
          search_run_id: string | null
          status: string | null
          style_analysis: Json | null
          target_country: string | null
          template_mode: boolean | null
          template_notes: string | null
          updated_at: string | null
          user_id: string
          website_url: string
          workspace_id: string | null
          writing_style: string | null
        }
        Insert: {
          article_length?: string | null
          article_type?: string | null
          brand_id?: string | null
          business_description: string
          created_at?: string | null
          current_step?: string | null
          error_message?: string | null
          extracted_keywords?: Json | null
          id?: string
          keywords_cluster?: string | null
          language?: string | null
          lobstr_run_id?: string | null
          name: string
          number_of_articles?: number | null
          organic_keywords?: Json | null
          original_campaign_reference?: string | null
          progress?: number | null
          quick_setup_data?: Json | null
          scraped_articles?: Json | null
          search_run_id?: string | null
          status?: string | null
          style_analysis?: Json | null
          target_country?: string | null
          template_mode?: boolean | null
          template_notes?: string | null
          updated_at?: string | null
          user_id: string
          website_url: string
          workspace_id?: string | null
          writing_style?: string | null
        }
        Update: {
          article_length?: string | null
          article_type?: string | null
          brand_id?: string | null
          business_description?: string
          created_at?: string | null
          current_step?: string | null
          error_message?: string | null
          extracted_keywords?: Json | null
          id?: string
          keywords_cluster?: string | null
          language?: string | null
          lobstr_run_id?: string | null
          name?: string
          number_of_articles?: number | null
          organic_keywords?: Json | null
          original_campaign_reference?: string | null
          progress?: number | null
          quick_setup_data?: Json | null
          scraped_articles?: Json | null
          search_run_id?: string | null
          status?: string | null
          style_analysis?: Json | null
          target_country?: string | null
          template_mode?: boolean | null
          template_notes?: string | null
          updated_at?: string | null
          user_id?: string
          website_url?: string
          workspace_id?: string | null
          writing_style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_seo_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_seo_campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      template_seo_keywords: {
        Row: {
          brand_id: string | null
          campaign_id: string | null
          created_at: string | null
          difficulty: number | null
          id: string
          keyword: string
          search_volume: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          difficulty?: number | null
          id?: string
          keyword: string
          search_volume?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          difficulty?: number | null
          id?: string
          keyword?: string
          search_volume?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_seo_keywords_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_seo_keywords_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "template_seo_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      template_seo_topic_ideas: {
        Row: {
          brand_id: string | null
          campaign_id: string | null
          created_at: string | null
          estimated_word_count: number | null
          id: string
          keywords: string[] | null
          search_intents: string[] | null
          search_volume: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          estimated_word_count?: number | null
          id?: string
          keywords?: string[] | null
          search_intents?: string[] | null
          search_volume?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          estimated_word_count?: number | null
          id?: string
          keywords?: string[] | null
          search_intents?: string[] | null
          search_volume?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_seo_topic_ideas_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_seo_topic_ideas_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "template_seo_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      text_analysis_sessions: {
        Row: {
          ai_patterns_found: Json | null
          analyzed_text: string
          created_at: string
          detected_style: string
          human_score: number
          id: string
          recommendations: string[] | null
          session_metadata: Json | null
          user_id: string
        }
        Insert: {
          ai_patterns_found?: Json | null
          analyzed_text: string
          created_at?: string
          detected_style: string
          human_score: number
          id?: string
          recommendations?: string[] | null
          session_metadata?: Json | null
          user_id: string
        }
        Update: {
          ai_patterns_found?: Json | null
          analyzed_text?: string
          created_at?: string
          detected_style?: string
          human_score?: number
          id?: string
          recommendations?: string[] | null
          session_metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      theme_sections: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          schema: Json
          tags: string[]
          theme: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id: string
          name: string
          schema: Json
          tags?: string[]
          theme: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          schema?: Json
          tags?: string[]
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      themes: {
        Row: {
          brand_id: string | null
          created_at: string
          description: string | null
          id: string
          is_custom_site: boolean
          is_default: boolean
          is_ecommerce: boolean
          name: string
          preview_image_url: string | null
          slug: string
          tags: string[]
          type: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_custom_site?: boolean
          is_default?: boolean
          is_ecommerce?: boolean
          name: string
          preview_image_url?: string | null
          slug: string
          tags?: string[]
          type?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_custom_site?: boolean
          is_default?: boolean
          is_ecommerce?: boolean
          name?: string
          preview_image_url?: string | null
          slug?: string
          tags?: string[]
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "themes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      token_history: {
        Row: {
          created_at: string | null
          id: string
          month_year: string
          plan_id: string
          reason: string
          subscription_type:
            | Database["public"]["Enums"]["subscription_type"]
            | null
          tokens_added: number
          tokens_total: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          month_year: string
          plan_id: string
          reason?: string
          subscription_type?:
            | Database["public"]["Enums"]["subscription_type"]
            | null
          tokens_added: number
          tokens_total: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          month_year?: string
          plan_id?: string
          reason?: string
          subscription_type?:
            | Database["public"]["Enums"]["subscription_type"]
            | null
          tokens_added?: number
          tokens_total?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_categories: {
        Row: {
          brand_id: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_categories_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          brand_id: string | null
          category_id: string | null
          costs: number | null
          created_at: string
          id: string
          login: string | null
          name: string
          password: string | null
          start_date: string | null
          status: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          costs?: number | null
          created_at?: string
          id?: string
          login?: string | null
          name: string
          password?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          costs?: number | null
          created_at?: string
          id?: string
          login?: string | null
          name?: string
          password?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tools_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tool_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_chat_memory: {
        Row: {
          memory: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          memory?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          memory?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_filter_preferences: {
        Row: {
          created_at: string
          filter_type: string
          id: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filter_type?: string
          id?: string
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filter_type?: string
          id?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          api_token: string | null
          created_at: string
          external_account_id: string | null
          external_account_name: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          metadata: Json | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_token?: string | null
          created_at?: string
          external_account_id?: string | null
          external_account_name?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          metadata?: Json | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_token?: string | null
          created_at?: string
          external_account_id?: string | null
          external_account_name?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          metadata?: Json | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          hidden_category_ids: string[] | null
          hidden_status_ids: string[] | null
          id: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hidden_category_ids?: string[] | null
          hidden_status_ids?: string[] | null
          id?: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hidden_category_ids?: string[] | null
          hidden_status_ids?: string[] | null
          id?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_writing_patterns: {
        Row: {
          ai_patterns: string[] | null
          created_at: string
          human_alternatives: string[] | null
          id: string
          last_updated: string
          style_category: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          ai_patterns?: string[] | null
          created_at?: string
          human_alternatives?: string[] | null
          id?: string
          last_updated?: string
          style_category: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          ai_patterns?: string[] | null
          created_at?: string
          human_alternatives?: string[] | null
          id?: string
          last_updated?: string
          style_category?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      web_research: {
        Row: {
          citations: Json | null
          created_at: string
          id: string
          query: string
          sources: Json | null
          summary: string | null
        }
        Insert: {
          citations?: Json | null
          created_at?: string
          id?: string
          query: string
          sources?: Json | null
          summary?: string | null
        }
        Update: {
          citations?: Json | null
          created_at?: string
          id?: string
          query?: string
          sources?: Json | null
          summary?: string | null
        }
        Relationships: []
      }
      website_menu_items: {
        Row: {
          column_index: number
          columns_count: number
          created_at: string
          id: string
          label: string
          menu_id: string
          parent_id: string | null
          rank: number
          url: string
          url_type: string
        }
        Insert: {
          column_index?: number
          columns_count?: number
          created_at?: string
          id?: string
          label: string
          menu_id: string
          parent_id?: string | null
          rank?: number
          url?: string
          url_type?: string
        }
        Update: {
          column_index?: number
          columns_count?: number
          created_at?: string
          id?: string
          label?: string
          menu_id?: string
          parent_id?: string | null
          rank?: number
          url?: string
          url_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "website_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "website_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      website_menus: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          name: string
          slug: string
          website_id: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          name: string
          slug: string
          website_id?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          website_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "website_menus_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_menus_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "brand_websites"
            referencedColumns: ["id"]
          },
        ]
      }
      whiteboards: {
        Row: {
          created_at: string
          id: string
          name: string
          shapes: Json
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          shapes?: Json
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          shapes?: Json
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      wordpress_integrations: {
        Row: {
          application_password: string
          brand_id: string
          created_at: string
          id: string
          is_connected: boolean | null
          last_sync_at: string | null
          site_url: string
          updated_at: string
          username: string
        }
        Insert: {
          application_password: string
          brand_id: string
          created_at?: string
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          site_url: string
          updated_at?: string
          username: string
        }
        Update: {
          application_password?: string
          brand_id?: string
          created_at?: string
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          site_url?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "wordpress_integrations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      wordpress_metadata: {
        Row: {
          brand_id: string
          created_at: string
          description: string | null
          id: string
          metadata_type: string
          name: string
          slug: string | null
          updated_at: string
          wp_id: number
        }
        Insert: {
          brand_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata_type: string
          name: string
          slug?: string | null
          updated_at?: string
          wp_id: number
        }
        Update: {
          brand_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata_type?: string
          name?: string
          slug?: string | null
          updated_at?: string
          wp_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "wordpress_metadata_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      wordpress_posts_cache: {
        Row: {
          author_name: string | null
          brand_id: string
          categories: Json | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          last_synced_at: string
          modified_date: string | null
          published_date: string | null
          status: string
          tags: Json | null
          title: string
          updated_at: string
          wp_post_id: number
          wp_url: string | null
        }
        Insert: {
          author_name?: string | null
          brand_id: string
          categories?: Json | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          last_synced_at?: string
          modified_date?: string | null
          published_date?: string | null
          status?: string
          tags?: Json | null
          title: string
          updated_at?: string
          wp_post_id: number
          wp_url?: string | null
        }
        Update: {
          author_name?: string | null
          brand_id?: string
          categories?: Json | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          last_synced_at?: string
          modified_date?: string | null
          published_date?: string | null
          status?: string
          tags?: Json | null
          title?: string
          updated_at?: string
          wp_post_id?: number
          wp_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wordpress_posts_cache_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          brand_id: string | null
          configuration: Json | null
          created_at: string | null
          current_step: string | null
          error_message: string | null
          function_name: string
          id: string
          input_data: Json | null
          results: Json | null
          status: string
          step_statuses: Json | null
          updated_at: string | null
          user_id: string
          workflow_id: string | null
          workflow_type: string | null
        }
        Insert: {
          brand_id?: string | null
          configuration?: Json | null
          created_at?: string | null
          current_step?: string | null
          error_message?: string | null
          function_name: string
          id: string
          input_data?: Json | null
          results?: Json | null
          status: string
          step_statuses?: Json | null
          updated_at?: string | null
          user_id: string
          workflow_id?: string | null
          workflow_type?: string | null
        }
        Update: {
          brand_id?: string | null
          configuration?: Json | null
          created_at?: string | null
          current_step?: string | null
          error_message?: string | null
          function_name?: string
          id?: string
          input_data?: Json | null
          results?: Json | null
          status?: string
          step_statuses?: Json | null
          updated_at?: string | null
          user_id?: string
          workflow_id?: string | null
          workflow_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          brief: string
          config: Json | null
          created_at: string
          id: string
          provider: string[] | null
          status: string
          step_name: string
          step_order: number
          updated_at: string
          workflow_id: string
        }
        Insert: {
          brief: string
          config?: Json | null
          created_at?: string
          id?: string
          provider?: string[] | null
          status?: string
          step_name: string
          step_order?: number
          updated_at?: string
          workflow_id: string
        }
        Update: {
          brief?: string
          config?: Json | null
          created_at?: string
          id?: string
          provider?: string[] | null
          status?: string
          step_name?: string
          step_order?: number
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_billing_slots: {
        Row: {
          allocated_slots: number
          billing_month: string
          created_at: string
          id: string
          updated_at: string
          used_slots: number
          workspace_id: string
        }
        Insert: {
          allocated_slots?: number
          billing_month: string
          created_at?: string
          id?: string
          updated_at?: string
          used_slots?: number
          workspace_id: string
        }
        Update: {
          allocated_slots?: number
          billing_month?: string
          created_at?: string
          id?: string
          updated_at?: string
          used_slots?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_billing_slots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_brands: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          brand_id: string
          id: string
          workspace_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          brand_id: string
          id?: string
          workspace_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          brand_id?: string
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_workspace_brands_brand_id"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_brands_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_cache: {
        Row: {
          cache_data: Json
          cache_key: string
          created_at: string | null
          expires_at: string
          id: string
          workspace_id: string | null
        }
        Insert: {
          cache_data: Json
          cache_key: string
          created_at?: string | null
          expires_at: string
          id?: string
          workspace_id?: string | null
        }
        Update: {
          cache_data?: Json
          cache_key?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_cache_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_emails: {
        Row: {
          account_email: string
          account_id: string
          body_html: string | null
          body_text: string | null
          category: string
          cc_emails: string[] | null
          created_at: string
          from_email: string | null
          from_name: string | null
          gmail_message_id: string
          gmail_thread_id: string
          has_attachments: boolean
          id: string
          is_archived: boolean
          is_deleted: boolean
          is_read: boolean
          labels: string[]
          needs_response: boolean
          received_at: string
          snippet: string | null
          subject: string | null
          to_emails: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_email: string
          account_id: string
          body_html?: string | null
          body_text?: string | null
          category?: string
          cc_emails?: string[] | null
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          gmail_message_id: string
          gmail_thread_id: string
          has_attachments?: boolean
          id?: string
          is_archived?: boolean
          is_deleted?: boolean
          is_read?: boolean
          labels?: string[]
          needs_response?: boolean
          received_at: string
          snippet?: string | null
          subject?: string | null
          to_emails?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_email?: string
          account_id?: string
          body_html?: string | null
          body_text?: string | null
          category?: string
          cc_emails?: string[] | null
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          gmail_message_id?: string
          gmail_thread_id?: string
          has_attachments?: boolean
          id?: string
          is_archived?: boolean
          is_deleted?: boolean
          is_read?: boolean
          labels?: string[]
          needs_response?: boolean
          received_at?: string
          snippet?: string | null
          subject?: string | null
          to_emails?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_invitations: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_email: string
          role: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invited_email: string
          role: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          role?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_workspace_members_user_id_to_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          domain_workspace_id: string | null
          id: string
          is_active: boolean
          is_default: boolean | null
          name: string
          slug: string
          updated_at: string
          workspace_type: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          domain_workspace_id?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name: string
          slug: string
          updated_at?: string
          workspace_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          domain_workspace_id?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name?: string
          slug?: string
          updated_at?: string
          workspace_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_domain_workspace_id_fkey"
            columns: ["domain_workspace_id"]
            isOneToOne: false
            referencedRelation: "domain_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      writing_style_profiles: {
        Row: {
          analysis_depth: string | null
          configuration: Json | null
          created_at: string
          custom_patterns: Json | null
          id: string
          preferred_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_depth?: string | null
          configuration?: Json | null
          created_at?: string
          custom_patterns?: Json | null
          id?: string
          preferred_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_depth?: string | null
          configuration?: Json | null
          created_at?: string
          custom_patterns?: Json | null
          id?: string
          preferred_style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      writing_styles: {
        Row: {
          brand_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          style_properties: Json | null
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          style_properties?: Json | null
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          style_properties?: Json | null
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "writing_styles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      imports_with_list_preview: {
        Row: {
          batch_name: string | null
          brand_id: string | null
          created_at: string | null
          failed_count: number | null
          id: string | null
          image_count: number | null
          pending_count: number | null
          preview_images: Json | null
          status: string | null
          succeeded_count: number | null
          updated_at: string | null
          uploading_count: number | null
          webhook_url: string | null
        }
        Insert: {
          batch_name?: string | null
          brand_id?: string | null
          created_at?: string | null
          failed_count?: never
          id?: string | null
          image_count?: never
          pending_count?: never
          preview_images?: never
          status?: string | null
          succeeded_count?: never
          updated_at?: string | null
          uploading_count?: never
          webhook_url?: string | null
        }
        Update: {
          batch_name?: string | null
          brand_id?: string | null
          created_at?: string | null
          failed_count?: never
          id?: string | null
          image_count?: never
          pending_count?: never
          preview_images?: never
          status?: string | null
          succeeded_count?: never
          updated_at?: string | null
          uploading_count?: never
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_imports_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_dashboard_summary: {
        Row: {
          conversion_rate: number | null
          cost_per_booking: number | null
          cost_per_click: number | null
          data_source_name: string | null
          data_source_type: string | null
          last_import_at: string | null
          report_name: string | null
          revenue_per_booking: number | null
          roi: number | null
          total_bookings: number | null
          total_clicks: number | null
          total_cost: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      kpi_report_view: {
        Row: {
          bookings: number | null
          clicks: number | null
          cost: number | null
          data_source_id: string | null
          data_source_name: string | null
          data_source_type: string | null
          data_source_url: string | null
          date: string | null
          id: string | null
          last_import_at: string | null
          report_name: string | null
          revenue: number | null
        }
        Relationships: []
      }
      report_data_sources: {
        Row: {
          column_mappings: Json | null
          columns_count: number | null
          data_source_id: string | null
          data_source_name: string | null
          data_source_type: string | null
          data_source_url: string | null
          header_row: number | null
          is_active: boolean | null
          kpi_mappings: Json | null
          last_import_at: string | null
          report_name: string | null
          rows_count: number | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          account_id: string | null
          brand_id: string | null
          created_at: string | null
          description: string | null
          google_sheets_url: string | null
          id: string | null
          name: string | null
          status: Database["public"]["Enums"]["report_status"] | null
          updated_at: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          account_id?: string | null
          brand_id?: string | null
          created_at?: string | null
          description?: string | null
          google_sheets_url?: string | null
          id?: string | null
          name?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          account_id?: string | null
          brand_id?: string | null
          created_at?: string | null
          description?: string | null
          google_sheets_url?: string | null
          id?: string | null
          name?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_reports_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_reports_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_imports_with_preview: {
        Row: {
          batch_name: string | null
          brand_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string | null
          image_count: number | null
          notes: string | null
          preview_images: Json | null
          source_import_id: string | null
          source_project: string | null
          status: string | null
          updated_at: string | null
          webhook_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_imports_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _location_autosync_disabled: { Args: never; Returns: boolean }
      accept_workspace_invitation: {
        Args: { invitation_id: string }
        Returns: undefined
      }
      add_data_source: {
        Args: {
          p_columns_count: number
          p_configuration: Json
          p_header_row: number
          p_name: string
          p_rows_count: number
          p_type: string
          p_url: string
        }
        Returns: string
      }
      add_kpi_data: {
        Args: {
          p_bookings: number
          p_clicks: number
          p_cost: number
          p_date: string
          p_metadata?: Json
          p_report_name: string
          p_revenue: number
        }
        Returns: string
      }
      add_tokens_to_user: {
        Args: { p_reason?: string; p_tokens_to_add: number; p_user_id: string }
        Returns: Json
      }
      apply_theme_to_brand: {
        Args: { p_brand_id: string; p_theme_id: string }
        Returns: Json
      }
      assign_brand_to_workspace: {
        Args: { p_brand_id: string; p_user_id: string; p_workspace_id: string }
        Returns: undefined
      }
      auth_uid_by_email: { Args: { p_email: string }; Returns: string }
      backfill_legacy_seo_campaigns: { Args: never; Returns: undefined }
      brand_owned_custom_theme_id: {
        Args: { p_brand_id: string }
        Returns: string
      }
      calculate_kpi_metrics: {
        Args: { p_report_name: string }
        Returns: {
          change_percentage: number
          metric_name: string
          metric_value: number
        }[]
      }
      calculate_session_duration: {
        Args: { p_session_id: string }
        Returns: number
      }
      calculate_subtask_session_duration: {
        Args: { p_session_id: string }
        Returns: number
      }
      can_update_sparti_agent: {
        Args: { agent_user_id: string; agent_workspace_id: string }
        Returns: boolean
      }
      check_and_reset_monthly_tokens: {
        Args: { p_user_id?: string }
        Returns: Json
      }
      check_shared_permission: {
        Args: { permission_key: string; share_slug: string }
        Returns: boolean
      }
      check_task_access: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: boolean
      }
      check_workspace_member_access: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      clean_step_data: {
        Args: { p_step_ids: string[]; p_task_id: string }
        Returns: undefined
      }
      create_campaign_share:
        | {
            Args: { p_brand_id: string; p_campaign_id: string }
            Returns: string
          }
        | {
            Args: {
              p_brand_id: string
              p_group_date: string
              p_post_ids: string[]
            }
            Returns: string
          }
      create_chat_log_entry: {
        Args: {
          p_mentioned_user_id: string
          p_mentioning_user_id: string
          p_step_id: string
          p_task_id: string
        }
        Returns: undefined
      }
      create_checklist_item: {
        Args: {
          p_checklist_id: string
          p_completed: boolean
          p_status: string
          p_text: string
          p_user_id: string
        }
        Returns: Json
      }
      create_subtask: {
        Args: {
          p_completed: boolean
          p_description: string
          p_status: string
          p_task_id: string
          p_title: string
          p_user_id: string
        }
        Returns: Json
      }
      create_subtask_checklist: {
        Args: { p_subtask_id: string; p_title: string; p_user_id: string }
        Returns: Json
      }
      debug_checklist_validation: {
        Args: { steps_data: Json }
        Returns: {
          checklist_id: string
          checklist_index: number
          checklist_items_type: string
          checklists_type: string
          has_checklists: boolean
          item_completed: string
          item_id: string
          item_index: number
          item_text: string
          step_id: string
          step_index: number
          validation_error: string
        }[]
      }
      decline_workspace_invitation: {
        Args: { invitation_id: string }
        Returns: undefined
      }
      deduct_user_tokens:
        | {
            Args: {
              p_brand_id?: string
              p_cost_usd?: number
              p_model_name?: string
              p_request_data?: Json
              p_service_name: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_cost_usd?: number
              p_model_name?: string
              p_request_data?: Json
              p_service_name: string
              p_user_id: string
            }
            Returns: Json
          }
      delete_blog_post: { Args: { post_id: string }; Returns: undefined }
      delete_brand_with_related_content: {
        Args: { target_brand_id: string; user_id_param: string }
        Returns: undefined
      }
      delete_shopify_integration: {
        Args: { p_brand_id: string }
        Returns: undefined
      }
      delete_workspace_with_related_content: {
        Args: { target_workspace_id: string; user_id_param: string }
        Returns: undefined
      }
      enable_brand_sharing: {
        Args: { p_brand_id: string; p_user_id: string }
        Returns: string
      }
      expand_workspace_slots: {
        Args: { p_additional_slots: number; p_workspace_id: string }
        Returns: undefined
      }
      extract_domain_from_email: {
        Args: { email_address: string }
        Returns: string
      }
      force_delete_brand_with_related_content: {
        Args: { target_brand_id: string; user_id_param: string }
        Returns: undefined
      }
      generate_articles_share_slug: { Args: never; Returns: string }
      generate_brand_share_slug: {
        Args: { brand_id: string; brand_name: string }
        Returns: string
      }
      generate_campaign_share_slug:
        | { Args: never; Returns: string }
        | { Args: { p_group_date: string }; Returns: string }
      generate_links_share_slug: { Args: never; Returns: string }
      generate_preview_slug: {
        Args: { p_brand_id: string; p_post_id: string; p_title: string }
        Returns: string
      }
      generate_secure_share_token: { Args: never; Returns: string }
      generate_share_id_15char: { Args: never; Returns: string }
      generate_topics_share_slug: { Args: never; Returns: string }
      get_active_session: {
        Args: { p_step_id?: string; p_task_id: string; p_user_id: string }
        Returns: {
          action_type: string
          log_timestamp: string
          session_id: string
          step_id: string
        }[]
      }
      get_admin_user_profiles:
        | { Args: never; Returns: Json }
        | { Args: { end_date?: string; start_date?: string }; Returns: Json }
      get_all_brand_campaign_stats:
        | { Args: { p_user_id: string }; Returns: Json }
        | { Args: { p_copilot_type: string; p_user_id: string }; Returns: Json }
      get_all_members_from_admin_workspaces: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          profile: Json
          role: string
          status: string
          user_id: string
          workspace_id: string
        }[]
      }
      get_available_reports: {
        Args: never
        Returns: {
          data_source_count: number
          earliest_date: string
          latest_date: string
          report_name: string
          total_records: number
        }[]
      }
      get_blog_posts: {
        Args: { p_brand_id?: string }
        Returns: {
          author: string
          brand_id: string
          cms_published: boolean
          cms_url: string
          content: string
          created_at: string
          id: string
          keywords: string[]
          meta_description: string
          published_date: string
          scheduled_date: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }[]
      }
      get_brand_campaigns: {
        Args: {
          p_brand_id: string
          p_since?: string
          p_status?: string
          p_user_id: string
        }
        Returns: {
          article_length: string
          brand_id: string
          created_at: string
          description: string
          id: string
          keywords: string[]
          meta: Json
          name: string
          number_of_articles: number
          posts: Json
          source: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_checklist_item_logged_time: {
        Args: { p_checklist_item_id: string }
        Returns: number
      }
      get_current_billing_month: { Args: never; Returns: string }
      get_current_month_tokens_used: { Args: never; Returns: number }
      get_instance_public: {
        Args: { p_id: string; p_token: string }
        Returns: {
          created_at: string
          id: string
          name: string
          public_url: string
          status: string
          updated_at: string
        }[]
      }
      get_latest_report_snapshot: {
        Args: { p_report_id: string }
        Returns: {
          id: string
          processed_kpis: Json
          raw_data: Json
          row_count: number
          snapshot_date: string
        }[]
      }
      get_main_workspace: { Args: { p_user_id: string }; Returns: string }
      get_monthly_token_stats: {
        Args: { p_user_id?: string; p_year?: number }
        Returns: {
          month: number
          month_name: string
          plan_name: string
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          tokens_added: number
          tokens_total: number
        }[]
      }
      get_next_token_reset_date: {
        Args: { user_id_param: string }
        Returns: string
      }
      get_report_data_sources: {
        Args: { p_report_name: string }
        Returns: {
          column_mappings: Json
          columns_count: number
          data_source_id: string
          data_source_name: string
          data_source_type: string
          data_source_url: string
          header_row: number
          is_active: boolean
          kpi_mappings: Json
          last_import_at: string
          rows_count: number
        }[]
      }
      get_report_kpi_data: {
        Args: { p_report_name: string }
        Returns: {
          bookings: number
          clicks: number
          cost: number
          data_source_name: string
          data_source_type: string
          date: string
          last_import_at: string
          revenue: number
        }[]
      }
      get_shared_brand: {
        Args: { share_slug: string }
        Returns: {
          brand_description: string
          brand_id: string
          brand_logo_url: string
          brand_name: string
          expires_at: string
          permissions: Json
        }[]
      }
      get_shared_brand_data: {
        Args: { p_share_slug: string }
        Returns: {
          brand_voice: string
          colors: Json
          created_at: string
          description: string
          id: string
          industry: string
          logo_url: string
          name: string
          target_audience: string
          url: string
          website: string
        }[]
      }
      get_shared_campaign_posts: {
        Args: { p_slug: string }
        Returns: {
          author: string
          brand_id: string
          cms_published: boolean
          cms_url: string
          content: string
          created_at: string
          id: string
          keywords: string[]
          meta_description: string
          post_slug: string
          published_date: string
          scheduled_date: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }[]
      }
      get_shared_task: {
        Args: { task_share_id: string }
        Returns: {
          brand_name: string
          category: string
          created_at: string
          due_date: string
          id: string
          link: string
          owner: string
          start_date: string
          status: string
          steps: Json
          title: string
          updated_at: string
        }[]
      }
      get_shared_task_with_permissions: {
        Args: { p_share_token: string; p_step_id?: string }
        Returns: {
          brand_name: string
          can_admin: boolean
          can_comment: boolean
          can_edit: boolean
          can_view: boolean
          id: string
          share_id: string
          status: string
          steps: Json
          title: string
        }[]
      }
      get_shared_task_with_step: {
        Args: { step_id?: string; task_share_id: string }
        Returns: {
          brand_name: string
          category: string
          created_at: string
          due_date: string
          id: string
          link: string
          owner: string
          share_id: string
          shared_step_id: string
          start_date: string
          status: string
          steps: Json
          title: string
          updated_at: string
        }[]
      }
      get_shopify_integration: {
        Args: { p_brand_id: string }
        Returns: {
          api_secret_key: string
          brand_id: string
          created_at: string
          id: string
          is_connected: boolean
          last_sync_at: string | null
          store_url: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "shopify_integrations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_shopify_integration_by_id: {
        Args: { p_id: string }
        Returns: {
          api_secret_key: string
          brand_id: string
          created_at: string
          id: string
          is_connected: boolean
          last_sync_at: string | null
          store_url: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "shopify_integrations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_sparti_integration: {
        Args: { p_brand_id: string }
        Returns: {
          access_key: string
          brand_id: string
          created_at: string | null
          id: string
          is_connected: boolean | null
          last_sync_at: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "sparti_integrations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_task_comment_counts: {
        Args: { p_task_ids: string[] }
        Returns: {
          task_id: string
          total_comments: number
          unread_comments: number
        }[]
      }
      get_task_comment_counts_batch: {
        Args: { p_task_ids: string[] }
        Returns: {
          task_id: string
          total_comments: number
          unread_comments: number
        }[]
      }
      get_task_step_comment_counts: {
        Args: { p_step_ids: string[]; p_task_id: string }
        Returns: {
          step_id: string
          total_comments: number
          unread_comments: number
        }[]
      }
      get_task_step_share_url: {
        Args: { p_step_id: string; p_task_id: string }
        Returns: string
      }
      get_task_timeline_totals: {
        Args: { task_steps: Json }
        Returns: {
          total_days: number
          total_hours: number
          total_minutes: number
        }[]
      }
      get_task_total_time:
        | { Args: { p_task_id: string }; Returns: number }
        | { Args: { p_step_id?: string; p_task_id: string }; Returns: number }
      get_task_with_owners: { Args: { p_task_id: string }; Returns: Json }
      get_tasks: {
        Args: { p_owner_id?: string; p_workspace_id: string }
        Returns: {
          archived: boolean
          brand_id: string
          categories: string[]
          category: string
          created_at: string
          description: string
          due_date: string
          id: string
          link: string
          owner: string
          owners: Json
          priority: string
          start_date: string
          status: string
          steps: Json
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }[]
      }
      get_tasks_by_brand_access: {
        Args: { p_owner_id?: string; p_workspace_id: string }
        Returns: {
          archived: boolean
          brand_id: string
          brand_name: string
          categories: string[]
          category: string
          created_at: string
          description: string
          due_date: string
          id: string
          link: string
          owner: string
          owners: Json
          priority: string
          share_id: string
          start_date: string
          status: string
          steps: Json
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }[]
      }
      get_tasks_by_brand_access_optimized: {
        Args: { p_owner_id?: string; p_workspace_id: string }
        Returns: {
          archived: boolean
          brand_id: string
          brand_name: string
          categories: string[]
          category: string
          created_at: string
          description: string
          due_date: string
          friendly_url_slug: string
          id: string
          link: string
          owner: string
          owners: Json
          priority: string
          short_id: string
          start_date: string
          status: string
          steps: Json
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }[]
      }
      get_tasks_for_public_brand: {
        Args: { p_owner_id?: string; p_share_slug: string }
        Returns: {
          archived: boolean
          brand_id: string
          categories: string[]
          category: string
          created_at: string
          description: string
          due_date: string
          id: string
          link: string
          owner: string
          owners: Json
          priority: string
          start_date: string
          status: string
          steps: Json
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }[]
      }
      get_tasks_for_workspace: {
        Args: { p_workspace_id: string }
        Returns: {
          archived: boolean | null
          brand_id: string | null
          categories: string[] | null
          category: string
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          link: string | null
          manual_days: number | null
          manual_hours: number | null
          manual_minutes: number | null
          owner: string | null
          position: number | null
          priority: string
          share_id: string | null
          start_date: string | null
          status: string
          status_id: string | null
          steps: Json | null
          title: string
          updated_at: string
          use_manual_time: boolean | null
          user_id: string
          workspace_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_team_brands: {
        Args: { p_user_id: string }
        Returns: {
          ahrefs_target: string | null
          brand_voice: string | null
          copilot_type: string | null
          country: string | null
          created_at: string
          data_source: string
          dataforseo_domain: string | null
          description: string | null
          design_system: string | null
          favicon_url: string | null
          footer_logo_url: string | null
          ga4_property_id: string | null
          gsc_site_url: string | null
          id: string
          industry: string | null
          is_public_shared: boolean | null
          key_selling_points: string[] | null
          language: string | null
          languages: Json | null
          logo_dark_url: string | null
          logo_light_url: string | null
          logo_url: string | null
          medusa_base_url: string | null
          medusa_publishable_key: string | null
          name: string
          selected_theme_id: string | null
          share_slug: string | null
          shared_at: string | null
          tagline: string | null
          target_audience: string | null
          timezone: string | null
          updated_at: string
          url: string | null
          use_brand_logo: boolean | null
          user_id: string
          website: string | null
          workspace_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "brands"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_team_categories: {
        Args: { p_user_id: string }
        Returns: {
          brand_id: string | null
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "categories"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_team_members: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
        }[]
      }
      get_team_priorities: {
        Args: { p_user_id: string }
        Returns: {
          priority: string
        }[]
      }
      get_team_statuses: {
        Args: { p_user_id: string }
        Returns: {
          color: string
          created_at: string
          description: string | null
          gradient: string | null
          id: string
          is_active: boolean | null
          name: string
          order: number
          updated_at: string
          user_id: string
          workspace_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "task_statuses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_team_tasks:
        | {
            Args: { p_user_id: string }
            Returns: {
              archived: boolean | null
              brand_id: string | null
              categories: string[] | null
              category: string
              created_at: string
              description: string | null
              due_date: string | null
              estimated_hours: number | null
              id: string
              link: string | null
              manual_days: number | null
              manual_hours: number | null
              manual_minutes: number | null
              owner: string | null
              position: number | null
              priority: string
              share_id: string | null
              start_date: string | null
              status: string
              status_id: string | null
              steps: Json | null
              title: string
              updated_at: string
              use_manual_time: boolean | null
              user_id: string
              workspace_id: string | null
            }[]
            SetofOptions: {
              from: "*"
              to: "tasks"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: {
              p_brand_filter?: string
              p_due_date_filter?: string
              p_owners_filter?: string[]
              p_priorities_filter?: string[]
              p_search_filter?: string
              p_statuses_filter?: string[]
              p_user_id: string
            }
            Returns: {
              archived: boolean | null
              brand_id: string | null
              categories: string[] | null
              category: string
              created_at: string
              description: string | null
              due_date: string | null
              estimated_hours: number | null
              id: string
              link: string | null
              manual_days: number | null
              manual_hours: number | null
              manual_minutes: number | null
              owner: string | null
              position: number | null
              priority: string
              share_id: string | null
              start_date: string | null
              status: string
              status_id: string | null
              steps: Json | null
              title: string
              updated_at: string
              use_manual_time: boolean | null
              user_id: string
              workspace_id: string | null
            }[]
            SetofOptions: {
              from: "*"
              to: "tasks"
              isOneToOne: false
              isSetofReturn: true
            }
          }
      get_token_reset_message: {
        Args: { user_id_param: string }
        Returns: string
      }
      get_token_usage_and_stats: { Args: never; Returns: Json }
      get_total_cost_usd: { Args: never; Returns: number }
      get_trial_info: {
        Args: { user_id_param: string }
        Returns: {
          days_remaining: number
          is_expired: boolean
          is_on_trial: boolean
          trial_end: string
          trial_start: string
        }[]
      }
      get_user_accessible_workspaces: {
        Args: { p_user_id: string }
        Returns: {
          is_main: boolean
          role: string
          workspace_id: string
        }[]
      }
      get_user_brand_limit_info: {
        Args: { user_uuid: string }
        Returns: {
          brand_limit: number
          can_create_brand: boolean
          current_count: number
          plan_name: string
        }[]
      }
      get_user_default_workspace_id: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_user_monthly_reset_status: {
        Args: { p_user_id?: string }
        Returns: {
          current_month: string
          current_tokens: number
          last_reset_month: string
          needs_reset: boolean
          plan_name: string
          plan_token_limit: number
        }[]
      }
      get_user_profiles_with_emails: {
        Args: never
        Returns: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          plan_id: string
          plan_name: string
          subscription_status: string
          trial_end: string
        }[]
      }
      get_user_token_balance:
        | { Args: never; Returns: number }
        | { Args: { p_user_id?: string }; Returns: number }
      get_user_token_history: {
        Args: { p_limit?: number; p_user_id?: string }
        Returns: {
          created_at: string
          id: string
          month_year: string
          plan_id: string
          plan_name: string
          reason: string
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          tokens_added: number
          tokens_total: number
        }[]
      }
      get_user_token_history_summary: {
        Args: { p_months?: number; p_user_id?: string }
        Returns: {
          created_at: string
          month_year: string
          plan_name: string
          reason: string
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          tokens_added: number
          tokens_total: number
        }[]
      }
      get_user_unread_comment_counts: {
        Args: { p_user_id: string }
        Returns: {
          this_week_count: number
          today_count: number
          total_count: number
        }[]
      }
      get_wordpress_integration: {
        Args: { p_brand_id: string }
        Returns: {
          application_password: string
          brand_id: string
          created_at: string
          id: string
          is_connected: boolean | null
          last_sync_at: string | null
          site_url: string
          updated_at: string
          username: string
        }[]
        SetofOptions: {
          from: "*"
          to: "wordpress_integrations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_wordpress_integration_by_id: {
        Args: { p_id: string }
        Returns: {
          application_password: string
          brand_id: string
          created_at: string
          id: string
          is_connected: boolean | null
          last_sync_at: string | null
          site_url: string
          updated_at: string
          username: string
        }[]
        SetofOptions: {
          from: "*"
          to: "wordpress_integrations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_workspace_brands_with_details: {
        Args: { ws_id: string }
        Returns: {
          assigned_at: string
          assigned_by: string
          brand_details: Json
          brand_id: string
          id: string
          workspace_id: string
        }[]
      }
      get_workspace_member_profiles: {
        Args: { p_workspace_id: string }
        Returns: {
          id: string
          profile: Json
          role: string
          status: string
          user_id: string
          workspace_id: string
        }[]
      }
      get_workspace_members: {
        Args: { p_workspace_id: string }
        Returns: {
          created_at: string
          id: string
          invited_at: string
          invited_by: string
          joined_at: string
          profiles: Json
          role: string
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }[]
      }
      get_workspace_members_with_profiles: {
        Args: { p_workspace_id: string }
        Returns: {
          email: string
          first_name: string
          last_name: string
          user_id: string
        }[]
      }
      get_workspace_slot_info: {
        Args: { p_workspace_id: string }
        Returns: {
          allocated_slots: number
          available_slots: number
          result_billing_month: string
          used_slots: number
        }[]
      }
      get_workspaces_for_user: {
        Args: { p_user_id: string }
        Returns: {
          brand_count: number
          created_at: string
          created_by: string
          description: string
          id: string
          is_active: boolean
          member_count: number
          name: string
          role: string
          status: string
        }[]
      }
      insert_shared_keywords: {
        Args: { p_keywords: Json; p_share_id: string }
        Returns: undefined
      }
      is_brand_in_user_workspace: {
        Args: { p_brand_id: string; p_user_id: string }
        Returns: boolean
      }
      is_claims_admin: { Args: never; Returns: boolean }
      is_common_email_provider: { Args: { domain: string }; Returns: boolean }
      is_domain_workspace_admin: { Args: { user_id: string }; Returns: boolean }
      is_team_member: { Args: { p_user_id: string }; Returns: boolean }
      is_trial_expired: { Args: { user_id_param: string }; Returns: boolean }
      is_workspace_admin: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { user_id_param: string; workspace_id_param: string }
        Returns: boolean
      }
      list_blog_posts_for_brand: {
        Args: { p_brand_id: string }
        Returns: {
          author: string | null
          backlink_anchor_text: string | null
          brand_id: string | null
          campaign_creation_date: string | null
          campaign_id: string | null
          cms_published: boolean | null
          cms_url: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          featured_image_alt: string | null
          id: string
          internal_link_id: string | null
          is_backlink_article: boolean | null
          keywords: string[] | null
          last_shopify_sync_at: string | null
          last_sparti_sync_at: string | null
          last_wordpress_sync_at: string | null
          last_wp_sync_at: string | null
          location_id: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          parent_post_id: string | null
          preview_slug: string | null
          published_at: string | null
          published_date: string | null
          scheduled_date: string | null
          seo_campaign_id: string | null
          shopify_article_id: number | null
          shopify_settings: Json | null
          shopify_sync_error: string | null
          shopify_sync_status: string | null
          shopify_url: string | null
          slug: string | null
          sparti_post_id: number | null
          sparti_settings: Json | null
          sparti_sync_error: string | null
          sparti_sync_status: string | null
          sparti_url: string | null
          status: string
          title: string
          topic_id: string | null
          translations: Json
          updated_at: string
          user_id: string
          website_id: string | null
          wordpress_post_id: number | null
          wordpress_settings: Json | null
          wordpress_sync_error: string | null
          wordpress_sync_status: string | null
          workspace_id: string | null
          wp_modified_date: string | null
          wp_sync_status: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "blog_posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_seo_topic_ideas_for_brand: {
        Args: { p_brand_id: string }
        Returns: {
          backlinks_suggestions: string[] | null
          brand_id: string | null
          campaign_id: string | null
          created_at: string
          estimated_word_count: number
          id: string
          keywords: string[]
          search_intents: string[]
          search_volume: number | null
          title: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "seo_topic_ideas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      map_data_source_to_report: {
        Args: {
          p_column_mappings: Json
          p_data_source_id: string
          p_kpi_mappings: Json
          p_report_name: string
        }
        Returns: string
      }
      mark_comment_as_read: {
        Args: {
          p_comment_id: string
          p_comment_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      mark_task_messages_read: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: undefined
      }
      mark_task_step_messages_read: {
        Args: { p_step_id: string; p_task_id: string; p_user_id: string }
        Returns: undefined
      }
      peek_auth_uid_by_email: { Args: { _email: string }; Returns: string }
      record_brand_view: {
        Args: {
          p_brand_id: string
          p_referrer?: string
          p_session_id?: string
          p_viewer_ip?: string
          p_viewer_user_agent?: string
        }
        Returns: undefined
      }
      record_token_addition: {
        Args: {
          p_plan_id: string
          p_reason?: string
          p_subscription_type?: Database["public"]["Enums"]["subscription_type"]
          p_tokens_added: number
          p_user_id: string
        }
        Returns: Json
      }
      reset_all_users_monthly_tokens: { Args: never; Returns: Json }
      resolve_brand_by_host: { Args: { p_host: string }; Returns: string }
      sync_article_to_shopify: {
        Args: { p_article_id: string; p_brand_id: string; p_user_id: string }
        Returns: Json
      }
      sync_article_to_sparti: {
        Args: { p_article_id: string; p_brand_id: string; p_user_id: string }
        Returns: Json
      }
      sync_article_to_wordpress: {
        Args: { p_article_id: string; p_brand_id: string; p_user_id: string }
        Returns: Json
      }
      sync_task_step_checkbox_status: { Args: never; Returns: number }
      sync_task_step_completion_status: { Args: never; Returns: number }
      tasks_clickup_assignees: {
        Args: never
        Returns: {
          count: number
          email: string
          id: string
          username: string
        }[]
      }
      tasks_clickup_custom_fields: {
        Args: never
        Returns: {
          count: number
          id: string
          name: string
          type: string
        }[]
      }
      tasks_clickup_statuses: {
        Args: never
        Returns: {
          color: string
          count: number
          name: string
          type: string
        }[]
      }
      track_claude_usage: {
        Args: {
          p_completion_tokens: number
          p_cost_usd: number
          p_model: string
          p_prompt_tokens: number
          p_request_id: string
          p_total_tokens: number
          p_user_id: string
        }
        Returns: undefined
      }
      track_task_access: {
        Args: { p_access_type: string; p_share_token: string }
        Returns: undefined
      }
      update_article_sparti_sync_status: {
        Args: {
          p_article_id: string
          p_error_message?: string
          p_external_id?: number
          p_status: string
          p_url?: string
        }
        Returns: undefined
      }
      update_article_sync_status:
        | {
            Args: {
              p_article_id: string
              p_error_message?: string
              p_external_id?: string
              p_platform: string
              p_status: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_article_id: string
              p_error_message?: string
              p_external_id?: string
              p_platform: string
              p_status: string
              p_url?: string
            }
            Returns: undefined
          }
      update_data_source_import_timestamp: {
        Args: { p_data_source_id: string }
        Returns: undefined
      }
      update_shared_campaign_post: {
        Args: {
          p_cms_url?: string
          p_content?: string
          p_meta_description?: string
          p_post_id: string
          p_slug: string
          p_status?: string
          p_title?: string
        }
        Returns: {
          author: string | null
          backlink_anchor_text: string | null
          brand_id: string | null
          campaign_creation_date: string | null
          campaign_id: string | null
          cms_published: boolean | null
          cms_url: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          featured_image_alt: string | null
          id: string
          internal_link_id: string | null
          is_backlink_article: boolean | null
          keywords: string[] | null
          last_shopify_sync_at: string | null
          last_sparti_sync_at: string | null
          last_wordpress_sync_at: string | null
          last_wp_sync_at: string | null
          location_id: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          parent_post_id: string | null
          preview_slug: string | null
          published_at: string | null
          published_date: string | null
          scheduled_date: string | null
          seo_campaign_id: string | null
          shopify_article_id: number | null
          shopify_settings: Json | null
          shopify_sync_error: string | null
          shopify_sync_status: string | null
          shopify_url: string | null
          slug: string | null
          sparti_post_id: number | null
          sparti_settings: Json | null
          sparti_sync_error: string | null
          sparti_sync_status: string | null
          sparti_url: string | null
          status: string
          title: string
          topic_id: string | null
          translations: Json
          updated_at: string
          user_id: string
          website_id: string | null
          wordpress_post_id: number | null
          wordpress_settings: Json | null
          wordpress_sync_error: string | null
          wordpress_sync_status: string | null
          workspace_id: string | null
          wp_modified_date: string | null
          wp_sync_status: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "blog_posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_shared_task: {
        Args: { p_share_token: string; p_updates: Json }
        Returns: boolean
      }
      update_step_timeline_settings: {
        Args: {
          p_days: number
          p_hours: number
          p_minutes?: number
          p_step_id: string
          p_task_id: string
        }
        Returns: boolean
      }
      update_task_status: {
        Args: { p_status: string; p_steps?: Json; p_task_id: string }
        Returns: undefined
      }
      update_user_subscription: {
        Args: {
          p_plan_id: string
          p_stripe_customer_id?: string
          p_stripe_subscription_id?: string
          p_subscription_status?: string
          p_user_id: string
        }
        Returns: Json
      }
      upsert_shopify_integration: {
        Args: {
          p_api_secret_key: string
          p_brand_id: string
          p_store_url: string
          p_workspace_id: string
        }
        Returns: {
          api_secret_key: string
          brand_id: string
          created_at: string
          id: string
          is_connected: boolean
          last_sync_at: string | null
          store_url: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "shopify_integrations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      upsert_sparti_integration: {
        Args: { p_access_key: string; p_brand_id: string }
        Returns: {
          access_key: string
          brand_id: string
          created_at: string | null
          id: string
          is_connected: boolean | null
          last_sync_at: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "sparti_integrations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      upsert_task:
        | {
            Args: { p_params: Json }
            Returns: {
              archived: boolean | null
              brand_id: string | null
              categories: string[] | null
              category: string
              created_at: string
              description: string | null
              due_date: string | null
              estimated_hours: number | null
              id: string
              link: string | null
              manual_days: number | null
              manual_hours: number | null
              manual_minutes: number | null
              owner: string | null
              position: number | null
              priority: string
              share_id: string | null
              start_date: string | null
              status: string
              status_id: string | null
              steps: Json | null
              title: string
              updated_at: string
              use_manual_time: boolean | null
              user_id: string
              workspace_id: string | null
            }
            SetofOptions: {
              from: "*"
              to: "tasks"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_archived?: boolean
              p_brand_id: string
              p_categories: string[]
              p_category: string
              p_due_date: string
              p_link: string
              p_owner_identifiers: string[]
              p_priority: string
              p_start_date: string
              p_status: string
              p_steps: Json
              p_task_id: string
              p_title: string
              p_workspace_id: string
            }
            Returns: {
              archived: boolean | null
              brand_id: string | null
              categories: string[] | null
              category: string
              created_at: string
              description: string | null
              due_date: string | null
              estimated_hours: number | null
              id: string
              link: string | null
              manual_days: number | null
              manual_hours: number | null
              manual_minutes: number | null
              owner: string | null
              position: number | null
              priority: string
              share_id: string | null
              start_date: string | null
              status: string
              status_id: string | null
              steps: Json | null
              title: string
              updated_at: string
              use_manual_time: boolean | null
              user_id: string
              workspace_id: string | null
            }
            SetofOptions: {
              from: "*"
              to: "tasks"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      upsert_wordpress_integration: {
        Args: {
          p_application_password: string
          p_brand_id: string
          p_site_url: string
          p_username: string
          p_workspace_id: string
        }
        Returns: {
          application_password: string
          brand_id: string
          created_at: string
          id: string
          is_connected: boolean | null
          last_sync_at: string | null
          site_url: string
          updated_at: string
          username: string
        }[]
        SetofOptions: {
          from: "*"
          to: "wordpress_integrations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      user_can_read_seo: {
        Args: { p_brand_id: string; p_user_id: string }
        Returns: boolean
      }
      user_has_brand_access: { Args: { p_brand_id: string }; Returns: boolean }
      user_needs_token_reset: { Args: { p_user_id?: string }; Returns: boolean }
      user_owns_brand: {
        Args: { brand_id_param: string; user_id_param: string }
        Returns: boolean
      }
      validate_ai_agent_questions: {
        Args: { questions_data: Json }
        Returns: boolean
      }
      validate_task_steps_with_checklists: {
        Args: { steps_data: Json }
        Returns: boolean
      }
      validate_timeline_settings: {
        Args: { steps_json: Json }
        Returns: boolean
      }
    }
    Enums: {
      access_level: "view" | "edit"
      app_role: "user" | "admin"
      plan_type: "lite" | "standard" | "enterprise"
      report_status: "importing" | "active" | "error" | "archived"
      subscription_type: "monthly" | "yearly"
      task_status: "not-started" | "in-progress" | "completed" | "on-hold"
      user_role: "user" | "admin"
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
      access_level: ["view", "edit"],
      app_role: ["user", "admin"],
      plan_type: ["lite", "standard", "enterprise"],
      report_status: ["importing", "active", "error", "archived"],
      subscription_type: ["monthly", "yearly"],
      task_status: ["not-started", "in-progress", "completed", "on-hold"],
      user_role: ["user", "admin"],
    },
  },
} as const
A new version of Supabase CLI is available: v2.98.1 (currently installed v2.78.1)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
