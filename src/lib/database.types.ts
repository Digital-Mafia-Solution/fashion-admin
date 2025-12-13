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
      inventory: {
        Row: {
          id: string
          location_id: string
          price: number
          product_id: string
          quantity: number | null
          size_name: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          location_id: string
          price: number
          product_id: string
          quantity?: number | null
          size_name?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          location_id?: string
          price?: number
          product_id?: string
          quantity?: number | null
          size_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          type: Database["public"]["Enums"]["location_type"]
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: Database["public"]["Enums"]["location_type"]
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["location_type"]
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          price_at_purchase: number
          product_id: string
          quantity: number
          size_name: string | null
        }
        Insert: {
          id?: string
          order_id: string
          price_at_purchase: number
          product_id: string
          quantity?: number
          size_name?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          price_at_purchase?: number
          product_id?: string
          quantity?: number
          size_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cashier_id: string | null
          created_at: string | null
          customer_id: string | null
          delivery_address: string | null
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          id: string
          pickup_location_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
        }
        Insert: {
          cashier_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          pickup_location_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
        }
        Update: {
          cashier_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          pickup_location_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          back_length_cm: number | null
          belt_length_cm: number | null
          belt_width_cm: number | null
          chest_cm: number | null
          created_at: string | null
          foot_length_cm: number | null
          foot_width_cm: number | null
          front_length_cm: number | null
          hip_cm: number | null
          id: string
          inseam_cm: number | null
          product_id: string
          shoulder_width_cm: number | null
          size_eu: number | null
          size_name: string
          size_us: number | null
          sleeve_length_cm: number | null
          thigh_width_cm: number | null
          waist_cm: number | null
        }
        Insert: {
          back_length_cm?: number | null
          belt_length_cm?: number | null
          belt_width_cm?: number | null
          chest_cm?: number | null
          created_at?: string | null
          foot_length_cm?: number | null
          foot_width_cm?: number | null
          front_length_cm?: number | null
          hip_cm?: number | null
          id?: string
          inseam_cm?: number | null
          product_id: string
          shoulder_width_cm?: number | null
          size_eu?: number | null
          size_name: string
          size_us?: number | null
          sleeve_length_cm?: number | null
          thigh_width_cm?: number | null
          waist_cm?: number | null
        }
        Update: {
          back_length_cm?: number | null
          belt_length_cm?: number | null
          belt_width_cm?: number | null
          chest_cm?: number | null
          created_at?: string | null
          foot_length_cm?: number | null
          foot_width_cm?: number | null
          front_length_cm?: number | null
          hip_cm?: number | null
          id?: string
          inseam_cm?: number | null
          product_id?: string
          shoulder_width_cm?: number | null
          size_eu?: number | null
          size_name?: string
          size_us?: number | null
          sleeve_length_cm?: number | null
          thigh_width_cm?: number | null
          waist_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allow_custom_measurements: boolean | null
          category: string[] | null
          clothing_type: string | null
          created_at: string | null
          description: string | null
          height_mm: number | null
          id: string
          image_url: string | null
          is_archived: boolean
          length_mm: number | null
          name: string
          sizes: string[] | null
          sku: string
          weight_grams: number | null
          width_mm: number | null
        }
        Insert: {
          allow_custom_measurements?: boolean | null
          category?: string[] | null
          clothing_type?: string | null
          created_at?: string | null
          description?: string | null
          height_mm?: number | null
          id?: string
          image_url?: string | null
          is_archived?: boolean
          length_mm?: number | null
          name: string
          sizes?: string[] | null
          sku: string
          weight_grams?: number | null
          width_mm?: number | null
        }
        Update: {
          allow_custom_measurements?: boolean | null
          category?: string[] | null
          clothing_type?: string | null
          created_at?: string | null
          description?: string | null
          height_mm?: number | null
          id?: string
          image_url?: string | null
          is_archived?: boolean
          length_mm?: number | null
          name?: string
          sizes?: string[] | null
          sku?: string
          weight_grams?: number | null
          width_mm?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assigned_location_id: string | null
          avatar_url: string | null
          billing_address: Json | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          must_change_password: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          assigned_location_id?: string | null
          avatar_url?: string | null
          billing_address?: Json | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          assigned_location_id?: string | null
          avatar_url?: string | null
          billing_address?: Json | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_assigned_location_id_fkey"
            columns: ["assigned_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_staff: { Args: never; Returns: boolean }
      process_sale: {
        Args: {
          p_location_id: string
          p_product_id: string
          p_quantity: number
        }
        Returns: undefined
      }
    }
    Enums: {
      fulfillment_type: "courier" | "pickup" | "warehouse_pickup"
      location_type: "store" | "warehouse" | "virtual_courier"
      order_status:
        | "pending"
        | "paid"
        | "packed"
        | "transit"
        | "ready"
        | "delivered"
        | "pos_complete"
        | "collected"
      user_role: "admin" | "manager" | "driver" | "customer" | "cashier"
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
      fulfillment_type: ["courier", "pickup", "warehouse_pickup"],
      location_type: ["store", "warehouse", "virtual_courier"],
      order_status: [
        "pending",
        "paid",
        "packed",
        "transit",
        "ready",
        "delivered",
        "pos_complete",
        "collected",
      ],
      user_role: ["admin", "manager", "driver", "customer", "cashier"],
    },
  },
} as const
