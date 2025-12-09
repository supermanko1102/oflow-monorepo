export type TeamRow = {
  team_id: string;
  team_name: string;
  team_slug: string;
  subscription_status?: string;
  member_count?: number;
  order_count?: number;
  line_channel_id?: string | null;
  line_channel_name?: string | null;
  auto_mode?: boolean;
  business_type?: string | null;
  created_at?: string;
  role?: string;
};
