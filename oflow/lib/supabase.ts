import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// 建立 Supabase Client
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      // 使用 AsyncStorage 儲存 session
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// 型別定義
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          line_user_id: string;
          line_display_name: string | null;
          line_picture_url: string | null;
          line_email: string | null;
          preferred_language: string | null;
          current_team_id: string | null;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
        };
        Insert: {
          id?: string;
          line_user_id: string;
          line_display_name?: string | null;
          line_picture_url?: string | null;
          line_email?: string | null;
          preferred_language?: string | null;
          current_team_id?: string | null;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
        Update: {
          id?: string;
          line_user_id?: string;
          line_display_name?: string | null;
          line_picture_url?: string | null;
          line_email?: string | null;
          preferred_language?: string | null;
          current_team_id?: string | null;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          description: string | null;
          logo_url: string | null;
          line_channel_id: string | null;
          line_channel_secret: string | null;
          line_channel_access_token: string | null;
          line_channel_name: string | null;
          line_webhook_verified: boolean | null;
          line_connected_at: string | null;
          subscription_status: string | null;
          subscription_plan: string | null;
          trial_started_at: string | null;
          trial_ends_at: string | null;
          subscription_started_at: string | null;
          subscription_current_period_end: string | null;
          revenuecat_customer_id: string | null;
          subscription_product_id: string | null;
          subscription_platform: string | null;
          auto_mode: boolean | null;
          ai_enabled: boolean | null;
          notification_enabled: boolean | null;
          timezone: string | null;
          business_type: string | null;
          total_orders: number | null;
          total_revenue: number | null;
          member_count: number | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: string | null;
          can_manage_orders: boolean | null;
          can_manage_customers: boolean | null;
          can_manage_settings: boolean | null;
          can_view_analytics: boolean | null;
          can_invite_members: boolean | null;
          invited_by: string | null;
          invite_accepted_at: string | null;
          joined_at: string | null;
          created_at: string;
        };
      };
    };
  };
};
