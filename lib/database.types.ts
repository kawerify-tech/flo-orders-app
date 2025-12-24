export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          role: "admin" | "client" | "attendant"
          full_name: string | null
          company_name: string | null
          balance: number | null
          threshold_percentage: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: "admin" | "client" | "attendant"
          full_name?: string | null
          company_name?: string | null
          balance?: number | null
          threshold_percentage?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: "admin" | "client" | "attendant"
          full_name?: string | null
          company_name?: string | null
          balance?: number | null
          threshold_percentage?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      // Add other tables as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

