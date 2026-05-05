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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      brand_members: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          invited_by: string | null
          member_user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          member_user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          member_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_members_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_shopify_partner_apps: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          shopify_client_id: string
          shopify_client_secret: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          shopify_client_id: string
          shopify_client_secret: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          shopify_client_id?: string
          shopify_client_secret?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_shopify_partner_apps_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
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
      import_images: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          import_id: string
          shopify_media_id: string | null
          shopify_product_id: string | null
          shopify_product_name: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          import_id: string
          shopify_media_id?: string | null
          shopify_product_id?: string | null
          shopify_product_name?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          import_id?: string
          shopify_media_id?: string | null
          shopify_product_id?: string | null
          shopify_product_name?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_images_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_images_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports_with_list_preview"
            referencedColumns: ["id"]
          },
        ]
      }
      imports: {
        Row: {
          batch_name: string | null
          brand_id: string | null
          created_at: string
          id: string
          status: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          batch_name?: string | null
          brand_id?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          batch_name?: string | null
          brand_id?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imports_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
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
      shopify_credentials: {
        Row: {
          access_token: string
          brand_id: string
          id: string
          shop_domain: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          brand_id: string
          id?: string
          shop_domain: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          brand_id?: string
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
      shopify_install_tokens: {
        Row: {
          access_token: string
          partner_app_id: string | null
          shop_domain: string
          updated_at: string
        }
        Insert: {
          access_token: string
          partner_app_id?: string | null
          shop_domain: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          partner_app_id?: string | null
          shop_domain?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_install_tokens_partner_app_id_fkey"
            columns: ["partner_app_id"]
            isOneToOne: false
            referencedRelation: "brand_shopify_partner_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_oauth_pending: {
        Row: {
          access_token: string
          claim_nonce: string | null
          created_at: string
          expires_at: string
          shop_domain: string
        }
        Insert: {
          access_token: string
          claim_nonce?: string | null
          created_at?: string
          expires_at: string
          shop_domain: string
        }
        Update: {
          access_token?: string
          claim_nonce?: string | null
          created_at?: string
          expires_at?: string
          shop_domain?: string
        }
        Relationships: []
      }
      shopify_oauth_states: {
        Row: {
          brand_id: string | null
          consumed_at: string | null
          created_at: string
          expires_at: string
          partner_app_id: string | null
          pending_claim_nonce: string | null
          shop_domain: string
          state: string
          user_id: string | null
        }
        Insert: {
          brand_id?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          partner_app_id?: string | null
          pending_claim_nonce?: string | null
          shop_domain: string
          state: string
          user_id?: string | null
        }
        Update: {
          brand_id?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          partner_app_id?: string | null
          pending_claim_nonce?: string | null
          shop_domain?: string
          state?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_oauth_states_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_oauth_states_partner_app_id_fkey"
            columns: ["partner_app_id"]
            isOneToOne: false
            referencedRelation: "brand_shopify_partner_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_reference_product_cache: {
        Row: {
          brand_id: string
          product_id: string | null
          product_title: string | null
          reference_parent: string
          verified_at: string
        }
        Insert: {
          brand_id: string
          product_id?: string | null
          product_title?: string | null
          reference_parent: string
          verified_at?: string
        }
        Update: {
          brand_id?: string
          product_id?: string | null
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
            foreignKeyName: "imports_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      brand_is_owned_by: {
        Args: { p_brand_id: string; p_user_id: string }
        Returns: boolean
      }
      delete_brand_shopify_partner_app: {
        Args: { p_brand_id: string }
        Returns: Json
      }
      find_auth_user_id_by_email: { Args: { p_email: string }; Returns: string }
      get_brand_shopify_partner_app_public: {
        Args: { p_brand_id: string }
        Returns: Json
      }
      list_brand_team_members_for_owner: {
        Args: { p_brand_id: string }
        Returns: {
          account_created_at: string
          created_at: string
          id: string
          inviter_email: string
          last_sign_in_at: string
          member_email: string
          member_user_id: string
        }[]
      }
      upsert_brand_shopify_partner_app: {
        Args: {
          p_brand_id: string
          p_client_id: string
          p_client_secret: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
A new version of Supabase CLI is available: v2.98.1 (currently installed v2.78.1)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
