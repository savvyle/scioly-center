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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attempts: {
        Row: {
          answered_at: string
          chosen_index: number | null
          id: string
          is_correct: boolean
          mock_id: string | null
          mode: string
          question_id: string
          school_id: string
          time_ms: number | null
          user_id: string
        }
        Insert: {
          answered_at?: string
          chosen_index?: number | null
          id?: string
          is_correct: boolean
          mock_id?: string | null
          mode: string
          question_id: string
          school_id?: string
          time_ms?: number | null
          user_id?: string
        }
        Update: {
          answered_at?: string
          chosen_index?: number | null
          id?: string
          is_correct?: boolean
          mock_id?: string | null
          mode?: string
          question_id?: string
          school_id?: string
          time_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_mock_id_fkey"
            columns: ["mock_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      flags: {
        Row: {
          created_at: string
          id: string
          question_id: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_tests: {
        Row: {
          duration_sec: number
          event: string
          finished_at: string | null
          id: string
          question_ids: string[]
          score: number | null
          started_at: string
          total: number | null
          user_id: string
        }
        Insert: {
          duration_sec?: number
          event: string
          finished_at?: string | null
          id?: string
          question_ids: string[]
          score?: number | null
          started_at?: string
          total?: number | null
          user_id: string
        }
        Update: {
          duration_sec?: number
          event?: string
          finished_at?: string | null
          id?: string
          question_ids?: string[]
          score?: number | null
          started_at?: string
          total?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          school_id: string
          team_id: string | null
          username: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          school_id?: string
          team_id?: string | null
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          school_id?: string
          team_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          ai_confidence: number | null
          choices: Json
          converted_from_frq: boolean
          correct_index: number
          created_at: string
          difficulty: number
          event: string
          explanation: string | null
          id: string
          image_urls: string[]
          level: string | null
          review_note: string | null
          school_id: string
          status: string
          stem: string
          subtopic: string | null
          test_id: string | null
          topic: string | null
          year: number | null
        }
        Insert: {
          ai_confidence?: number | null
          choices?: Json
          converted_from_frq?: boolean
          correct_index?: number
          created_at?: string
          difficulty?: number
          event: string
          explanation?: string | null
          id?: string
          image_urls?: string[]
          level?: string | null
          review_note?: string | null
          school_id?: string
          status?: string
          stem: string
          subtopic?: string | null
          test_id?: string | null
          topic?: string | null
          year?: number | null
        }
        Update: {
          ai_confidence?: number | null
          choices?: Json
          converted_from_frq?: boolean
          correct_index?: number
          created_at?: string
          difficulty?: number
          event?: string
          explanation?: string | null
          id?: string
          image_urls?: string[]
          level?: string | null
          review_note?: string | null
          school_id?: string
          status?: string
          stem?: string
          subtopic?: string | null
          test_id?: string | null
          topic?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      review_state: {
        Row: {
          box: number
          due_at: string
          question_id: string
          user_id: string
        }
        Insert: {
          box?: number
          due_at?: string
          question_id: string
          user_id: string
        }
        Update: {
          box?: number
          due_at?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_state_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          family_sheet_url: string | null
          goal_accuracy: number
          goal_questions: number
          school_id: string
        }
        Insert: {
          family_sheet_url?: string | null
          goal_accuracy?: number
          goal_questions?: number
          school_id: string
        }
        Update: {
          family_sheet_url?: string | null
          goal_accuracy?: number
          goal_questions?: number
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          division: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          division: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          division?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          created_at: string
          created_by: string | null
          error: string | null
          event: string
          id: string
          key_path: string | null
          level: string | null
          question_count: number
          school_id: string
          source_path: string | null
          status: string
          tournament: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          event: string
          id?: string
          key_path?: string | null
          level?: string | null
          question_count?: number
          school_id?: string
          source_path?: string | null
          status?: string
          tournament?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          event?: string
          id?: string
          key_path?: string | null
          level?: string | null
          question_count?: number
          school_id?: string
          source_path?: string | null
          status?: string
          tournament?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_school_id: { Args: never; Returns: string }
      daily_trend: {
        Args: { p_days?: number; p_user?: string }
        Returns: {
          answered: number
          correct: number
          day: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      next_drill_question: {
        Args: {
          p_difficulty?: number
          p_event?: string
          p_exclude?: string[]
          p_topic?: string
        }
        Returns: string
      }
      stats_by_topic: {
        Args: { p_division?: string; p_user?: string }
        Returns: {
          answered: number
          correct: number
          event: string
          topic: string
        }[]
      }
      week_bounds: {
        Args: { p_offset?: number }
        Returns: Record<string, unknown>
      }
      weekly_leaderboard: {
        Args: { p_offset?: number }
        Returns: {
          accuracy: number
          answered: number
          correct: number
          display_name: string
          division: string
          rank: number
          user_id: string
          week_end: string
          week_start: string
        }[]
      }
    }
    Enums: {
      app_role: "student" | "captain" | "coach"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["student", "captain", "coach"],
    },
  },
} as const
