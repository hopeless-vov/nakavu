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
      email_outbox: {
        Row: {
          attempts: number
          created_at: string
          dedupe_key: string | null
          id: number
          kind: string
          last_error: string | null
          locale: string
          payload: Json
          sent_at: string | null
          status: string
          to_email: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          id?: never
          kind: string
          last_error?: string | null
          locale?: string
          payload?: Json
          sent_at?: string | null
          status?: string
          to_email: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          id?: never
          kind?: string
          last_error?: string | null
          locale?: string
          payload?: Json
          sent_at?: string | null
          status?: string
          to_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      match_members: {
        Row: {
          feedback: Database["public"]["Enums"]["match_feedback"] | null
          feedback_at: string | null
          match_id: string
          user_id: string
        }
        Insert: {
          feedback?: Database["public"]["Enums"]["match_feedback"] | null
          feedback_at?: string | null
          match_id: string
          user_id: string
        }
        Update: {
          feedback?: Database["public"]["Enums"]["match_feedback"] | null
          feedback_at?: string | null
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_members_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          id: string
          round_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          round_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          round_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          include_in_matching: boolean
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          skip_next_round: boolean
          user_id: string
          workspace_id: string
        }
        Insert: {
          include_in_matching?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          skip_next_round?: boolean
          user_id: string
          workspace_id: string
        }
        Update: {
          include_in_matching?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          skip_next_round?: boolean
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ask_me_about: string
          avatar_url: string | null
          city: string
          created_at: string
          department: string
          email: string
          first_name: string
          id: string
          interests: string[]
          job_title: string
          languages: string[]
          last_name: string
          locale: string
          meeting_format: Database["public"]["Enums"]["meeting_format"]
          notify_feedback: boolean
          notify_match: boolean
          notify_product: boolean
          notify_reminder: boolean
          onboarded_at: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          ask_me_about?: string
          avatar_url?: string | null
          city?: string
          created_at?: string
          department?: string
          email: string
          first_name?: string
          id: string
          interests?: string[]
          job_title?: string
          languages?: string[]
          last_name?: string
          locale?: string
          meeting_format?: Database["public"]["Enums"]["meeting_format"]
          notify_feedback?: boolean
          notify_match?: boolean
          notify_product?: boolean
          notify_reminder?: boolean
          onboarded_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          ask_me_about?: string
          avatar_url?: string | null
          city?: string
          created_at?: string
          department?: string
          email?: string
          first_name?: string
          id?: string
          interests?: string[]
          job_title?: string
          languages?: string[]
          last_name?: string
          locale?: string
          meeting_format?: Database["public"]["Enums"]["meeting_format"]
          notify_feedback?: boolean
          notify_match?: boolean
          notify_product?: boolean
          notify_reminder?: boolean
          onboarded_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      rounds: {
        Row: {
          id: string
          participant_count: number
          ran_at: string | null
          scheduled_for: string
          status: Database["public"]["Enums"]["round_status"]
          unmatched_count: number
          workspace_id: string
        }
        Insert: {
          id?: string
          participant_count?: number
          ran_at?: string | null
          scheduled_for: string
          status?: Database["public"]["Enums"]["round_status"]
          unmatched_count?: number
          workspace_id: string
        }
        Update: {
          id?: string
          participant_count?: number
          ran_at?: string | null
          scheduled_for?: string
          status?: Database["public"]["Enums"]["round_status"]
          unmatched_count?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          allowed_domains: string[]
          anchor_day: number
          cadence: Database["public"]["Enums"]["cadence"]
          created_at: string
          created_by: string | null
          group_size: number
          id: string
          invite_token: string
          kind: Database["public"]["Enums"]["workspace_kind"]
          logo_url: string | null
          name: string
          next_round_at: string
          round_hour: number
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          allowed_domains?: string[]
          anchor_day?: number
          cadence?: Database["public"]["Enums"]["cadence"]
          created_at?: string
          created_by?: string | null
          group_size?: number
          id?: string
          invite_token?: string
          kind?: Database["public"]["Enums"]["workspace_kind"]
          logo_url?: string | null
          name: string
          next_round_at: string
          round_hour?: number
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          allowed_domains?: string[]
          anchor_day?: number
          cadence?: Database["public"]["Enums"]["cadence"]
          created_at?: string
          created_by?: string | null
          group_size?: number
          id?: string
          invite_token?: string
          kind?: Database["public"]["Enums"]["workspace_kind"]
          logo_url?: string | null
          name?: string
          next_round_at?: string
          round_hour?: number
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_workspace: {
        Args: {
          p_allowed_domains: string[]
          p_anchor_day: number
          p_cadence: Database["public"]["Enums"]["cadence"]
          p_group_size: number
          p_kind: Database["public"]["Enums"]["workspace_kind"]
          p_name: string
          p_next_round_at: string
          p_round_hour: number
          p_timezone: string
        }
        Returns: {
          allowed_domains: string[]
          anchor_day: number
          cadence: Database["public"]["Enums"]["cadence"]
          created_at: string
          created_by: string | null
          group_size: number
          id: string
          invite_token: string
          kind: Database["public"]["Enums"]["workspace_kind"]
          logo_url: string | null
          name: string
          next_round_at: string
          round_hour: number
          slug: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "workspaces"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_my_account: { Args: never; Returns: undefined }
      in_match: { Args: { m: string }; Returns: boolean }
      is_admin: { Args: { ws: string }; Returns: boolean }
      is_member: { Args: { ws: string }; Returns: boolean }
      join_workspace: {
        Args: { p_token: string }
        Returns: {
          allowed_domains: string[]
          anchor_day: number
          cadence: Database["public"]["Enums"]["cadence"]
          created_at: string
          created_by: string | null
          group_size: number
          id: string
          invite_token: string
          kind: Database["public"]["Enums"]["workspace_kind"]
          logo_url: string | null
          name: string
          next_round_at: string
          round_hour: number
          slug: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "workspaces"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      leave_workspace: { Args: { p_workspace: string }; Returns: undefined }
      my_matches: {
        Args: { p_limit?: number }
        Returns: {
          match_id: string
          my_feedback: Database["public"]["Enums"]["match_feedback"]
          partners: Json
          round_at: string
          workspace_id: string
          workspace_name: string
        }[]
      }
      regenerate_invite_token: {
        Args: { p_workspace: string }
        Returns: string
      }
      set_match_feedback: {
        Args: {
          p_feedback: Database["public"]["Enums"]["match_feedback"]
          p_match: string
        }
        Returns: undefined
      }
      shares_workspace: { Args: { other: string }; Returns: boolean }
      slugify: { Args: { value: string }; Returns: string }
      workspace_preview: {
        Args: { p_token: string }
        Returns: {
          allowed_domains: string[]
          id: string
          invited_email: string
          kind: Database["public"]["Enums"]["workspace_kind"]
          logo_url: string
          member_count: number
          name: string
          next_round_at: string
          slug: string
        }[]
      }
      workspace_stats: {
        Args: { p_workspace: string }
        Returns: {
          active: number
          members: number
          paused: number
          rounds: Json
          skipping: number
        }[]
      }
    }
    Enums: {
      cadence: "weekly" | "biweekly" | "monthly" | "bimonthly" | "quarterly"
      match_feedback: "met" | "not_yet" | "skipped"
      meeting_format: "in_person" | "online" | "both"
      member_role: "owner" | "admin" | "member"
      round_status: "pending" | "done"
      workspace_kind: "work" | "friends"
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
    Enums: {
      cadence: ["weekly", "biweekly", "monthly", "bimonthly", "quarterly"],
      match_feedback: ["met", "not_yet", "skipped"],
      meeting_format: ["in_person", "online", "both"],
      member_role: ["owner", "admin", "member"],
      round_status: ["pending", "done"],
      workspace_kind: ["work", "friends"],
    },
  },
} as const

