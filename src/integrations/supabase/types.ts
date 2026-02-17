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
      business_plans: {
        Row: {
          company_description: string | null
          created_at: string
          executive_summary: string | null
          financial_plan: string | null
          id: string
          market_analysis: string | null
          marketing_strategy: string | null
          organization: string | null
          products_services: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          company_description?: string | null
          created_at?: string
          executive_summary?: string | null
          financial_plan?: string | null
          id?: string
          market_analysis?: string | null
          marketing_strategy?: string | null
          organization?: string | null
          products_services?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          company_description?: string | null
          created_at?: string
          executive_summary?: string | null
          financial_plan?: string | null
          id?: string
          market_analysis?: string | null
          marketing_strategy?: string | null
          organization?: string | null
          products_services?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_tasks: {
        Row: {
          actual_cost: number | null
          category: string
          completed_at: string | null
          completed_by: string | null
          consultant_type: string
          cost_notes: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          estimated_cost: number | null
          id: string
          is_completed: boolean | null
          is_recurring: boolean | null
          notes: string | null
          phase: string | null
          priority: string | null
          project_id: string
          recurrence_pattern: string | null
          reminder_days: number | null
          sort_order: number | null
          subcategory: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          category: string
          completed_at?: string | null
          completed_by?: string | null
          consultant_type: string
          cost_notes?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          notes?: string | null
          phase?: string | null
          priority?: string | null
          project_id: string
          recurrence_pattern?: string | null
          reminder_days?: number | null
          sort_order?: number | null
          subcategory?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          consultant_type?: string
          cost_notes?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          notes?: string | null
          phase?: string | null
          priority?: string | null
          project_id?: string
          recurrence_pattern?: string | null
          reminder_days?: number | null
          sort_order?: number | null
          subcategory?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultant_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          type: Database["public"]["Enums"]["cost_type"]
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type: Database["public"]["Enums"]["cost_type"]
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["cost_type"]
        }
        Relationships: []
      }
      document_categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      document_shares: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          permission: string
          shared_by: string
          shared_with: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          permission?: string
          shared_by: string
          shared_with: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          permission?: string
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_notes: string | null
          created_at: string | null
          document_id: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          uploaded_by: string
          version: number
        }
        Insert: {
          change_notes?: string | null
          created_at?: string | null
          document_id: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          uploaded_by: string
          version: number
        }
        Update: {
          change_notes?: string | null
          created_at?: string | null
          document_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          is_latest: boolean
          project_id: string
          title: string
          updated_at: string | null
          uploaded_by: string
          version: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          is_latest?: boolean
          project_id: string
          title: string
          updated_at?: string | null
          uploaded_by: string
          version?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          is_latest?: boolean
          project_id?: string
          title?: string
          updated_at?: string | null
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_audit_log: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
          project_id: string
          user_id: string
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          project_id: string
          user_id: string
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          project_id?: string
          user_id?: string
        }
        Relationships: []
      }
      marketing_plans: {
        Row: {
          acquisition_strategy: string | null
          budget_allocation: string | null
          communication_channels: string | null
          competitive_positioning: string | null
          created_at: string
          id: string
          pricing_strategy: string | null
          project_id: string
          project_type: string | null
          target_market: string | null
          updated_at: string
        }
        Insert: {
          acquisition_strategy?: string | null
          budget_allocation?: string | null
          communication_channels?: string | null
          competitive_positioning?: string | null
          created_at?: string
          id?: string
          pricing_strategy?: string | null
          project_id: string
          project_type?: string | null
          target_market?: string | null
          updated_at?: string
        }
        Update: {
          acquisition_strategy?: string | null
          budget_allocation?: string | null
          communication_channels?: string | null
          competitive_positioning?: string | null
          created_at?: string
          id?: string
          pricing_strategy?: string | null
          project_id?: string
          project_type?: string | null
          target_market?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          enabled: boolean | null
          id: string
          note: string | null
          reminder_date: string | null
          reminder_days_before: number | null
          step_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          note?: string | null
          reminder_date?: string | null
          reminder_days_before?: number | null
          step_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          note?: string | null
          reminder_date?: string | null
          reminder_days_before?: number | null
          step_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prelaunch_manual_checks: {
        Row: {
          check_id: string
          checked: boolean
          checked_at: string
          checked_by: string
          id: string
          project_id: string
        }
        Insert: {
          check_id: string
          checked?: boolean
          checked_at?: string
          checked_by: string
          id?: string
          project_id: string
        }
        Update: {
          check_id?: string
          checked?: boolean
          checked_at?: string
          checked_by?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prelaunch_manual_checks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_costs: {
        Row: {
          amount: number
          calculation_basis: string | null
          calculation_params: Json | null
          category_id: string | null
          commodity_filter: string | null
          cost_type: Database["public"]["Enums"]["cost_type"]
          created_at: string | null
          created_by: string
          date: string | null
          description: string | null
          id: string
          is_passthrough: boolean | null
          is_recurring: boolean | null
          name: string
          notes: string | null
          passthrough_recipient: string | null
          project_id: string
          quantity: number | null
          recurrence_period: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          calculation_basis?: string | null
          calculation_params?: Json | null
          category_id?: string | null
          commodity_filter?: string | null
          cost_type?: Database["public"]["Enums"]["cost_type"]
          created_at?: string | null
          created_by: string
          date?: string | null
          description?: string | null
          id?: string
          is_passthrough?: boolean | null
          is_recurring?: boolean | null
          name: string
          notes?: string | null
          passthrough_recipient?: string | null
          project_id: string
          quantity?: number | null
          recurrence_period?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          calculation_basis?: string | null
          calculation_params?: Json | null
          category_id?: string | null
          commodity_filter?: string | null
          cost_type?: Database["public"]["Enums"]["cost_type"]
          created_at?: string | null
          created_by?: string
          date?: string | null
          description?: string | null
          id?: string
          is_passthrough?: boolean | null
          is_recurring?: boolean | null
          name?: string
          notes?: string | null
          passthrough_recipient?: string | null
          project_id?: string
          quantity?: number | null
          recurrence_period?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_costs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          status: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          project_id: string
          role?: Database["public"]["Enums"]["project_role"]
          status?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_revenue_simulations: {
        Row: {
          accise_gas_smc: number | null
          accise_kwh: number | null
          activation_rate: number
          addizionale_regionale_gas_smc: number | null
          avg_monthly_consumption: number
          avg_monthly_consumption_gas: number | null
          ccv_gas_monthly: number | null
          ccv_monthly: number
          client_type: string | null
          collection_month_0: number
          collection_month_1: number
          collection_month_2: number
          collection_month_3_plus: number
          commodity_type: string | null
          created_at: string
          created_by: string
          deposito_cauzionale_mesi: number | null
          deposito_percentuale_attivazione: number | null
          dispacciamento_per_kwh: number | null
          gestione_pdr_per_pdr: number | null
          gestione_pod_per_pod: number | null
          id: string
          iva_payment_regime: string | null
          iva_percent: number | null
          iva_percent_gas: number | null
          monthly_churn_rate: number | null
          monthly_contracts: Json
          oneri_arim_kwh: number | null
          oneri_asos_kwh: number | null
          oneri_gas_re_smc: number | null
          oneri_gas_ug_smc: number | null
          other_services_monthly: number
          potenza_impegnata_gas_smc_giorno: number | null
          potenza_impegnata_kw: number | null
          project_id: string
          psv_per_smc: number | null
          pun_auto_update: boolean | null
          pun_override: number | null
          pun_per_kwh: number | null
          spread_gas_per_smc: number | null
          spread_grossista_gas_per_smc: number | null
          spread_grossista_per_kwh: number | null
          spread_per_kwh: number
          start_date: string
          trasporto_gas_quota_energia_smc: number | null
          trasporto_gas_quota_fissa_anno: number | null
          trasporto_quota_energia_kwh: number | null
          trasporto_quota_fissa_anno: number | null
          trasporto_quota_potenza_kw_anno: number | null
          uncollectible_rate: number
          updated_at: string
        }
        Insert: {
          accise_gas_smc?: number | null
          accise_kwh?: number | null
          activation_rate?: number
          addizionale_regionale_gas_smc?: number | null
          avg_monthly_consumption?: number
          avg_monthly_consumption_gas?: number | null
          ccv_gas_monthly?: number | null
          ccv_monthly?: number
          client_type?: string | null
          collection_month_0?: number
          collection_month_1?: number
          collection_month_2?: number
          collection_month_3_plus?: number
          commodity_type?: string | null
          created_at?: string
          created_by: string
          deposito_cauzionale_mesi?: number | null
          deposito_percentuale_attivazione?: number | null
          dispacciamento_per_kwh?: number | null
          gestione_pdr_per_pdr?: number | null
          gestione_pod_per_pod?: number | null
          id?: string
          iva_payment_regime?: string | null
          iva_percent?: number | null
          iva_percent_gas?: number | null
          monthly_churn_rate?: number | null
          monthly_contracts?: Json
          oneri_arim_kwh?: number | null
          oneri_asos_kwh?: number | null
          oneri_gas_re_smc?: number | null
          oneri_gas_ug_smc?: number | null
          other_services_monthly?: number
          potenza_impegnata_gas_smc_giorno?: number | null
          potenza_impegnata_kw?: number | null
          project_id: string
          psv_per_smc?: number | null
          pun_auto_update?: boolean | null
          pun_override?: number | null
          pun_per_kwh?: number | null
          spread_gas_per_smc?: number | null
          spread_grossista_gas_per_smc?: number | null
          spread_grossista_per_kwh?: number | null
          spread_per_kwh?: number
          start_date?: string
          trasporto_gas_quota_energia_smc?: number | null
          trasporto_gas_quota_fissa_anno?: number | null
          trasporto_quota_energia_kwh?: number | null
          trasporto_quota_fissa_anno?: number | null
          trasporto_quota_potenza_kw_anno?: number | null
          uncollectible_rate?: number
          updated_at?: string
        }
        Update: {
          accise_gas_smc?: number | null
          accise_kwh?: number | null
          activation_rate?: number
          addizionale_regionale_gas_smc?: number | null
          avg_monthly_consumption?: number
          avg_monthly_consumption_gas?: number | null
          ccv_gas_monthly?: number | null
          ccv_monthly?: number
          client_type?: string | null
          collection_month_0?: number
          collection_month_1?: number
          collection_month_2?: number
          collection_month_3_plus?: number
          commodity_type?: string | null
          created_at?: string
          created_by?: string
          deposito_cauzionale_mesi?: number | null
          deposito_percentuale_attivazione?: number | null
          dispacciamento_per_kwh?: number | null
          gestione_pdr_per_pdr?: number | null
          gestione_pod_per_pod?: number | null
          id?: string
          iva_payment_regime?: string | null
          iva_percent?: number | null
          iva_percent_gas?: number | null
          monthly_churn_rate?: number | null
          monthly_contracts?: Json
          oneri_arim_kwh?: number | null
          oneri_asos_kwh?: number | null
          oneri_gas_re_smc?: number | null
          oneri_gas_ug_smc?: number | null
          other_services_monthly?: number
          potenza_impegnata_gas_smc_giorno?: number | null
          potenza_impegnata_kw?: number | null
          project_id?: string
          psv_per_smc?: number | null
          pun_auto_update?: boolean | null
          pun_override?: number | null
          pun_per_kwh?: number | null
          spread_gas_per_smc?: number | null
          spread_grossista_gas_per_smc?: number | null
          spread_grossista_per_kwh?: number | null
          spread_per_kwh?: number
          start_date?: string
          trasporto_gas_quota_energia_smc?: number | null
          trasporto_gas_quota_fissa_anno?: number | null
          trasporto_quota_energia_kwh?: number | null
          trasporto_quota_fissa_anno?: number | null
          trasporto_quota_potenza_kw_anno?: number | null
          uncollectible_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_revenue_simulations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_revenues: {
        Row: {
          amount: number
          calculation_basis: string | null
          calculation_params: Json | null
          commodity_filter: string | null
          created_at: string | null
          created_by: string
          date: string | null
          description: string | null
          id: string
          margin_type: string | null
          name: string
          notes: string | null
          project_id: string
          quantity: number | null
          recurrence_period: string | null
          revenue_type: string | null
          status: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          calculation_basis?: string | null
          calculation_params?: Json | null
          commodity_filter?: string | null
          created_at?: string | null
          created_by: string
          date?: string | null
          description?: string | null
          id?: string
          margin_type?: string | null
          name: string
          notes?: string | null
          project_id: string
          quantity?: number | null
          recurrence_period?: string | null
          revenue_type?: string | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          calculation_basis?: string | null
          calculation_params?: Json | null
          commodity_filter?: string | null
          created_at?: string | null
          created_by?: string
          date?: string | null
          description?: string | null
          id?: string
          margin_type?: string | null
          name?: string
          notes?: string | null
          project_id?: string
          quantity?: number | null
          recurrence_period?: string | null
          revenue_type?: string | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_revenues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sales_channels: {
        Row: {
          activation_rate: number
          channel_name: string
          channel_type: string
          commission_amount: number
          commission_type: string
          contract_share: number
          created_at: string | null
          created_by: string
          id: string
          is_active: boolean
          notes: string | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          activation_rate?: number
          channel_name: string
          channel_type?: string
          commission_amount?: number
          commission_type?: string
          contract_share?: number
          created_at?: string | null
          created_by: string
          id?: string
          is_active?: boolean
          notes?: string | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          activation_rate?: number
          channel_name?: string
          channel_type?: string
          commission_amount?: number
          commission_type?: string
          contract_share?: number
          created_at?: string | null
          created_by?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_sales_channels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_step_costs: {
        Row: {
          amount: number
          cost_item_id: string
          created_at: string | null
          created_by: string
          id: string
          notes: string | null
          project_id: string
          step_id: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          cost_item_id: string
          created_at?: string | null
          created_by: string
          id?: string
          notes?: string | null
          project_id: string
          step_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          cost_item_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          notes?: string | null
          project_id?: string
          step_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_step_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_taxes: {
        Row: {
          base_amount: number | null
          base_unit: string | null
          calculated_amount: number | null
          calculation_hypothesis: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_day: number | null
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          name: string
          notes: string | null
          project_id: string
          rate_type: string
          rate_unit: string | null
          rate_value: number
          recipient: string
          recurrence_period: string | null
          tax_type: string
          updated_at: string | null
        }
        Insert: {
          base_amount?: number | null
          base_unit?: string | null
          calculated_amount?: number | null
          calculation_hypothesis?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_day?: number | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          name: string
          notes?: string | null
          project_id: string
          rate_type?: string
          rate_unit?: string | null
          rate_value?: number
          recipient: string
          recurrence_period?: string | null
          tax_type: string
          updated_at?: string | null
        }
        Update: {
          base_amount?: number | null
          base_unit?: string | null
          calculated_amount?: number | null
          calculation_hypothesis?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_day?: number | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          name?: string
          notes?: string | null
          project_id?: string
          rate_type?: string
          rate_unit?: string | null
          rate_value?: number
          recipient?: string
          recurrence_period?: string | null
          tax_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_taxes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          arera_code: string | null
          commodity_type: string | null
          created_at: string | null
          description: string | null
          eve_license_date: string | null
          evg_license_date: string | null
          expected_volumes: number | null
          go_live_date: string | null
          id: string
          logo_url: string | null
          market_type: string | null
          name: string
          owner_id: string
          planned_start_date: string | null
          regions: string[] | null
          status: string | null
          updated_at: string | null
          wholesaler_contact: string | null
          wholesaler_name: string | null
        }
        Insert: {
          arera_code?: string | null
          commodity_type?: string | null
          created_at?: string | null
          description?: string | null
          eve_license_date?: string | null
          evg_license_date?: string | null
          expected_volumes?: number | null
          go_live_date?: string | null
          id?: string
          logo_url?: string | null
          market_type?: string | null
          name: string
          owner_id: string
          planned_start_date?: string | null
          regions?: string[] | null
          status?: string | null
          updated_at?: string | null
          wholesaler_contact?: string | null
          wholesaler_name?: string | null
        }
        Update: {
          arera_code?: string | null
          commodity_type?: string | null
          created_at?: string | null
          description?: string | null
          eve_license_date?: string | null
          evg_license_date?: string | null
          expected_volumes?: number | null
          go_live_date?: string | null
          id?: string
          logo_url?: string | null
          market_type?: string | null
          name?: string
          owner_id?: string
          planned_start_date?: string | null
          regions?: string[] | null
          status?: string | null
          updated_at?: string | null
          wholesaler_contact?: string | null
          wholesaler_name?: string | null
        }
        Relationships: []
      }
      regulatory_deadlines: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          deadline_type: string
          description: string | null
          due_date: string
          id: string
          is_recurring: boolean | null
          project_id: string
          recurrence_pattern: string | null
          reminder_days: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          deadline_type: string
          description?: string | null
          due_date: string
          id?: string
          is_recurring?: boolean | null
          project_id: string
          recurrence_pattern?: string | null
          reminder_days?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          deadline_type?: string
          description?: string | null
          due_date?: string
          id?: string
          is_recurring?: boolean | null
          project_id?: string
          recurrence_pattern?: string | null
          reminder_days?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_deadlines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      step_assignments: {
        Row: {
          assigned_by: string
          assigned_to: string
          created_at: string | null
          id: string
          project_id: string
          step_id: string
        }
        Insert: {
          assigned_by: string
          assigned_to: string
          created_at?: string | null
          id?: string
          project_id: string
          step_id: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string
          created_at?: string | null
          id?: string
          project_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      step_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          project_id: string
          step_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          project_id: string
          step_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          project_id?: string
          step_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      step_documents: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          project_id: string
          step_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          project_id: string
          step_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          project_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      step_progress: {
        Row: {
          checklist_progress: Json | null
          completed: boolean | null
          completion_date: string | null
          created_at: string | null
          id: string
          notes: string | null
          planned_end_date: string | null
          planned_start_date: string | null
          project_id: string | null
          start_date: string | null
          step_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          checklist_progress?: Json | null
          completed?: boolean | null
          completion_date?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          project_id?: string | null
          start_date?: string | null
          step_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          checklist_progress?: Json | null
          completed?: boolean | null
          completion_date?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          project_id?: string | null
          start_date?: string | null
          step_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_progress_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      team_activity_log: {
        Row: {
          action_type: string
          created_at: string
          details: string | null
          id: string
          project_id: string
          target_id: string | null
          target_name: string | null
          target_type: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: string | null
          id?: string
          project_id: string
          target_id?: string | null
          target_name?: string | null
          target_type: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: string | null
          id?: string
          project_id?: string
          target_id?: string | null
          target_name?: string | null
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          deadline_reminders: boolean
          email_notifications: boolean
          financial_alerts: boolean
          id: string
          reminder_days_before: number
          step_completion_alerts: boolean
          team_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline_reminders?: boolean
          email_notifications?: boolean
          financial_alerts?: boolean
          id?: string
          reminder_days_before?: number
          step_completion_alerts?: boolean
          team_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline_reminders?: boolean
          email_notifications?: boolean
          financial_alerts?: boolean
          id?: string
          reminder_days_before?: number
          step_completion_alerts?: boolean
          team_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notification_reads: {
        Row: {
          id: string
          notification_id: string
          project_id: string | null
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          project_id?: string | null
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          project_id?: string | null
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_reads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_project_admin: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      cost_type: "commercial" | "structural" | "direct" | "indirect"
      project_role: "owner" | "admin" | "member" | "viewer"
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
      cost_type: ["commercial", "structural", "direct", "indirect"],
      project_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const
