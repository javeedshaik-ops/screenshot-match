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
      ai_feedback: {
        Row: {
          created_at: string
          id: string
          next_plan: string | null
          recommendations: Json
          session_id: string
          strengths: Json
          summary: string
          topics_to_revise: Json
          user_id: string
          weaknesses: Json
        }
        Insert: {
          created_at?: string
          id?: string
          next_plan?: string | null
          recommendations?: Json
          session_id: string
          strengths?: Json
          summary: string
          topics_to_revise?: Json
          user_id: string
          weaknesses?: Json
        }
        Update: {
          created_at?: string
          id?: string
          next_plan?: string | null
          recommendations?: Json
          session_id?: string
          strengths?: Json
          summary?: string
          topics_to_revise?: Json
          user_id?: string
          weaknesses?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          code_snippet: string | null
          correct_option: string
          difficulty: string
          distractor_explanations: Json
          explanation: string
          id: string
          learning_objective: string | null
          options: Json
          position: number
          question: string
          session_id: string
          topic: string
        }
        Insert: {
          code_snippet?: string | null
          correct_option: string
          difficulty: string
          distractor_explanations?: Json
          explanation: string
          id?: string
          learning_objective?: string | null
          options: Json
          position: number
          question: string
          session_id: string
          topic: string
        }
        Update: {
          code_snippet?: string | null
          correct_option?: string
          difficulty?: string
          distractor_explanations?: Json
          explanation?: string
          id?: string
          learning_objective?: string | null
          options?: Json
          position?: number
          question?: string
          session_id?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          category: string
          completed_at: string | null
          correct_count: number | null
          created_at: string
          difficulty: string
          duration_seconds: number | null
          experience_level: string
          id: string
          incorrect_count: number | null
          question_count: number
          role: string
          score: number | null
          seconds_per_question: number | null
          started_at: string | null
          status: string
          timed: boolean
          unanswered_count: number | null
          user_id: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string
          difficulty: string
          duration_seconds?: number | null
          experience_level: string
          id?: string
          incorrect_count?: number | null
          question_count: number
          role: string
          score?: number | null
          seconds_per_question?: number | null
          started_at?: string | null
          status?: string
          timed?: boolean
          unanswered_count?: number | null
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string
          difficulty?: string
          duration_seconds?: number | null
          experience_level?: string
          id?: string
          incorrect_count?: number | null
          question_count?: number
          role?: string
          score?: number | null
          seconds_per_question?: number | null
          started_at?: string | null
          status?: string
          timed?: boolean
          unanswered_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_length: number | null
          email: string | null
          experience_level: string | null
          full_name: string
          id: string
          preferred_difficulty: string | null
          target_role: string | null
          timed_mode: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_length?: number | null
          email?: string | null
          experience_level?: string | null
          full_name?: string
          id: string
          preferred_difficulty?: string | null
          target_role?: string | null
          timed_mode?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_length?: number | null
          email?: string | null
          experience_level?: string | null
          full_name?: string
          id?: string
          preferred_difficulty?: string | null
          target_role?: string | null
          timed_mode?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      user_answers: {
        Row: {
          answered_at: string
          flagged: boolean
          id: string
          is_correct: boolean | null
          question_id: string
          selected_option: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          answered_at?: string
          flagged?: boolean
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_option?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          answered_at?: string
          flagged?: boolean
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_option?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "interview_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
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
    Enums: {},
  },
} as const
