export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
  public: {
    Tables: {
      activities: {
        Row: {
          activity_code: string | null
          activity_label: string | null
          activity_type: string | null
          created_at: string
          end_date: string | null
          establishment_id: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          is_regulated: boolean | null
          start_date: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activity_code?: string | null
          activity_label?: string | null
          activity_type?: string | null
          created_at?: string
          end_date?: string | null
          establishment_id?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          is_regulated?: boolean | null
          start_date?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activity_code?: string | null
          activity_label?: string | null
          activity_type?: string | null
          created_at?: string
          end_date?: string | null
          establishment_id?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          is_regulated?: boolean | null
          start_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string
          actor_role: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string
          actor_role?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_role?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          tenant_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          entity_id: string | null
          entity_name: string | null
          id: string
          key: string | null
          language: string | null
          namespace: string | null
          new_value: string
          previous_value: string | null
          status_from: string | null
          status_to: string | null
          tenant_id: string
          timestamp: string
          user_email: string
          user_role: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          key?: string | null
          language?: string | null
          namespace?: string | null
          new_value: string
          previous_value?: string | null
          status_from?: string | null
          status_to?: string | null
          tenant_id?: string
          timestamp?: string
          user_email: string
          user_role: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          key?: string | null
          language?: string | null
          namespace?: string | null
          new_value?: string
          previous_value?: string | null
          status_from?: string | null
          status_to?: string | null
          tenant_id?: string
          timestamp?: string
          user_email?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cae_budget_metrics: {
        Row: {
          classification: string
          classification_weight: number
          created_at: string
          deferral_cost: number
          delay_multiplier: number
          failure_likelihood: number
          fault_code: string
          fault_name: string
          id: string
          rank_score: number
          repair_cost: number
          scheduled_use_days: number
          status: string
          tenant_id: string
          updated_at: string
          vehicle_id: string
          vehicle_name: string
          vehicle_plate: string
        }
        Insert: {
          classification: string
          classification_weight?: number
          created_at?: string
          deferral_cost?: number
          delay_multiplier?: number
          failure_likelihood?: number
          fault_code: string
          fault_name: string
          id?: string
          rank_score?: number
          repair_cost?: number
          scheduled_use_days?: number
          status?: string
          tenant_id?: string
          updated_at?: string
          vehicle_id: string
          vehicle_name: string
          vehicle_plate: string
        }
        Update: {
          classification?: string
          classification_weight?: number
          created_at?: string
          deferral_cost?: number
          delay_multiplier?: number
          failure_likelihood?: number
          fault_code?: string
          fault_name?: string
          id?: string
          rank_score?: number
          repair_cost?: number
          scheduled_use_days?: number
          status?: string
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string
          vehicle_name?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "cae_budget_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cae_budget_metrics_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_registrations: {
        Row: {
          created_at: string
          id: string
          rc_authority: string | null
          rc_date: string | null
          rc_number: string | null
          rc_status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          rc_authority?: string | null
          rc_date?: string | null
          rc_number?: string | null
          rc_status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          rc_authority?: string | null
          rc_date?: string | null
          rc_number?: string | null
          rc_status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      communes: {
        Row: {
          active: boolean | null
          code: string
          id: string
          name_ar: string | null
          name_fr: string
          wilaya_id: string
        }
        Insert: {
          active?: boolean | null
          code: string
          id?: string
          name_ar?: string | null
          name_fr: string
          wilaya_id: string
        }
        Update: {
          active?: boolean | null
          code?: string
          id?: string
          name_ar?: string | null
          name_fr?: string
          wilaya_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communes_wilaya_id_fkey"
            columns: ["wilaya_id"]
            isOneToOne: false
            referencedRelation: "wilayas"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          billing_email: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          billing_email: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          billing_email?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      company_bank_accounts: {
        Row: {
          account_holder: string | null
          account_number: string | null
          bank_code: string | null
          bank_name: string
          branch_code: string | null
          created_at: string
          currency: string | null
          id: string
          is_primary: boolean | null
          rib: string | null
          status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          bank_code?: string | null
          bank_name: string
          branch_code?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          is_primary?: boolean | null
          rib?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          bank_code?: string | null
          bank_name?: string
          branch_code?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          is_primary?: boolean | null
          rib?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_bank_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_records: {
        Row: {
          amount: number
          budget_for_category: number
          category: string
          created_at: string
          id: string
          period: string
          related_fault_code: string | null
          related_part_id: string | null
          tenant_id: string
          vehicle_id: string
          vehicle_plate: string
          work_order_id: string | null
        }
        Insert: {
          amount?: number
          budget_for_category?: number
          category: string
          created_at?: string
          id?: string
          period: string
          related_fault_code?: string | null
          related_part_id?: string | null
          tenant_id?: string
          vehicle_id: string
          vehicle_plate: string
          work_order_id?: string | null
        }
        Update: {
          amount?: number
          budget_for_category?: number
          category?: string
          created_at?: string
          id?: string
          period?: string
          related_fault_code?: string | null
          related_part_id?: string | null
          tenant_id?: string
          vehicle_id?: string
          vehicle_plate?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_records_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_seed_snapshot: {
        Row: {
          created_at: string
          id: string
          snapshot_data: Json
          table_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          snapshot_data: Json
          table_name: string
        }
        Update: {
          created_at?: string
          id?: string
          snapshot_data?: Json
          table_name?: string
        }
        Relationships: []
      }
      device_mappings: {
        Row: {
          created_at: string
          external_device_id: string
          id: string
          is_active: boolean
          provider: string
          tenant_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          external_device_id: string
          id?: string
          is_active?: boolean
          provider: string
          tenant_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          external_device_id?: string
          id?: string
          is_active?: boolean
          provider?: string
          tenant_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_mappings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_incidents: {
        Row: {
          category: string
          created_at: string
          created_date: string
          data_source: string | null
          description: string
          id: string
          matched_to_fault: boolean
          related_fault_code: string | null
          reported_by: string
          status: string
          tenant_id: string
          updated_at: string
          vehicle_id: string
          vehicle_plate: string
        }
        Insert: {
          category: string
          created_at?: string
          created_date?: string
          data_source?: string | null
          description: string
          id?: string
          matched_to_fault?: boolean
          related_fault_code?: string | null
          reported_by: string
          status?: string
          tenant_id?: string
          updated_at?: string
          vehicle_id: string
          vehicle_plate: string
        }
        Update: {
          category?: string
          created_at?: string
          created_date?: string
          data_source?: string | null
          description?: string
          id?: string
          matched_to_fault?: boolean
          related_fault_code?: string | null
          reported_by?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_incidents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          license_category: string | null
          license_expiration: string | null
          license_number: string
          medical_certificate_expiration: string | null
          operational_status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id: string
          license_category?: string | null
          license_expiration?: string | null
          license_number: string
          medical_certificate_expiration?: string | null
          operational_status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          license_category?: string | null
          license_expiration?: string | null
          license_number?: string
          medical_certificate_expiration?: string | null
          operational_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          activity_end_date: string | null
          activity_start_date: string | null
          activity_status: string | null
          address_line_1: string | null
          address_line_2: string | null
          code: string | null
          commune_id: string | null
          commune_name: string | null
          created_at: string
          district: string | null
          email: string | null
          id: string
          is_head_office: boolean | null
          is_operational: boolean | null
          name: string
          nis: string | null
          nis_sequence: string | null
          phone: string | null
          postal_code: string | null
          rc_secondary_reference: string | null
          tax_article_number: string | null
          tenant_id: string
          type: string | null
          updated_at: string
          wilaya_id: string | null
          wilaya_name: string | null
        }
        Insert: {
          activity_end_date?: string | null
          activity_start_date?: string | null
          activity_status?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          code?: string | null
          commune_id?: string | null
          commune_name?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          id?: string
          is_head_office?: boolean | null
          is_operational?: boolean | null
          name: string
          nis?: string | null
          nis_sequence?: string | null
          phone?: string | null
          postal_code?: string | null
          rc_secondary_reference?: string | null
          tax_article_number?: string | null
          tenant_id: string
          type?: string | null
          updated_at?: string
          wilaya_id?: string | null
          wilaya_name?: string | null
        }
        Update: {
          activity_end_date?: string | null
          activity_start_date?: string | null
          activity_status?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          code?: string | null
          commune_id?: string | null
          commune_name?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          id?: string
          is_head_office?: boolean | null
          is_operational?: boolean | null
          name?: string
          nis?: string | null
          nis_sequence?: string | null
          phone?: string | null
          postal_code?: string | null
          rc_secondary_reference?: string | null
          tax_article_number?: string | null
          tenant_id?: string
          type?: string | null
          updated_at?: string
          wilaya_id?: string | null
          wilaya_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_alerts: {
        Row: {
          data_source: string | null
          description: string
          id: string
          part_id: string | null
          read: boolean
          rule_id: string
          severity: string
          tenant_id: string
          timestamp: string
          title: string
          vehicle_id: string | null
        }
        Insert: {
          data_source?: string | null
          description: string
          id?: string
          part_id?: string | null
          read?: boolean
          rule_id: string
          severity: string
          tenant_id?: string
          timestamp?: string
          title: string
          vehicle_id?: string | null
        }
        Update: {
          data_source?: string | null
          description?: string
          id?: string
          part_id?: string | null
          read?: boolean
          rule_id?: string
          severity?: string
          tenant_id?: string
          timestamp?: string
          title?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_alerts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_alerts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_logs: {
        Row: {
          anomaly_flag: boolean
          cost: number
          created_at: string
          data_source: string | null
          date: string
          id: string
          liters: number
          odometer: number
          route_id: string | null
          tenant_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          anomaly_flag?: boolean
          cost: number
          created_at?: string
          data_source?: string | null
          date?: string
          id?: string
          liters: number
          odometer: number
          route_id?: string | null
          tenant_id?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          anomaly_flag?: boolean
          cost?: number
          created_at?: string
          data_source?: string | null
          date?: string
          id?: string
          liters?: number
          odometer?: number
          route_id?: string | null
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          compatible_vehicles: string[]
          created_at: string
          id: string
          lead_time_days: number
          name: string
          quantity: number
          reorder_threshold: number
          reserved_quantity: number
          sku: string
          tenant_id: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category?: string
          compatible_vehicles?: string[]
          created_at?: string
          id?: string
          lead_time_days?: number
          name: string
          quantity?: number
          reorder_threshold?: number
          reserved_quantity?: number
          sku: string
          tenant_id?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category?: string
          compatible_vehicles?: string[]
          created_at?: string
          id?: string
          lead_time_days?: number
          name?: string
          quantity?: number
          reorder_threshold?: number
          reserved_quantity?: number
          sku?: string
          tenant_id?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          company_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role: string
          tenant_id: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_representatives: {
        Row: {
          created_at: string
          end_date: string | null
          full_name: string
          id: string
          is_current: boolean | null
          person_id: string | null
          role: string | null
          start_date: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          full_name: string
          id?: string
          is_current?: boolean | null
          person_id?: string | null
          role?: string | null
          start_date?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          full_name?: string
          id?: string
          is_current?: boolean | null
          person_id?: string | null
          role?: string | null
          start_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_representatives_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempts: number
          email: string
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          email: string
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          email?: string
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admins_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_evaluation_events: {
        Row: {
          evaluated_at: string
          id: string
          pm_subscription_id: string
          tenant_id: string
          trigger_key: string
          work_order_id: string | null
        }
        Insert: {
          evaluated_at?: string
          id?: string
          pm_subscription_id: string
          tenant_id?: string
          trigger_key: string
          work_order_id?: string | null
        }
        Update: {
          evaluated_at?: string
          id?: string
          pm_subscription_id?: string
          tenant_id?: string
          trigger_key?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_evaluation_events_pm_subscription_id_fkey"
            columns: ["pm_subscription_id"]
            isOneToOne: false
            referencedRelation: "pm_vehicle_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_evaluation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_evaluation_events_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_schedule_rules: {
        Row: {
          created_at: string
          effective_from: string | null
          effective_to: string | null
          engine_code: string | null
          fuel_type: string | null
          id: string
          interval_value: number
          is_active: boolean
          make: string | null
          model: string | null
          model_year_from: number | null
          model_year_to: number | null
          pm_schedule_id: string
          priority: number
          rule_scope: string
          tenant_id: string | null
          trigger_type: string
          updated_at: string
          vehicle_id: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          engine_code?: string | null
          fuel_type?: string | null
          id?: string
          interval_value: number
          is_active?: boolean
          make?: string | null
          model?: string | null
          model_year_from?: number | null
          model_year_to?: number | null
          pm_schedule_id: string
          priority?: number
          rule_scope: string
          tenant_id?: string | null
          trigger_type: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          engine_code?: string | null
          fuel_type?: string | null
          id?: string
          interval_value?: number
          is_active?: boolean
          make?: string | null
          model?: string | null
          model_year_from?: number | null
          model_year_to?: number | null
          pm_schedule_id?: string
          priority?: number
          rule_scope?: string
          tenant_id?: string | null
          trigger_type?: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_schedule_rules_pm_schedule_id_fkey"
            columns: ["pm_schedule_id"]
            isOneToOne: false
            referencedRelation: "pm_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedule_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedule_rules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_schedules: {
        Row: {
          applicable_classifications: Json | null
          created_at: string
          estimated_labor_hours: number | null
          id: string
          interval_unit: string
          interval_value: number
          is_active: boolean
          required_parts: Json | null
          system_category: string
          tenant_id: string
          title: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          applicable_classifications?: Json | null
          created_at?: string
          estimated_labor_hours?: number | null
          id?: string
          interval_unit: string
          interval_value: number
          is_active?: boolean
          required_parts?: Json | null
          system_category: string
          tenant_id?: string
          title: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          applicable_classifications?: Json | null
          created_at?: string
          estimated_labor_hours?: number | null
          id?: string
          interval_unit?: string
          interval_value?: number
          is_active?: boolean
          required_parts?: Json | null
          system_category?: string
          tenant_id?: string
          title?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_vehicle_subscriptions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_service_date: string | null
          last_service_engine_hours: number | null
          last_service_odometer: number | null
          next_due_date: string | null
          next_due_engine_hours: number | null
          next_due_odometer: number | null
          pm_schedule_id: string
          resolution_reason: string | null
          resolution_source: string | null
          resolved_at: string | null
          resolved_interval_value: number | null
          resolved_rule_id: string | null
          resolved_trigger_type: string | null
          tenant_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_service_date?: string | null
          last_service_engine_hours?: number | null
          last_service_odometer?: number | null
          next_due_date?: string | null
          next_due_engine_hours?: number | null
          next_due_odometer?: number | null
          pm_schedule_id: string
          resolution_reason?: string | null
          resolution_source?: string | null
          resolved_at?: string | null
          resolved_interval_value?: number | null
          resolved_rule_id?: string | null
          resolved_trigger_type?: string | null
          tenant_id?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_service_date?: string | null
          last_service_engine_hours?: number | null
          last_service_odometer?: number | null
          next_due_date?: string | null
          next_due_engine_hours?: number | null
          next_due_odometer?: number | null
          pm_schedule_id?: string
          resolution_reason?: string | null
          resolution_source?: string | null
          resolved_at?: string | null
          resolved_interval_value?: number | null
          resolved_rule_id?: string | null
          resolved_trigger_type?: string | null
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_vehicle_subscriptions_pm_schedule_id_fkey"
            columns: ["pm_schedule_id"]
            isOneToOne: false
            referencedRelation: "pm_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_vehicle_subscriptions_resolved_rule_id_fkey"
            columns: ["resolved_rule_id"]
            isOneToOne: false
            referencedRelation: "pm_schedule_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_vehicle_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_vehicle_subscriptions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          role: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          role?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_documents: {
        Row: {
          activity_id: string | null
          created_at: string
          document_name: string | null
          document_number: string | null
          document_type: string
          establishment_id: string | null
          expiry_date: string | null
          file_size: number | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          mime_type: string | null
          status: string | null
          storage_path: string | null
          tenant_id: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          document_name?: string | null
          document_number?: string | null
          document_type: string
          establishment_id?: string | null
          expiry_date?: string | null
          file_size?: number | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          mime_type?: string | null
          status?: string | null
          storage_path?: string | null
          tenant_id: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          document_name?: string | null
          document_number?: string | null
          document_type?: string
          establishment_id?: string | null
          expiry_date?: string | null
          file_size?: number | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          mime_type?: string | null
          status?: string | null
          storage_path?: string | null
          tenant_id?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_documents_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_documents_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      replay_results: {
        Row: {
          batch_import_id: string
          created_at: string | null
          id: string
          period_end: string | null
          period_start: string | null
          r1_critical_events_count: number | null
          r2_schedule_conflicts_count: number | null
          r5_mean_cae_score: number | null
          r7_projected_variance_percentage: number | null
          report_payload: Json | null
          tenant_id: string
          vehicle_id: string
        }
        Insert: {
          batch_import_id: string
          created_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          r1_critical_events_count?: number | null
          r2_schedule_conflicts_count?: number | null
          r5_mean_cae_score?: number | null
          r7_projected_variance_percentage?: number | null
          report_payload?: Json | null
          tenant_id: string
          vehicle_id: string
        }
        Update: {
          batch_import_id?: string
          created_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          r1_critical_events_count?: number | null
          r2_schedule_conflicts_count?: number | null
          r5_mean_cae_score?: number | null
          r7_projected_variance_percentage?: number | null
          report_payload?: Json | null
          tenant_id?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      social_security_profiles: {
        Row: {
          affiliation_center: string | null
          affiliation_date: string | null
          created_at: string
          employer_number: string | null
          id: string
          institution: string
          registration_number: string | null
          status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          affiliation_center?: string | null
          affiliation_date?: string | null
          created_at?: string
          employer_number?: string | null
          id?: string
          institution: string
          registration_number?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          affiliation_center?: string | null
          affiliation_date?: string | null
          created_at?: string
          employer_number?: string | null
          id?: string
          institution?: string
          registration_number?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_security_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      statistical_profiles: {
        Row: {
          created_at: string
          id: string
          nis: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nis?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nis?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "statistical_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          company_id: string
          created_at: string
          current_period_end: string
          id: string
          plan: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          current_period_end: string
          id?: string
          plan?: string
          status?: string
          tenant_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          current_period_end?: string
          id?: string
          plan?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_profiles: {
        Row: {
          created_at: string
          ibs_subject: boolean | null
          id: string
          ifu_subject: boolean | null
          nif: string | null
          tax_article_number: string | null
          tax_authority_code: string | null
          tax_authority_name: string | null
          tax_authority_type: string | null
          tax_regime: string | null
          tax_registration_date: string | null
          tenant_id: string
          updated_at: string
          vat_status: string | null
          vat_subject: boolean | null
        }
        Insert: {
          created_at?: string
          ibs_subject?: boolean | null
          id?: string
          ifu_subject?: boolean | null
          nif?: string | null
          tax_article_number?: string | null
          tax_authority_code?: string | null
          tax_authority_name?: string | null
          tax_authority_type?: string | null
          tax_regime?: string | null
          tax_registration_date?: string | null
          tenant_id: string
          updated_at?: string
          vat_status?: string | null
          vat_subject?: boolean | null
        }
        Update: {
          created_at?: string
          ibs_subject?: boolean | null
          id?: string
          ifu_subject?: boolean | null
          nif?: string | null
          tax_article_number?: string | null
          tax_authority_code?: string | null
          tax_authority_name?: string | null
          tax_authority_type?: string | null
          tax_regime?: string | null
          tax_registration_date?: string | null
          tenant_id?: string
          updated_at?: string
          vat_status?: string | null
          vat_subject?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      telematics_gateways: {
        Row: {
          created_at: string
          credential_hash: string
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          provider: string
          rotated_at: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          credential_hash: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          provider: string
          rotated_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          credential_hash?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          provider?: string
          rotated_at?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telematics_gateways_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_events: {
        Row: {
          created_at: string | null
          event_id: string
          event_timestamp: string
          external_device_id: string
          id: string
          payload: Json
          provider: string
          tenant_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          event_timestamp: string
          external_device_id: string
          id?: string
          payload: Json
          provider: string
          tenant_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          event_timestamp?: string
          external_device_id?: string
          id?: string
          payload?: Json
          provider?: string
          tenant_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          acronym: string | null
          allocated_budget: number | null
          capital_social: number | null
          company_id: string | null
          country: string | null
          created_at: string
          currency: string
          date_activity_start: string | null
          date_creation: string | null
          id: string
          is_configured: boolean
          is_demo: boolean
          legal_form: string | null
          legal_name: string | null
          name: string
          onboarding_completed_at: string | null
          operating_region: string
          slug: string | null
          status: string | null
          timezone: string | null
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          acronym?: string | null
          allocated_budget?: number | null
          capital_social?: number | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          date_activity_start?: string | null
          date_creation?: string | null
          id?: string
          is_configured?: boolean
          is_demo?: boolean
          legal_form?: string | null
          legal_name?: string | null
          name: string
          onboarding_completed_at?: string | null
          operating_region?: string
          slug?: string | null
          status?: string | null
          timezone?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          acronym?: string | null
          allocated_budget?: number | null
          capital_social?: number | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          date_activity_start?: string | null
          date_creation?: string | null
          id?: string
          is_configured?: boolean
          is_demo?: boolean
          legal_form?: string | null
          legal_name?: string | null
          name?: string
          onboarding_completed_at?: string | null
          operating_region?: string
          slug?: string | null
          status?: string | null
          timezone?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      translation_cache: {
        Row: {
          key: string
          language: string
          last_updated: string
          namespace: string
          status: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          language: string
          last_updated?: string
          namespace: string
          status?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          language?: string
          last_updated?: string
          namespace?: string
          status?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_user_id: string | null
          company_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          invited_by: string | null
          phone: string | null
          role: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          auth_user_id?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          invited_by?: string | null
          phone?: string | null
          role: string
          status?: string
          tenant_id?: string | null
        }
        Update: {
          auth_user_id?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          invited_by?: string | null
          phone?: string | null
          role?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_assignments: {
        Row: {
          assigned_at: string
          assignment_type: string
          created_at: string
          driver_id: string
          id: string
          tenant_id: string
          unassigned_at: string | null
          unassignment_reason: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          assigned_at?: string
          assignment_type?: string
          created_at?: string
          driver_id: string
          id?: string
          tenant_id: string
          unassigned_at?: string | null
          unassignment_reason?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          assigned_at?: string
          assignment_type?: string
          created_at?: string
          driver_id?: string
          id?: string
          tenant_id?: string
          unassigned_at?: string | null
          unassignment_reason?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_lifecycle_history: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          new_status: string
          previous_status: string | null
          reason: string | null
          tenant_id: string
          vehicle_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          new_status: string
          previous_status?: string | null
          reason?: string | null
          tenant_id: string
          vehicle_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          new_status?: string
          previous_status?: string | null
          reason?: string | null
          tenant_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_lifecycle_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_lifecycle_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          acquisition_cost: number | null
          acquisition_date: string | null
          active_fault_codes: Json
          assigned_mechanic_id: string | null
          classification: string
          classification_weight: number
          compliance_score: number
          created_at: string
          data_source: string | null
          delay_multiplier: number
          disposal_date: string | null
          engine_code: string | null
          fault_score: number
          fuel_type: string | null
          id: string
          last_check_date: string
          lifecycle_status: string
          maintenance_history: Json
          make: string | null
          mileage: number
          model: string | null
          model_year: number | null
          name: string
          next_service_date: string
          next_service_mileage: number
          plate: string
          scheduled_route: string | null
          scheduled_use_days: number
          status: string
          status_reason: string
          tenant_id: string
          updated_at: string
          vehicle_type: string | null
          vin: string | null
        }
        Insert: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          active_fault_codes?: Json
          assigned_mechanic_id?: string | null
          classification?: string
          classification_weight?: number
          compliance_score?: number
          created_at?: string
          data_source?: string | null
          delay_multiplier?: number
          disposal_date?: string | null
          engine_code?: string | null
          fault_score?: number
          fuel_type?: string | null
          id?: string
          last_check_date?: string
          lifecycle_status?: string
          maintenance_history?: Json
          make?: string | null
          mileage?: number
          model?: string | null
          model_year?: number | null
          name: string
          next_service_date?: string
          next_service_mileage?: number
          plate: string
          scheduled_route?: string | null
          scheduled_use_days?: number
          status?: string
          status_reason?: string
          tenant_id?: string
          updated_at?: string
          vehicle_type?: string | null
          vin?: string | null
        }
        Update: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          active_fault_codes?: Json
          assigned_mechanic_id?: string | null
          classification?: string
          classification_weight?: number
          compliance_score?: number
          created_at?: string
          data_source?: string | null
          delay_multiplier?: number
          disposal_date?: string | null
          engine_code?: string | null
          fault_score?: number
          fuel_type?: string | null
          id?: string
          last_check_date?: string
          lifecycle_status?: string
          maintenance_history?: Json
          make?: string | null
          mileage?: number
          model?: string | null
          model_year?: number | null
          name?: string
          next_service_date?: string
          next_service_mileage?: number
          plate?: string
          scheduled_route?: string | null
          scheduled_use_days?: number
          status?: string
          status_reason?: string
          tenant_id?: string
          updated_at?: string
          vehicle_type?: string | null
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      warranties: {
        Row: {
          covered_systems: string[]
          created_at: string
          expiry_date: string | null
          expiry_mileage: number | null
          id: string
          manufacturer: string
          status: string
          tenant_id: string
          vehicle_id: string
        }
        Insert: {
          covered_systems?: string[]
          created_at?: string
          expiry_date?: string | null
          expiry_mileage?: number | null
          id?: string
          manufacturer: string
          status?: string
          tenant_id?: string
          vehicle_id: string
        }
        Update: {
          covered_systems?: string[]
          created_at?: string
          expiry_date?: string | null
          expiry_mileage?: number | null
          id?: string
          manufacturer?: string
          status?: string
          tenant_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      wilayas: {
        Row: {
          active: boolean | null
          code: string
          id: string
          name_ar: string | null
          name_fr: string
        }
        Insert: {
          active?: boolean | null
          code: string
          id?: string
          name_ar?: string | null
          name_fr: string
        }
        Update: {
          active?: boolean | null
          code?: string
          id?: string
          name_ar?: string | null
          name_fr?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          after_notes: string | null
          assigned_mechanic_id: string | null
          assigned_mechanic_name: string | null
          before_notes: string | null
          closed_date: string | null
          created_at: string
          created_date: string
          data_source: string | null
          hourly_rate: number
          id: string
          labor_cost: number
          labor_hours: number
          parts_used: Json
          pm_schedule_id: string | null
          pm_subscription_id: string | null
          pm_trigger_type: string | null
          pm_trigger_value: string | null
          related_fault_code: string | null
          related_incident_id: string | null
          reserved_parts: Json | null
          status: string
          tenant_id: string
          type: string
          updated_at: string
          vehicle_id: string
          vehicle_plate: string
          warranty_risk: boolean
        }
        Insert: {
          after_notes?: string | null
          assigned_mechanic_id?: string | null
          assigned_mechanic_name?: string | null
          before_notes?: string | null
          closed_date?: string | null
          created_at?: string
          created_date?: string
          data_source?: string | null
          hourly_rate?: number
          id?: string
          labor_cost?: number
          labor_hours?: number
          parts_used?: Json
          pm_schedule_id?: string | null
          pm_subscription_id?: string | null
          pm_trigger_type?: string | null
          pm_trigger_value?: string | null
          related_fault_code?: string | null
          related_incident_id?: string | null
          reserved_parts?: Json | null
          status?: string
          tenant_id?: string
          type?: string
          updated_at?: string
          vehicle_id: string
          vehicle_plate: string
          warranty_risk?: boolean
        }
        Update: {
          after_notes?: string | null
          assigned_mechanic_id?: string | null
          assigned_mechanic_name?: string | null
          before_notes?: string | null
          closed_date?: string | null
          created_at?: string
          created_date?: string
          data_source?: string | null
          hourly_rate?: number
          id?: string
          labor_cost?: number
          labor_hours?: number
          parts_used?: Json
          pm_schedule_id?: string | null
          pm_subscription_id?: string | null
          pm_trigger_type?: string | null
          pm_trigger_value?: string | null
          related_fault_code?: string | null
          related_incident_id?: string | null
          reserved_parts?: Json | null
          status?: string
          tenant_id?: string
          type?: string
          updated_at?: string
          vehicle_id?: string
          vehicle_plate?: string
          warranty_risk?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_pm_schedule_id_fkey"
            columns: ["pm_schedule_id"]
            isOneToOne: false
            referencedRelation: "pm_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_pm_subscription_id_fkey"
            columns: ["pm_subscription_id"]
            isOneToOne: false
            referencedRelation: "pm_vehicle_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_tenant_invitation: {
        Args: { p_email?: string; p_full_name: string; p_token: string }
        Returns: Json
      }
      assign_driver_to_vehicle: {
        Args: {
          p_assignment_type?: string
          p_driver_id: string
          p_vehicle_id: string
        }
        Returns: {
          assigned_at: string
          assignment_type: string
          created_at: string
          driver_id: string
          id: string
          tenant_id: string
          unassigned_at: string | null
          unassignment_reason: string | null
          updated_at: string
          vehicle_id: string
        }
        SetofOptions: {
          from: "*"
          to: "vehicle_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deactivate_driver: { Args: { p_driver_id: string }; Returns: undefined }
      get_current_tenant_id: { Args: never; Returns: string }
      get_current_user_company_id: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_current_user_tenant_id: { Args: never; Returns: string }
      provision_tenant: {
        Args: { p_company_name: string; p_email?: string }
        Returns: Json
      }
      reset_demo_tenant_data: { Args: never; Returns: undefined }
      update_vehicle_lifecycle: {
        Args: { p_new_status: string; p_reason?: string; p_vehicle_id: string }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

