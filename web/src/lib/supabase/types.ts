// Tipos do banco de dados — compatíveis com @supabase/supabase-js v2.97+
// Para gerar automaticamente: npx supabase gen types typescript --project-id YOUR_ID > src/lib/supabase/types.ts

export type UserRole = 'student' | 'instructor' | 'admin'
export type PlanType = 'basic' | 'pro' | 'elite'
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'pending'
export type LessonType = 'video_youtube' | 'video_drive' | 'text' | 'pdf' | 'quiz'
export type NotificationType = 'new_content' | 'mentorship' | 'achievement' | 'system' | 'financial'
export type SessionStatus = 'scheduled' | 'completed' | 'canceled'
export type GameType = 'MTT' | 'Cash' | 'Spin&Go' | 'SNG' | 'Outros'
export type GrindSessionType = 'single' | 'mixed'
export type EventType = 'live_class' | 'content_release' | 'tournament' | 'other'
export type PreferredCurrency = 'usd' | 'brl'
export type BankrollEntryType = 'initial' | 'deposit' | 'withdrawal' | 'rakeback' | 'adjustment' | 'transfer'
export type SuggestionStatus = 'pending' | 'reviewing' | 'approved' | 'implemented' | 'rejected'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          role: UserRole
          avatar_url: string | null
          phone: string | null
          bio: string | null
          preferred_currency: PreferredCurrency | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          role?: UserRole
          avatar_url?: string | null
          phone?: string | null
          bio?: string | null
          preferred_currency?: PreferredCurrency | null
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      plans: {
        Row: {
          id: string
          name: string
          type: PlanType
          description: string | null
          features: string[]
          price_cents: number | null
          cakto_product_id: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          name: string
          type: PlanType
          description?: string | null
          features?: string[]
          price_cents?: number | null
          cakto_product_id?: string | null
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['plans']['Insert']>
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: SubscriptionStatus
          cakto_subscription_id: string | null
          cakto_transaction_id: string | null
          starts_at: string | null
          ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          plan_id: string
          status?: SubscriptionStatus
          cakto_subscription_id?: string | null
          cakto_transaction_id?: string | null
          starts_at?: string | null
          ends_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
        Relationships: [
          { foreignKeyName: 'subscriptions_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'subscriptions_plan_id_fkey'; columns: ['plan_id']; referencedRelation: 'plans'; referencedColumns: ['id'] }
        ]
      }
      cakto_webhook_events: {
        Row: {
          id: string
          event_type: string
          payload: Record<string, unknown>
          processed: boolean
          error: string | null
          received_at: string
        }
        Insert: {
          event_type: string
          payload: Record<string, unknown>
          processed?: boolean
          error?: string | null
        }
        Update: Partial<Database['public']['Tables']['cakto_webhook_events']['Insert']>
        Relationships: []
      }
      courses: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          thumbnail_url: string | null
          instructor_id: string
          required_plan: PlanType
          is_published: boolean
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          slug: string
          instructor_id: string
          description?: string | null
          thumbnail_url?: string | null
          required_plan?: PlanType
          is_published?: boolean
          order_index?: number
        }
        Update: Partial<Database['public']['Tables']['courses']['Insert']>
        Relationships: [
          { foreignKeyName: 'courses_instructor_id_fkey'; columns: ['instructor_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      modules: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          order_index: number
          created_at: string
        }
        Insert: {
          course_id: string
          title: string
          description?: string | null
          order_index?: number
        }
        Update: Partial<Database['public']['Tables']['modules']['Insert']>
        Relationships: [
          { foreignKeyName: 'modules_course_id_fkey'; columns: ['course_id']; referencedRelation: 'courses'; referencedColumns: ['id'] }
        ]
      }
      lessons: {
        Row: {
          id: string
          module_id: string
          title: string
          description: string | null
          type: LessonType
          content_url: string | null
          content_text: string | null
          duration_minutes: number | null
          order_index: number
          is_free_preview: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          module_id: string
          title: string
          type?: LessonType
          description?: string | null
          content_url?: string | null
          content_text?: string | null
          duration_minutes?: number | null
          order_index?: number
          is_free_preview?: boolean
        }
        Update: Partial<Database['public']['Tables']['lessons']['Insert']>
        Relationships: [
          { foreignKeyName: 'lessons_module_id_fkey'; columns: ['module_id']; referencedRelation: 'modules'; referencedColumns: ['id'] }
        ]
      }
      lesson_progress: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          completed: boolean
          progress_percent: number
          last_watched_at: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          lesson_id: string
          completed?: boolean
          progress_percent?: number
          last_watched_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['lesson_progress']['Insert']>
        Relationships: [
          { foreignKeyName: 'lesson_progress_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'lesson_progress_lesson_id_fkey'; columns: ['lesson_id']; referencedRelation: 'lessons'; referencedColumns: ['id'] }
        ]
      }
      learning_paths: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          thumbnail_url: string | null
          required_plan: PlanType
          is_published: boolean
          created_by: string
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          slug: string
          created_by: string
          description?: string | null
          thumbnail_url?: string | null
          required_plan?: PlanType
          is_published?: boolean
          order_index?: number
        }
        Update: Partial<Database['public']['Tables']['learning_paths']['Insert']>
        Relationships: [
          { foreignKeyName: 'learning_paths_created_by_fkey'; columns: ['created_by']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      learning_path_courses: {
        Row: {
          id: string
          learning_path_id: string
          course_id: string
          order_index: number
        }
        Insert: {
          learning_path_id: string
          course_id: string
          order_index?: number
        }
        Update: Partial<Database['public']['Tables']['learning_path_courses']['Insert']>
        Relationships: [
          { foreignKeyName: 'lpc_path_id_fkey'; columns: ['learning_path_id']; referencedRelation: 'learning_paths'; referencedColumns: ['id'] },
          { foreignKeyName: 'lpc_course_id_fkey'; columns: ['course_id']; referencedRelation: 'courses'; referencedColumns: ['id'] }
        ]
      }
      learning_path_enrollments: {
        Row: {
          id: string
          user_id: string
          learning_path_id: string
          started_at: string
          completed_at: string | null
        }
        Insert: {
          user_id: string
          learning_path_id: string
          completed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['learning_path_enrollments']['Insert']>
        Relationships: [
          { foreignKeyName: 'lpe_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'lpe_path_id_fkey'; columns: ['learning_path_id']; referencedRelation: 'learning_paths'; referencedColumns: ['id'] }
        ]
      }
      mentorship_sessions: {
        Row: {
          id: string
          student_id: string
          instructor_id: string
          title: string | null
          scheduled_at: string | null
          status: SessionStatus
          notes: string | null
          homework: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          student_id: string
          instructor_id: string
          title?: string | null
          scheduled_at?: string | null
          status?: SessionStatus
          notes?: string | null
          homework?: string | null
        }
        Update: Partial<Database['public']['Tables']['mentorship_sessions']['Insert']>
        Relationships: [
          { foreignKeyName: 'ms_student_id_fkey'; columns: ['student_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'ms_instructor_id_fkey'; columns: ['instructor_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      mentorship_materials: {
        Row: {
          id: string
          session_id: string
          title: string
          file_url: string | null
          type: string | null
          created_at: string
        }
        Insert: {
          session_id: string
          title: string
          file_url?: string | null
          type?: string | null
        }
        Update: Partial<Database['public']['Tables']['mentorship_materials']['Insert']>
        Relationships: [
          { foreignKeyName: 'mm_session_id_fkey'; columns: ['session_id']; referencedRelation: 'mentorship_sessions'; referencedColumns: ['id'] }
        ]
      }
      student_goals: {
        Row: {
          id: string
          student_id: string
          instructor_id: string | null
          title: string
          description: string | null
          is_resolved: boolean
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          student_id: string
          title: string
          instructor_id?: string | null
          description?: string | null
          is_resolved?: boolean
          resolved_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['student_goals']['Insert']>
        Relationships: [
          { foreignKeyName: 'sg_student_id_fkey'; columns: ['student_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      poker_platforms: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          is_active: boolean
        }
        Insert: {
          name: string
          logo_url?: string | null
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['poker_platforms']['Insert']>
        Relationships: []
      }
      bankrolls: {
        Row: {
          id: string
          user_id: string
          platform_id: string
          current_balance_cents: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          platform_id: string
          current_balance_cents?: number
          currency?: string
        }
        Update: Partial<Database['public']['Tables']['bankrolls']['Insert']>
        Relationships: [
          { foreignKeyName: 'bankrolls_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'bankrolls_platform_id_fkey'; columns: ['platform_id']; referencedRelation: 'poker_platforms'; referencedColumns: ['id'] }
        ]
      }
      poker_sessions: {
        Row: {
          id: string
          user_id: string
          platform_id: string
          played_at: string
          buy_in_cents: number
          cash_out_cents: number
          rakeback_cents: number | null
          duration_minutes: number | null
          game_type: GameType | null
          stakes: string | null
          notes: string | null
          tournament_name: string | null
          entries: number | null
          position: number | null
          is_live: boolean | null
          grind_session_id: string | null
          itm: boolean | null
          total_players: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          platform_id: string
          buy_in_cents: number
          cash_out_cents: number
          played_at?: string
          rakeback_cents?: number | null
          duration_minutes?: number | null
          game_type?: GameType | null
          stakes?: string | null
          notes?: string | null
          tournament_name?: string | null
          entries?: number | null
          position?: number | null
          is_live?: boolean | null
          grind_session_id?: string | null
          itm?: boolean | null
          total_players?: number | null
        }
        Update: Partial<Database['public']['Tables']['poker_sessions']['Insert']>
        Relationships: [
          { foreignKeyName: 'ps_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'ps_platform_id_fkey'; columns: ['platform_id']; referencedRelation: 'poker_platforms'; referencedColumns: ['id'] },
          { foreignKeyName: 'ps_grind_session_id_fkey'; columns: ['grind_session_id']; referencedRelation: 'grind_sessions'; referencedColumns: ['id'] }
        ]
      }
      grind_sessions: {
        Row: {
          id: string
          user_id: string
          started_at: string
          ended_at: string | null
          type: GrindSessionType
          platform_id: string | null
          game_type: GameType | null
          buy_in_cents: number | null
          tournament_name: string | null
          is_active: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          type: GrindSessionType
          started_at?: string
          ended_at?: string | null
          platform_id?: string | null
          game_type?: GameType | null
          buy_in_cents?: number | null
          tournament_name?: string | null
          is_active?: boolean
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['grind_sessions']['Insert']>
        Relationships: [
          { foreignKeyName: 'gs_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'gs_platform_id_fkey'; columns: ['platform_id']; referencedRelation: 'poker_platforms'; referencedColumns: ['id'] }
        ]
      }
      player_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          name: string
          created_by: string
          description?: string | null
          color?: string | null
        }
        Update: Partial<Database['public']['Tables']['player_groups']['Insert']>
        Relationships: [
          { foreignKeyName: 'pg_created_by_fkey'; columns: ['created_by']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      player_group_members: {
        Row: {
          group_id: string
          user_id: string
          added_at: string
        }
        Insert: {
          group_id: string
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['player_group_members']['Insert']>
        Relationships: [
          { foreignKeyName: 'pgm_group_id_fkey'; columns: ['group_id']; referencedRelation: 'player_groups'; referencedColumns: ['id'] },
          { foreignKeyName: 'pgm_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          starts_at: string
          ends_at: string | null
          type: EventType
          url: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          title: string
          starts_at: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          type?: EventType
          url?: string | null
        }
        Update: Partial<Database['public']['Tables']['events']['Insert']>
        Relationships: [
          { foreignKeyName: 'events_created_by_fkey'; columns: ['created_by']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      announcements: {
        Row: {
          id: string
          title: string
          message: string | null
          expires_at: string | null
          is_active: boolean
          action_url: string | null
          action_label: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          title: string
          created_by: string
          message?: string | null
          expires_at?: string | null
          is_active?: boolean
          action_url?: string | null
          action_label?: string | null
        }
        Update: Partial<Database['public']['Tables']['announcements']['Insert']>
        Relationships: [
          { foreignKeyName: 'ann_created_by_fkey'; columns: ['created_by']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          message: string | null
          action_url: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          type: NotificationType
          title: string
          message?: string | null
          action_url?: string | null
          is_read?: boolean
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
        Relationships: [
          { foreignKeyName: 'notifications_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      trophies: {
        Row: {
          id: string
          title: string
          description: string | null
          icon: string | null
          condition_type: string | null
          condition_value: number | null
        }
        Insert: {
          title: string
          description?: string | null
          icon?: string | null
          condition_type?: string | null
          condition_value?: number | null
        }
        Update: Partial<Database['public']['Tables']['trophies']['Insert']>
        Relationships: []
      }
      user_trophies: {
        Row: {
          id: string
          user_id: string
          trophy_id: string
          earned_at: string
        }
        Insert: {
          user_id: string
          trophy_id: string
        }
        Update: Partial<Database['public']['Tables']['user_trophies']['Insert']>
        Relationships: [
          { foreignKeyName: 'ut_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'ut_trophy_id_fkey'; columns: ['trophy_id']; referencedRelation: 'trophies'; referencedColumns: ['id'] }
        ]
      }
      bankroll_entries: {
        Row: {
          id: string
          user_id: string
          platform_id: string | null
          to_platform_id: string | null
          type: BankrollEntryType
          amount_cents: number
          date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          type: BankrollEntryType
          amount_cents: number
          platform_id?: string | null
          to_platform_id?: string | null
          date?: string
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['bankroll_entries']['Insert']>
        Relationships: []
      }
      day_closes: {
        Row: {
          id: string
          user_id: string
          date: string
          opening_bankroll_cents: number
          closing_bankroll_cents: number
          session_profit_cents: number
          rakeback_cents: number
          adjustment_cents: number
          notes: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          date: string
          opening_bankroll_cents: number
          closing_bankroll_cents: number
          session_profit_cents?: number
          rakeback_cents?: number
          adjustment_cents?: number
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['day_closes']['Insert']>
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          name: string
          slug: string
          color: string
          created_by: string
          created_at: string
        }
        Insert: {
          name: string
          slug: string
          color?: string
          created_by: string
        }
        Update: Partial<Database['public']['Tables']['tags']['Insert']>
        Relationships: []
      }
      course_tags: {
        Row: { course_id: string; tag_id: string }
        Insert: { course_id: string; tag_id: string }
        Update: never
        Relationships: []
      }
      lesson_tags: {
        Row: { lesson_id: string; tag_id: string }
        Insert: { lesson_id: string; tag_id: string }
        Update: never
        Relationships: []
      }
      suggestions: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          status: SuggestionStatus
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          title: string
          body: string
          status?: SuggestionStatus
          admin_notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['suggestions']['Insert']>
        Relationships: [
          { foreignKeyName: 'suggestions_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
    }
    Views: {
      poker_session_results: {
        Row: {
          id: string
          user_id: string
          platform_id: string
          platform_name: string
          played_at: string
          buy_in_cents: number
          cash_out_cents: number
          rakeback_cents: number | null
          duration_minutes: number | null
          game_type: GameType | null
          stakes: string | null
          notes: string | null
          tournament_name: string | null
          entries: number | null
          position: number | null
          is_live: boolean | null
          grind_session_id: string | null
          itm: boolean | null
          total_players: number | null
          profit_cents: number
          roi_percent: number
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      player_financial_summary: {
        Row: {
          user_id: string
          total_sessions: number
          total_invested_cents: number
          total_returned_cents: number
          total_profit_cents: number
          total_minutes_played: number | null
          hourly_rate_cents: number
        }
        Relationships: []
      }
    }
    Functions: {
      is_instructor_or_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      plan_type: PlanType
      subscription_status: SubscriptionStatus
      lesson_type: LessonType
      notification_type: NotificationType
      session_status: SessionStatus
      game_type: GameType
      grind_session_type: GrindSessionType
      event_type: EventType
      preferred_currency: PreferredCurrency
    }
    CompositeTypes: Record<string, never>
  }
}
