export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          tenant_id: string
          email: string
          role: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          email: string
          role?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          role?: string
          is_active?: boolean
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          tenant_id: string
          plan: string
          status: string
          current_period_end: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          plan: string
          status: string
          current_period_end: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          plan?: string
          status?: string
          current_period_end?: string
          created_at?: string
        }
        Relationships: any[]
      }
      audit_logs: {
        Row: {
          id: string
          tenant_id: string
          actor_id: string
          user_email: string
          user_role: string
          action: string
          entity_id: string | null
          new_value: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          tenant_id: string
          actor_id: string
          user_email: string
          user_role: string
          action: string
          entity_id?: string | null
          new_value?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          actor_id?: string
          user_email?: string
          user_role?: string
          action?: string
          entity_id?: string | null
          new_value?: string | null
          timestamp?: string
        }
      }
      positions: {
        Row: {
          id: string
          tenant_id: string
          vehicle_id: string
          latitude: number
          longitude: number
          altitude_m: number | null
          speed_kmh: number | null
          heading_deg: number | null
          timestamp: string
          data_source: string
        }
        Insert: {
          id?: string
          tenant_id: string
          vehicle_id: string
          latitude: number
          longitude: number
          altitude_m?: number | null
          speed_kmh?: number | null
          heading_deg?: number | null
          timestamp: string
          data_source: string
        }
        Update: {
          id?: string
          tenant_id?: string
          vehicle_id?: string
          latitude?: number
          longitude?: number
          altitude_m?: number | null
          speed_kmh?: number | null
          heading_deg?: number | null
          timestamp?: string
          data_source?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          tenant_id: string
          status: string
          status_reason: string | null
          active_fault_codes: Json | null
          data_source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          status?: string
          status_reason?: string | null
          active_fault_codes?: Json | null
          data_source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          status?: string
          status_reason?: string | null
          active_fault_codes?: Json | null
          data_source?: string | null
          created_at?: string
        }
      }
      device_mappings: {
        Row: {
          id: string
          tenant_id: string
          vehicle_id: string
          device_id: string | null
          provider: string
          external_device_id: string
          is_active: boolean
        }
        Insert: {
          id?: string
          tenant_id: string
          vehicle_id: string
          device_id?: string | null
          provider: string
          external_device_id: string
          is_active?: boolean
        }
        Update: {
          id?: string
          tenant_id?: string
          vehicle_id?: string
          device_id?: string | null
          provider?: string
          external_device_id?: string
          is_active?: boolean
        }
      }
      telemetry_events: {
        Row: {
          id: string
          event_id: string
          tenant_id: string
          vehicle_id: string
          provider: string
          external_device_id: string
          event_timestamp: string
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          tenant_id: string
          vehicle_id: string
          provider: string
          external_device_id: string
          event_timestamp: string
          payload: Json
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          tenant_id?: string
          vehicle_id?: string
          provider?: string
          external_device_id?: string
          event_timestamp?: string
          payload?: Json
          created_at?: string
        }
      }
      platform_admins: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
      }
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
