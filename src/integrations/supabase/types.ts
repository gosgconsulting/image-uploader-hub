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
      brands: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      brand_shopify_partner_apps: {
        Row: {
          id: string
          brand_id: string
          shopify_client_id: string
          shopify_client_secret: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          shopify_client_id: string
          shopify_client_secret: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          shopify_client_id?: string
          shopify_client_secret?: string
          created_at?: string
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
      brand_members: {
        Row: {
          id: string
          brand_id: string
          member_user_id: string
          invited_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          member_user_id: string
          invited_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          member_user_id?: string
          invited_by?: string | null
          created_at?: string
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
      import_images: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          import_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          import_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          import_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_images_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
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
      shopify_credentials: {
        Row: {
          id: string
          user_id: string
          brand_id: string
          shop_domain: string
          access_token: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          brand_id: string
          shop_domain: string
          access_token: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          brand_id?: string
          shop_domain?: string
          access_token?: string
          updated_at?: string
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
          shop_domain: string
          access_token: string
          updated_at: string
          partner_app_id: string | null
        }
        Insert: {
          shop_domain: string
          access_token: string
          updated_at?: string
          partner_app_id?: string | null
        }
        Update: {
          shop_domain?: string
          access_token?: string
          updated_at?: string
          partner_app_id?: string | null
        }
        Relationships: []
      }
      refunds: {
        Row: {
          id: string
          date: string
          source: string
          order_id: string
          customer: string
          skus: Json
          qty: number
          order_date: string
          original_amount: number
          return_fee: number
          calculated_refund: number
          reason_of_return: string
          ai_confidence: number
          status: string
          pdf_url: string | null
          shopify_numeric_order_id: string | null
          sheet_page_key: string | null
          sheet_product_names: Json | null
          shopify_fetch_status: string | null
          shopify_products: Json | null
          shopify_fetch_error: string | null
          shopify_refund_id: string | null
          shopify_refund_error: string | null
          shopify_refund_attempted_at: string | null
          shopify_credential_id: string | null
          shop_domain: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          date?: string
          source?: string
          order_id: string
          customer?: string
          skus?: Json
          qty?: number
          order_date: string
          original_amount?: number
          return_fee?: number
          calculated_refund?: number
          reason_of_return?: string
          ai_confidence?: number
          status?: string
          pdf_url?: string | null
          shopify_numeric_order_id?: string | null
          sheet_page_key?: string | null
          sheet_product_names?: Json | null
          shopify_fetch_status?: string | null
          shopify_products?: Json | null
          shopify_fetch_error?: string | null
          shopify_refund_id?: string | null
          shopify_refund_error?: string | null
          shopify_refund_attempted_at?: string | null
          shopify_credential_id?: string | null
          shop_domain?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          source?: string
          order_id?: string
          customer?: string
          skus?: Json
          qty?: number
          order_date?: string
          original_amount?: number
          return_fee?: number
          calculated_refund?: number
          reason_of_return?: string
          ai_confidence?: number
          status?: string
          pdf_url?: string | null
          shopify_numeric_order_id?: string | null
          sheet_page_key?: string | null
          sheet_product_names?: Json | null
          shopify_fetch_status?: string | null
          shopify_products?: Json | null
          shopify_fetch_error?: string | null
          shopify_refund_id?: string | null
          shopify_refund_error?: string | null
          shopify_refund_attempted_at?: string | null
          shopify_credential_id?: string | null
          shop_domain?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      upsert_brand_shopify_partner_app: {
        Args: {
          p_brand_id: string
          p_client_id: string
          p_client_secret: string
        }
        Returns: Json
      }
      get_brand_shopify_partner_app_public: {
        Args: { p_brand_id: string }
        Returns: Json
      }
      delete_brand_shopify_partner_app: {
        Args: { p_brand_id: string }
        Returns: Json
      }
      list_brand_team_members_for_owner: {
        Args: { p_brand_id: string }
        Returns: {
          id: string
          member_user_id: string
          member_email: string
          created_at: string
        }[]
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
